"""
server.py - REST API and Web Server for Multi-Batch Inventory & Sales System
Clean architecture: Separates core business logic from HTTP transport.
Zero-dependency implementation using Python standard library (http.server + sqlite3).
"""

import http.server
import socketserver
import json
import urllib.parse
import os
import sys
import mimetypes
import uuid
import traceback
from datetime import datetime, timedelta
import re
import db

PORT = 8000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def extract_supplier_name(notes):
    if not notes:
        return ""
    m = re.search(r"Supplier:\s*([^.]+)", str(notes), re.IGNORECASE)
    return m.group(1).strip() if m else ""


def json_serializer(o):
    import decimal
    from datetime import date, datetime
    if isinstance(o, decimal.Decimal):
        return float(o)
    if isinstance(o, (datetime, date)):
        return o.isoformat()
    return str(o)


def json_response(handler, data, status=200):
    """Send a JSON HTTP response with CORS headers."""
    payload = json.dumps(data, default=json_serializer).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(payload)))
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
    handler.end_headers()
    handler.wfile.write(payload)

def error_response(handler, message, status=400):
    json_response(handler, {"error": message, "success": False}, status=status)

# ==============================================================================
# Pure Business Logic Layer (Clean, Modular & Unit Testable)
# ==============================================================================

def execute_procurement(conn, cur, body):
    """
    Creates a new procurement with inventory lots.
    Returns: (dict result, int status_code)
    """
    source = body.get("source", "").strip()
    date_str = body.get("procurement_date", "").strip()
    notes = body.get("notes", "").strip()
    items = body.get("items", [])

    if not source:
        return {"error": "Procurement source is required (e.g. E-Commerce, Quick Commerce, Wholesale Shop)", "success": False}, 400
    if not date_str:
        date_str = datetime.now().strftime("%Y-%m-%d")
    if not items:
        return {"error": "At least one item is required in procurement", "success": False}, 400

    invoice_no = body.get("invoice_no", "").strip()
    if not invoice_no:
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S%f")
        invoice_no = f"PROC-{timestamp[:17]}-{uuid.uuid4().hex[:4].upper()}"

    total_amount = 0.0
    for it in items:
        p_id = int(it.get("product_id", 0))
        cur.execute("SELECT id FROM products WHERE id = ?", (p_id,))
        if not cur.fetchone():
            return {"error": f"Product {p_id} not found", "success": False}, 404
        qty = float(it.get("qty", 0))
        cost = float(it.get("unit_cost", 0))
        if qty <= 0 or cost < 0:
            return {"error": "Quantity must be > 0 and unit cost >= 0", "success": False}, 400
        total_amount += qty * cost

    cur.execute(
        "INSERT INTO procurements (invoice_no, source, procurement_date, total_amount, notes) VALUES (?, ?, ?, ?, ?)",
        (invoice_no, source, date_str, total_amount, notes)
    )
    proc_id = cur.lastrowid

    # Insert lots
    for idx, it in enumerate(items, 1):
        prod_id = int(it["product_id"])
        qty = float(it["qty"])
        cost = float(it["unit_cost"])
        batch_code = it.get("batch_code", "").strip()
        if not batch_code:
            batch_code = f"LOT-{proc_id}-{idx}"

        cur.execute("""
            INSERT INTO inventory_lots
            (procurement_id, product_id, batch_code, unit_cost, initial_qty, remaining_qty, procurement_date, source, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
        """, (proc_id, prod_id, batch_code, cost, qty, qty, date_str, source))

    conn.commit()
    return {
        "success": True,
        "procurement_id": proc_id,
        "invoice_no": invoice_no,
        "total_amount": round(total_amount, 2),
        "message": "Procurement recorded successfully with new inventory lots"
    }, 201

def delete_procurement(conn, cur, proc_id):
    """
    Deletes a procurement and its associated inventory lots, provided none of the
    lots have been partially or fully sold in sales transactions.
    Returns: (dict result, int status_code)
    """
    try:
        proc_id = int(proc_id)
    except (ValueError, TypeError):
        return {"error": "Invalid procurement ID", "success": False}, 400

    cur.execute("SELECT id, invoice_no FROM procurements WHERE id = ?", (proc_id,))
    proc_row = cur.fetchone()
    if not proc_row:
        return {"error": "Procurement not found", "success": False}, 404

    invoice_no = proc_row["invoice_no"] if isinstance(proc_row, dict) or hasattr(proc_row, "__getitem__") else str(proc_id)

    # Fetch all inventory lots belonging to this procurement
    cur.execute("SELECT id, initial_qty, remaining_qty FROM inventory_lots WHERE procurement_id = ?", (proc_id,))
    lots = [dict(l) for l in cur.fetchall()]
    lot_ids = [l["id"] for l in lots]

    # Check if any inventory lot has been consumed or allocated in sales
    lots_with_sales = []
    if lot_ids:
        placeholders = ",".join(["?"] * len(lot_ids))
        cur.execute(f"SELECT DISTINCT lot_id FROM sale_item_lots WHERE lot_id IN ({placeholders})", tuple(lot_ids))
        sold_rows = cur.fetchall()
        sold_lot_ids = {r[0] if isinstance(r, tuple) else r["lot_id"] for r in sold_rows}

        for lot in lots:
            init_qty = float(lot.get("initial_qty") or 0)
            rem_qty = float(lot.get("remaining_qty") if lot.get("remaining_qty") is not None else 0)
            if lot["id"] in sold_lot_ids or rem_qty < init_qty:
                lots_with_sales.append(lot)

    if lots_with_sales:
        return {
            "error": f"Cannot delete procurement '{invoice_no}': {len(lots_with_sales)} lot(s) have already been sold or allocated to sales orders. Please delete or adjust the associated sales orders first.",
            "success": False
        }, 400

    # Cleanly remove lots and procurement
    if lot_ids:
        cur.execute("DELETE FROM inventory_lots WHERE procurement_id = ?", (proc_id,))
    cur.execute("DELETE FROM procurements WHERE id = ?", (proc_id,))
    conn.commit()

    return {
        "success": True,
        "message": f"Procurement '{invoice_no}' and its associated inventory lots were deleted successfully."
    }, 200

def delete_sale(conn, cur, sale_id):
    """
    Deletes a sales order and restores the exact quantities drawn back into
    their respective inventory lots, setting status back to 'active'.
    Returns: (dict result, int status_code)
    """
    try:
        sale_id = int(sale_id)
    except (ValueError, TypeError):
        return {"error": "Invalid sale ID", "success": False}, 400

    cur.execute("SELECT id, invoice_no FROM sales WHERE id = ?", (sale_id,))
    sale_row = cur.fetchone()
    if not sale_row:
        return {"error": "Sale not found", "success": False}, 404

    invoice_no = sale_row["invoice_no"] if isinstance(sale_row, dict) or hasattr(sale_row, "__getitem__") else str(sale_id)

    # Fetch all lot allocations made by this sale's items
    cur.execute("""
        SELECT sil.lot_id, sil.qty
        FROM sale_item_lots sil
        JOIN sale_items si ON sil.sale_item_id = si.id
        WHERE si.sale_id = ?
    """, (sale_id,))
    allocations = cur.fetchall()

    for alloc in allocations:
        lot_id = alloc["lot_id"] if isinstance(alloc, dict) else alloc[0]
        qty_to_restore = float(alloc["qty"] if isinstance(alloc, dict) else alloc[1])
        if qty_to_restore > 0:
            cur.execute("""
                UPDATE inventory_lots
                SET remaining_qty = remaining_qty + ?,
                    status = 'active'
                WHERE id = ?
            """, (qty_to_restore, lot_id))

    # Cleanly remove sale_item_lots, sale_items, and sales
    cur.execute("DELETE FROM sale_item_lots WHERE sale_item_id IN (SELECT id FROM sale_items WHERE sale_id = ?)", (sale_id,))
    cur.execute("DELETE FROM sale_items WHERE sale_id = ?", (sale_id,))
    cur.execute("DELETE FROM sales WHERE id = ?", (sale_id,))
    conn.commit()

    return {
        "success": True,
        "message": f"Sale order '{invoice_no}' and its allocations were deleted, and inventory was restored successfully."
    }, 200

def simulate_sale(cur, body):
    """
    Simulates lot allocation (Lowest-Cost-First or manual) and calculates
    projected revenue, COGS, net profit, and profit margin.
    Returns: (dict result, int status_code)
    """
    items = body.get("items", [])
    if not items:
        return {"error": "No items provided for simulation", "success": False}, 400

    simulated_items = []
    overall_sale = 0.0
    overall_cogs = 0.0

    for it in items:
        prod_id = int(it.get("product_id"))
        req_qty = float(it.get("qty", 0))
        sale_price = float(it.get("unit_sale_price", 0))
        mode = it.get("allocation_mode", "AUTO").upper()
        manual_lots = it.get("manual_lots", [])

        if req_qty <= 0:
            return {"error": f"Quantity must be positive for product {prod_id}", "success": False}, 400

        cur.execute("SELECT name, sku, unit FROM products WHERE id = ?", (prod_id,))
        prod = cur.fetchone()
        if not prod:
            return {"error": f"Product {prod_id} not found", "success": False}, 404

        allocated = []
        item_cogs = 0.0

        if mode == "MANUAL" and manual_lots:
            alloc_sum = sum(float(m.get("qty", 0)) for m in manual_lots)
            if abs(alloc_sum - req_qty) > 0.0001:
                return {"error": f"Manual allocation total ({alloc_sum}) does not match requested qty ({req_qty}) for {prod['name']}", "success": False}, 400

            for m in manual_lots:
                lot_id = int(m["lot_id"])
                lot_take = float(m["qty"])
                if lot_take <= 0:
                    continue
                cur.execute("SELECT id, batch_code, unit_cost, remaining_qty, source, procurement_date FROM inventory_lots WHERE id = ? AND product_id = ?", (lot_id, prod_id))
                lot = cur.fetchone()
                if not lot:
                    return {"error": f"Lot {lot_id} does not exist or does not belong to product {prod['name']}", "success": False}, 400
                lot_rem = float(lot["remaining_qty"])
                lot_cost = float(lot["unit_cost"])
                if lot_rem < lot_take:
                    return {"error": f"Lot {lot['batch_code']} has only {lot_rem} available (requested {lot_take})", "success": False}, 400

                allocated.append({
                    "lot_id": lot["id"],
                    "batch_code": lot["batch_code"],
                    "source": lot["source"],
                    "procurement_date": str(lot["procurement_date"]) if lot["procurement_date"] else "",
                    "qty": lot_take,
                    "unit_cost": lot_cost,
                    "line_cost": round(lot_take * lot_cost, 2)
                })
                item_cogs += lot_take * lot_cost
        else:
            # AUTO: Lowest Cost First
            cur.execute("""
                SELECT id, batch_code, unit_cost, remaining_qty, source, procurement_date
                FROM inventory_lots
                WHERE product_id = ? AND remaining_qty > 0
                ORDER BY unit_cost ASC, procurement_date ASC
            """, (prod_id,))
            available_lots = cur.fetchall()

            rem = req_qty
            for lot in available_lots:
                if rem <= 0:
                    break
                lot_rem = float(lot["remaining_qty"])
                lot_cost = float(lot["unit_cost"])
                take = min(rem, lot_rem)
                allocated.append({
                    "lot_id": lot["id"],
                    "batch_code": lot["batch_code"],
                    "source": lot["source"],
                    "procurement_date": str(lot["procurement_date"]) if lot["procurement_date"] else "",
                    "qty": take,
                    "unit_cost": lot_cost,
                    "line_cost": round(take * lot_cost, 2)
                })
                item_cogs += take * lot_cost
                rem -= take

            if rem > 0.0001:
                return {"error": f"Insufficient stock for {prod['name']}. Needed {req_qty}, short by {round(rem, 2)}", "success": False}, 400

        line_sale = req_qty * sale_price
        line_profit = line_sale - item_cogs
        line_margin = (line_profit / line_sale * 100) if line_sale > 0 else 0.0

        overall_sale += line_sale
        overall_cogs += item_cogs

        simulated_items.append({
            "product_id": prod_id,
            "product_name": prod["name"],
            "sku": prod["sku"],
            "unit": prod["unit"],
            "qty": req_qty,
            "unit_sale_price": sale_price,
            "total_sale_price": round(line_sale, 2),
            "total_cost": round(item_cogs, 2),
            "profit": round(line_profit, 2),
            "margin_pct": round(line_margin, 1),
            "allocation_mode": mode,
            "allocated_lots": allocated
        })

    overall_profit = overall_sale - overall_cogs
    overall_margin = (overall_profit / overall_sale * 100) if overall_sale > 0 else 0.0

    return {
        "success": True,
        "items": simulated_items,
        "summary": {
            "total_sale": round(overall_sale, 2),
            "total_cogs": round(overall_cogs, 2),
            "total_profit": round(overall_profit, 2),
            "margin_pct": round(overall_margin, 1)
        }
    }, 200

def execute_sale(conn, cur, body):
    """
    Executes a sale, allocates inventory lots (lowest-cost-first or manual),
    deducts remaining stock, and records all sale records transactionally.
    Returns: (dict result, int status_code)
    """
    customer_id = body.get("customer_id")
    if customer_id == "" or customer_id is None:
        customer_id = None
    else:
        try:
            customer_id = int(customer_id)
        except (ValueError, TypeError):
            customer_id = None

    sale_date = body.get("sale_date", "").strip() or datetime.now().strftime("%Y-%m-%d")
    sold_by = body.get("sold_by", "").strip() or "Store Staff"
    notes = body.get("notes", "").strip()
    items = body.get("items", [])

    if not items:
        return {"error": "At least one item is required for a sale", "success": False}, 400

    invoice_no = body.get("invoice_no", "").strip()
    if not invoice_no:
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S%f")
        invoice_no = f"INV-{timestamp[:17]}-{uuid.uuid4().hex[:4].upper()}"
    else:
        # Prevent unique constraint collision if invoice_no already exists
        cur.execute("SELECT id FROM sales WHERE invoice_no = ?", (invoice_no,))
        if cur.fetchone():
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S%f")
            invoice_no = f"{invoice_no}-{timestamp[-6:]}-{uuid.uuid4().hex[:4].upper()}"

    # Insert parent sale record
    cur.execute(
        "INSERT INTO sales (invoice_no, customer_id, sale_date, total_amount, total_cogs, total_profit, sold_by, notes) VALUES (?, ?, ?, 0, 0, 0, ?, ?)",
        (invoice_no, customer_id, sale_date, sold_by, notes)
    )
    sale_id = cur.lastrowid

    total_sale_amount = 0.0
    total_cogs_amount = 0.0

    allow_backlog = bool(body.get("allow_backlog", False))

    for it in items:
        prod_id = int(it.get("product_id"))
        cur.execute("SELECT id FROM products WHERE id = ?", (prod_id,))
        if not cur.fetchone():
            conn.rollback()
            return {"error": f"Product {prod_id} not found", "success": False}, 404

        req_qty = float(it.get("qty", 0))
        price = float(it.get("unit_sale_price", 0))
        mode = it.get("allocation_mode", "AUTO").upper()
        manual_lots = it.get("manual_lots", [])

        if req_qty <= 0 or price < 0:
            conn.rollback()
            return {"error": f"Invalid quantity or price for product {prod_id}", "success": False}, 400

        item_total_sale = req_qty * price
        item_cogs = 0.0
        allocated = []

        if mode == "MANUAL" and manual_lots:
            alloc_sum = sum(float(m.get("qty", 0)) for m in manual_lots)
            if abs(alloc_sum - req_qty) > 0.0001:
                conn.rollback()
                return {"error": f"Manual allocation qty mismatch for product {prod_id}", "success": False}, 400

            for m in manual_lots:
                lot_id = int(m["lot_id"])
                take = float(m["qty"])
                if take <= 0:
                    continue
                cur.execute("SELECT id, remaining_qty, unit_cost, batch_code FROM inventory_lots WHERE id = ? AND product_id = ?", (lot_id, prod_id))
                lot = cur.fetchone()
                if not lot or float(lot["remaining_qty"]) < take:
                    conn.rollback()
                    return {"error": f"Insufficient stock or invalid lot {lot_id} for product {prod_id}", "success": False}, 400

                cost = float(lot["unit_cost"])
                allocated.append((lot["id"], take, cost))
                item_cogs += take * cost
        else:
            # Lowest Cost First auto-allocation
            cur.execute("""
                SELECT id, remaining_qty, unit_cost FROM inventory_lots
                WHERE product_id = ? AND remaining_qty > 0
                ORDER BY unit_cost ASC, procurement_date ASC
            """, (prod_id,))
            lots = cur.fetchall()

            rem = req_qty
            for lot in lots:
                if rem <= 0:
                    break
                lot_rem = float(lot["remaining_qty"])
                cost = float(lot["unit_cost"])
                take = min(rem, lot_rem)
                allocated.append((lot["id"], take, cost))
                rem -= take
                item_cogs += take * cost

            if rem > 0.0001:
                if allow_backlog:
                    # Retrieve the latest procurement cost or fallback
                    cur.execute("""
                        SELECT unit_cost FROM inventory_lots
                        WHERE product_id = ?
                        ORDER BY procurement_date DESC, id DESC
                        LIMIT 1
                    """, (prod_id,))
                    last_lot = cur.fetchone()
                    fallback_cost = float(last_lot["unit_cost"]) if last_lot and last_lot["unit_cost"] is not None else 0.0

                    backlog_batch = f"LOT-BACKLOG-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}"
                    cur.execute("""
                        INSERT INTO inventory_lots (product_id, batch_code, initial_qty, remaining_qty, unit_cost, procurement_date, source, status)
                        VALUES (?, ?, ?, ?, ?, ?, 'POS Backlog', 'depleted')
                    """, (prod_id, backlog_batch, rem, rem, fallback_cost, sale_date))
                    backlog_lot_id = cur.lastrowid

                    allocated.append((backlog_lot_id, rem, fallback_cost))
                    item_cogs += rem * fallback_cost
                    rem = 0.0
                else:
                    conn.rollback()
                    return {"error": f"Insufficient stock for product {prod_id}. Short by {round(rem, 2)}", "success": False}, 400

        item_profit = item_total_sale - item_cogs
        total_sale_amount += item_total_sale
        total_cogs_amount += item_cogs

        cur.execute("""
            INSERT INTO sale_items (sale_id, product_id, qty, unit_sale_price, total_sale_price, total_cost, profit, allocation_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (sale_id, prod_id, req_qty, price, item_total_sale, item_cogs, item_profit, mode))
        sale_item_id = cur.lastrowid

        for lot_id, qty_taken, cost in allocated:
            lot_prof = (price - cost) * qty_taken
            cur.execute("""
                INSERT INTO sale_item_lots (sale_item_id, lot_id, qty, unit_cost, lot_profit)
                VALUES (?, ?, ?, ?, ?)
            """, (sale_item_id, lot_id, qty_taken, cost, lot_prof))

            # Deduct inventory
            cur.execute("""
                UPDATE inventory_lots
                SET remaining_qty = remaining_qty - ?,
                    status = CASE WHEN remaining_qty - ? <= 0 THEN 'depleted' ELSE 'active' END
                WHERE id = ?
            """, (qty_taken, qty_taken, lot_id))

    total_profit = total_sale_amount - total_cogs_amount
    cur.execute("""
        UPDATE sales
        SET total_amount = ?, total_cogs = ?, total_profit = ?
        WHERE id = ?
    """, (total_sale_amount, total_cogs_amount, total_profit, sale_id))

    conn.commit()

    return {
        "success": True,
        "sale_id": sale_id,
        "invoice_no": invoice_no,
        "sold_by": sold_by,
        "total_amount": round(total_sale_amount, 2),
        "total_cogs": round(total_cogs_amount, 2),
        "total_profit": round(total_profit, 2),
        "margin_pct": round((total_profit / total_sale_amount * 100), 1) if total_sale_amount > 0 else 0.0,
        "message": "Sale completed and inventory deducted successfully"
    }, 201

# ==============================================================================
# HTTP Request Handler
# ==============================================================================

class InventorySalesRequestHandler(http.server.BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS pre-flight requests."""
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_GET(self):
        """Handle API GET requests and static file serving."""
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path.startswith("/api/"):
            self.handle_api_get(path, query)
        else:
            self.handle_static_file(path)

    def do_POST(self):
        """Handle API POST requests."""
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if not path.startswith("/api/"):
            error_response(self, "Not found", 404)
            return

        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length) if content_length > 0 else b"{}"

        try:
            body = json.loads(post_data.decode("utf-8")) if post_data else {}
        except Exception as e:
            error_response(self, f"Invalid JSON payload: {str(e)}", 400)
            return

        self.handle_api_post(path, body)

    def do_PUT(self):
        """Handle API PUT requests for updating master entities."""
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if not path.startswith("/api/"):
            error_response(self, "Not found", 404)
            return

        content_length = int(self.headers.get("Content-Length", 0))
        put_data = self.rfile.read(content_length) if content_length > 0 else b"{}"

        try:
            body = json.loads(put_data.decode("utf-8")) if put_data else {}
        except Exception as e:
            error_response(self, f"Invalid JSON payload: {str(e)}", 400)
            return

        self.handle_api_put(path, body)

    def do_DELETE(self):
        """Handle API DELETE requests for removing master entities."""
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if not path.startswith("/api/"):
            error_response(self, "Not found", 404)
            return

        self.handle_api_delete(path)

    def handle_api_put(self, path, body):
        """Route PUT requests to the correct entity update handler."""
        conn = db.get_connection()
        cur = conn.cursor()
        try:
            # PUT /api/products/<id>
            if path.startswith("/api/products/"):
                entity_id = path.split("/")[-1]
                if not entity_id.isdigit():
                    error_response(self, "Invalid product ID", 400)
                    return
                cur.execute("SELECT id FROM products WHERE id = ?", (int(entity_id),))
                if not cur.fetchone():
                    error_response(self, "Product not found", 404)
                    return
                name = body.get("name", "").strip()
                sku = body.get("sku", "").strip()
                category = body.get("category", "General").strip()
                unit = body.get("unit", "pcs").strip()
                min_stock = int(body.get("min_stock", 5))
                if not name or not sku:
                    error_response(self, "Product name and SKU are required", 400)
                    return
                cur.execute(
                    "UPDATE products SET name = ?, sku = ?, category = ?, unit = ?, min_stock = ? WHERE id = ?",
                    (name, sku, category, unit, min_stock, int(entity_id))
                )
                conn.commit()
                json_response(self, {"success": True, "id": int(entity_id), "message": "Product updated"})

            # PUT /api/customers/<id>
            elif path.startswith("/api/customers/"):
                entity_id = path.split("/")[-1]
                if not entity_id.isdigit():
                    error_response(self, "Invalid customer ID", 400)
                    return
                cur.execute("SELECT id FROM customers WHERE id = ?", (int(entity_id),))
                if not cur.fetchone():
                    error_response(self, "Customer not found", 404)
                    return
                name = body.get("name", "").strip()
                phone = body.get("phone", "").strip()
                email = body.get("email", "").strip()
                address = body.get("address", "").strip()
                credit_limit = float(body.get("credit_limit", body.get("creditLimit", 0.0)))
                notes = body.get("notes", "").strip()
                if not name:
                    error_response(self, "Customer name is required", 400)
                    return
                cur.execute(
                    "UPDATE customers SET name = ?, phone = ?, email = ?, address = ?, credit_limit = ?, notes = ? WHERE id = ?",
                    (name, phone, email, address, credit_limit, notes, int(entity_id))
                )
                conn.commit()
                json_response(self, {"success": True, "id": int(entity_id), "message": "Customer updated"})

            # PUT /api/suppliers/<id>
            elif path.startswith("/api/suppliers/"):
                entity_id = path.split("/")[-1]
                if not entity_id.isdigit():
                    error_response(self, "Invalid supplier ID", 400)
                    return
                cur.execute("SELECT id FROM suppliers WHERE id = ?", (int(entity_id),))
                if not cur.fetchone():
                    error_response(self, "Supplier not found", 404)
                    return
                name = body.get("name", "").strip()
                contact_person = body.get("contact_person", body.get("contactPerson", "")).strip()
                phone = body.get("phone", "").strip()
                email = body.get("email", "").strip()
                address = body.get("address", "").strip()
                source = body.get("source", "Wholesale Shop").strip()
                payment_terms = body.get("payment_terms", body.get("paymentTerms", "30 days")).strip()
                notes = body.get("notes", "").strip()
                if not name:
                    error_response(self, "Supplier name is required", 400)
                    return
                cur.execute(
                    "UPDATE suppliers SET name = ?, contact_person = ?, phone = ?, email = ?, address = ?, source = ?, payment_terms = ?, notes = ? WHERE id = ?",
                    (name, contact_person, phone, email, address, source, payment_terms, notes, int(entity_id))
                )
                conn.commit()
                json_response(self, {"success": True, "id": int(entity_id), "message": "Supplier updated"})

            # PUT /api/categories/<id>
            elif path.startswith("/api/categories/"):
                entity_id = path.split("/")[-1]
                if not entity_id.isdigit():
                    error_response(self, "Invalid category ID", 400)
                    return
                cur.execute("SELECT id FROM categories WHERE id = ?", (int(entity_id),))
                if not cur.fetchone():
                    error_response(self, "Category not found", 404)
                    return
                name = body.get("name", "").strip()
                parent_id = body.get("parent_id")
                icon = body.get("icon", "📦").strip()
                description = body.get("description", "").strip()
                if not name:
                    error_response(self, "Category name is required", 400)
                    return
                cur.execute(
                    "UPDATE categories SET name = ?, parent_id = ?, icon = ?, description = ? WHERE id = ?",
                    (name, parent_id, icon, description, int(entity_id))
                )
                conn.commit()
                json_response(self, {"success": True, "id": int(entity_id), "message": "Category updated"})

            # PUT /api/procurements/<id>
            elif path.startswith("/api/procurements/"):
                entity_id = path.split("/")[-1]
                if not entity_id.isdigit():
                    error_response(self, "Invalid procurement ID", 400)
                    return
                proc_id = int(entity_id)
                cur.execute("SELECT * FROM procurements WHERE id = ?", (proc_id,))
                existing_proc = cur.fetchone()
                if not existing_proc:
                    error_response(self, "Procurement not found", 404)
                    return

                invoice_no = body.get("invoice_no", existing_proc["invoice_no"]).strip()
                source = body.get("source", existing_proc["source"]).strip()
                procurement_date = body.get("procurement_date", existing_proc["procurement_date"])
                if hasattr(procurement_date, "strftime"):
                    procurement_date = procurement_date.strftime("%Y-%m-%d")
                else:
                    procurement_date = str(procurement_date).strip()
                notes = body.get("notes", existing_proc["notes"] or "").strip()

                items = body.get("items")

                # Fetch all current lots for this procurement
                cur.execute("SELECT * FROM inventory_lots WHERE procurement_id = ?", (proc_id,))
                raw_lots = cur.fetchall()
                existing_lots = {int(l["id"]): dict(l) for l in raw_lots}

                if items is not None and isinstance(items, list):
                    if not items:
                        error_response(self, "Procurement must contain at least one product item", 400)
                        return

                    incoming_lot_ids = set()
                    validated_items = []

                    # Validation pass
                    for idx, it in enumerate(items, 1):
                        p_id = it.get("product_id")
                        if not p_id:
                            error_response(self, f"Product ID is required for item #{idx}", 400)
                            return
                        p_id = int(p_id)
                        qty = float(it.get("qty", it.get("quantity", 0)))
                        cost = round(float(it.get("unit_cost", 0)), 2)
                        if qty <= 0:
                            error_response(self, f"Quantity must be greater than zero for item #{idx}", 400)
                            return
                        if cost < 0:
                            error_response(self, f"Unit cost cannot be negative for item #{idx}", 400)
                            return

                        lot_id = it.get("lot_id") or it.get("id")
                        if lot_id is not None:
                            try:
                                lot_id = int(lot_id)
                            except (ValueError, TypeError):
                                lot_id = None

                        if lot_id is not None and lot_id in existing_lots:
                            if lot_id in incoming_lot_ids:
                                error_response(self, f"Duplicate lot ID {lot_id} in items list", 400)
                                return
                            e_lot = existing_lots[lot_id]
                            init_qty = float(e_lot["initial_qty"])
                            rem_qty = float(e_lot["remaining_qty"])
                            already_sold = init_qty - rem_qty
                            if p_id != int(e_lot["product_id"]) and already_sold > 0.0001:
                                error_response(self, f"Cannot change product for lot '{e_lot.get('batch_code', lot_id)}' which already has {already_sold:.2f} units sold", 400)
                                return
                            if qty < already_sold - 0.0001:
                                error_response(self, f"Cannot reduce quantity for lot '{e_lot.get('batch_code', lot_id)}' below already sold quantity ({already_sold:.2f} units sold)", 400)
                                return
                            incoming_lot_ids.add(lot_id)

                        b_code = str(it.get("batch_code", "")).strip()
                        validated_items.append({
                            "lot_id": lot_id,
                            "product_id": p_id,
                            "qty": qty,
                            "unit_cost": cost,
                            "batch_code": b_code
                        })

                    # Check for omitted lots with sales
                    for e_id, e_lot in existing_lots.items():
                        if e_id not in incoming_lot_ids:
                            init_qty = float(e_lot["initial_qty"])
                            rem_qty = float(e_lot["remaining_qty"])
                            already_sold = init_qty - rem_qty
                            if already_sold > 0.0001:
                                error_response(self, f"Cannot remove lot '{e_lot.get('batch_code', e_id)}' which already has {already_sold:.2f} units sold", 400)
                                return

                    # Execution pass
                    total_amount = 0.0
                    for it in validated_items:
                        qty = it["qty"]
                        cost = it["unit_cost"]
                        total_amount += qty * cost
                        lot_id = it["lot_id"]

                        if lot_id is not None and lot_id in existing_lots:
                            e_lot = existing_lots[lot_id]
                            init_qty = float(e_lot["initial_qty"])
                            rem_qty = float(e_lot["remaining_qty"])
                            already_sold = init_qty - rem_qty
                            new_rem = qty - already_sold
                            new_status = 'depleted' if new_rem <= 0.0001 else 'active'
                            b_code = it["batch_code"] if it["batch_code"] else e_lot["batch_code"]

                            cur.execute("""
                                UPDATE inventory_lots
                                SET product_id = ?, batch_code = ?, unit_cost = ?, initial_qty = ?, remaining_qty = ?, procurement_date = ?, source = ?, status = ?
                                WHERE id = ? AND procurement_id = ?
                            """, (it["product_id"], b_code, cost, qty, new_rem, procurement_date, source, new_status, lot_id, proc_id))

                            # If unit cost changed and units were sold, retroactively recalculate sale profits
                            if abs(cost - float(e_lot["unit_cost"])) > 0.0001 and already_sold > 0.0001:
                                cur.execute("""
                                    SELECT sil.id, sil.sale_item_id, sil.qty, si.unit_sale_price, si.sale_id
                                    FROM sale_item_lots sil
                                    JOIN sale_items si ON sil.sale_item_id = si.id
                                    WHERE sil.lot_id = ?
                                """, (lot_id,))
                                affected_allocs = [dict(a) for a in cur.fetchall()]
                                for a in affected_allocs:
                                    lot_q = float(a["qty"])
                                    u_price = float(a["unit_sale_price"])
                                    new_lot_prof = round((u_price - cost) * lot_q, 2)
                                    cur.execute("UPDATE sale_item_lots SET unit_cost = ?, lot_profit = ? WHERE id = ?", (cost, new_lot_prof, a["id"]))
                                    
                                    # Recalculate parent sale item with ROUND(..., 2)
                                    cur.execute("""
                                        UPDATE sale_items
                                        SET total_cost = (SELECT ROUND(COALESCE(SUM(qty * unit_cost), 0.0), 2) FROM sale_item_lots WHERE sale_item_id = ?),
                                            profit = ROUND(total_sale_price - (SELECT COALESCE(SUM(qty * unit_cost), 0.0) FROM sale_item_lots WHERE sale_item_id = ?), 2)
                                        WHERE id = ?
                                    """, (a["sale_item_id"], a["sale_item_id"], a["sale_item_id"]))

                                    # Recalculate parent sale header with ROUND(..., 2)
                                    cur.execute("""
                                        UPDATE sales
                                        SET total_cogs = (SELECT ROUND(COALESCE(SUM(total_cost), 0.0), 2) FROM sale_items WHERE sale_id = ?),
                                            total_profit = ROUND(total_amount - (SELECT COALESCE(SUM(total_cost), 0.0) FROM sale_items WHERE sale_id = ?), 2)
                                        WHERE id = ?
                                    """, (a["sale_id"], a["sale_id"], a["sale_id"]))

                        else:
                            # New lot added to consignment
                            b_code = it["batch_code"] if it["batch_code"] else f"LOT-{proc_id}-{uuid.uuid4().hex[:4].upper()}"
                            cur.execute("""
                                INSERT INTO inventory_lots
                                (procurement_id, product_id, batch_code, unit_cost, initial_qty, remaining_qty, procurement_date, source, status)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
                            """, (proc_id, it["product_id"], b_code, cost, qty, qty, procurement_date, source))

                    # Remove omitted unsold lots
                    for e_id in set(existing_lots.keys()) - incoming_lot_ids:
                        cur.execute("DELETE FROM inventory_lots WHERE id = ? AND procurement_id = ?", (e_id, proc_id))

                    total_amount = round(total_amount, 2)
                    cur.execute("""
                        UPDATE procurements
                        SET invoice_no = ?, source = ?, procurement_date = ?, total_amount = ?, notes = ?
                        WHERE id = ?
                    """, (invoice_no, source, procurement_date, total_amount, notes, proc_id))

                elif body.get("unit_cost") is not None and body.get("quantity") is not None and len(existing_lots) <= 1:
                    # Legacy single-item edit
                    new_cost = float(body["unit_cost"])
                    new_qty = float(body["quantity"])
                    if new_qty <= 0 or new_cost < 0:
                        error_response(self, "Quantity must be > 0 and unit cost >= 0", 400)
                        return

                    if existing_lots:
                        first_lot = list(existing_lots.values())[0]
                        already_sold = float(first_lot["initial_qty"]) - float(first_lot["remaining_qty"])
                        if new_qty < already_sold - 0.0001:
                            error_response(self, f"Cannot reduce quantity below already sold quantity ({already_sold:.1f} units sold)", 400)
                            return
                        new_remaining = new_qty - already_sold
                        new_status = 'depleted' if new_remaining <= 0.0001 else 'active'
                        target_prod_id = int(body.get("product_id")) if body.get("product_id") else first_lot["product_id"]

                        cur.execute("""
                            UPDATE inventory_lots 
                            SET product_id = ?, initial_qty = ?, remaining_qty = ?, unit_cost = ?, procurement_date = ?, source = ?, status = ?
                            WHERE id = ?
                        """, (target_prod_id, new_qty, new_remaining, new_cost, procurement_date, source, new_status, first_lot["id"]))

                    total_amount = round(new_qty * new_cost, 2)
                    cur.execute("""
                        UPDATE procurements
                        SET invoice_no = ?, source = ?, procurement_date = ?, total_amount = ?, notes = ?
                        WHERE id = ?
                    """, (invoice_no, source, procurement_date, total_amount, notes, proc_id))

                else:
                    # Header-only update (preserves all existing lots)
                    cur.execute("""
                        UPDATE procurements
                        SET invoice_no = ?, source = ?, procurement_date = ?, notes = ?
                        WHERE id = ?
                    """, (invoice_no, source, procurement_date, notes, proc_id))
                    cur.execute("""
                        UPDATE inventory_lots
                        SET procurement_date = ?, source = ?
                        WHERE procurement_id = ?
                    """, (procurement_date, source, proc_id))

                conn.commit()
                json_response(self, {"success": True, "id": proc_id, "message": "Procurement updated successfully"})

            # PUT /api/sales/<id>
            elif path.startswith("/api/sales/"):
                entity_id = path.split("/")[-1]
                if not entity_id.isdigit():
                    error_response(self, "Invalid sale ID", 400)
                    return
                sale_id = int(entity_id)
                cur.execute("SELECT * FROM sales WHERE id = ?", (sale_id,))
                existing_sale = cur.fetchone()
                if not existing_sale:
                    error_response(self, "Sale not found", 404)
                    return

                raw_customer_id = body.get("customer_id")
                if raw_customer_id is None or raw_customer_id == "" or str(raw_customer_id).lower() in ("null", "none"):
                    customer_id = None
                else:
                    try:
                        customer_id = int(raw_customer_id)
                    except (ValueError, TypeError):
                        customer_id = None

                sale_date = body.get("sale_date", existing_sale["sale_date"])
                sold_by = body.get("sold_by", existing_sale["sold_by"] if "sold_by" in existing_sale.keys() else "Store Staff")
                notes = body.get("notes", existing_sale["notes"] or "").strip()

                if "items" in body and isinstance(body["items"], list):
                    new_items = body["items"]
                    if not new_items:
                        conn.rollback()
                        error_response(self, "At least one item is required in a sale", 400)
                        return

                    for item in new_items:
                        if float(item.get("unit_sale_price", 0)) < 0:
                            conn.rollback()
                            error_response(self, "Unit sale price cannot be negative", 400)
                            return

                    # Fetch existing items in this sale
                    cur.execute("SELECT * FROM sale_items WHERE sale_id = ? ORDER BY id ASC", (sale_id,))
                    existing_items = [dict(r) for r in cur.fetchall()]

                    # Check if item products and quantities are identical (in-place price/metadata update)
                    can_do_inplace = False
                    if len(new_items) == len(existing_items):
                        matched_all = True
                        for ni, ei in zip(new_items, existing_items):
                            if int(ni.get("product_id", 0)) != int(ei["product_id"]) or abs(float(ni.get("qty", 0)) - float(ei["qty"])) > 0.0001:
                                matched_all = False
                                break
                        if matched_all:
                            can_do_inplace = True

                    if can_do_inplace:
                        # In-place update: Adjust sale prices and profits without altering inventory lots
                        total_amount = 0.0
                        total_cogs = float(existing_sale["total_cogs"] or 0.0)

                        for ni, ei in zip(new_items, existing_items):
                            new_price = float(ni.get("unit_sale_price", ei["unit_sale_price"]))
                            item_qty = float(ei["qty"])
                            total_sale_price = round(item_qty * new_price, 2)
                            item_cogs = float(ei["total_cost"])
                            item_profit = round(total_sale_price - item_cogs, 2)
                            total_amount += total_sale_price

                            cur.execute("""
                                UPDATE sale_items
                                SET unit_sale_price = ?, total_sale_price = ?, profit = ?
                                WHERE id = ?
                            """, (new_price, total_sale_price, item_profit, ei["id"]))

                            # Update lot_profit in sale_item_lots proportionally
                            cur.execute("SELECT id, qty, unit_cost FROM sale_item_lots WHERE sale_item_id = ?", (ei["id"],))
                            item_lots = cur.fetchall()
                            for il in item_lots:
                                il_profit = round((new_price - float(il["unit_cost"])) * float(il["qty"]), 2)
                                cur.execute("UPDATE sale_item_lots SET lot_profit = ? WHERE id = ?", (il_profit, il["id"]))

                        total_amount = round(total_amount, 2)
                        total_cogs = round(total_cogs, 2)
                        net_profit = round(total_amount - total_cogs, 2)
                        cur.execute("""
                            UPDATE sales
                            SET customer_id = ?, sale_date = ?, total_amount = ?, total_profit = ?, sold_by = ?, notes = ?
                            WHERE id = ?
                        """, (customer_id, sale_date, total_amount, net_profit, sold_by, notes, sale_id))

                    else:
                        # Quantity or product changed: Restore previously drawn lots and re-allocate via Lowest-Cost-First
                        # 1. Restore all drawn lots for this sale
                        cur.execute("SELECT sil.lot_id, sil.qty FROM sale_item_lots sil JOIN sale_items si ON sil.sale_item_id = si.id WHERE si.sale_id = ?", (sale_id,))
                        drawn_lots = cur.fetchall()
                        for dl in drawn_lots:
                            cur.execute("""
                                UPDATE inventory_lots 
                                SET remaining_qty = remaining_qty + ?, status = 'active'
                                WHERE id = ?
                            """, (dl["qty"], dl["lot_id"]))

                        # 2. Delete old sale_items and sale_item_lots
                        cur.execute("DELETE FROM sale_item_lots WHERE sale_item_id IN (SELECT id FROM sale_items WHERE sale_id = ?)", (sale_id,))
                        cur.execute("DELETE FROM sale_items WHERE sale_id = ?", (sale_id,))

                        # 3. Check aggregate stock availability per product before allocating
                        needed_by_product = {}
                        for item in new_items:
                            p_id = int(item["product_id"])
                            qty_needed = float(item["qty"])
                            if qty_needed <= 0:
                                conn.rollback()
                                error_response(self, f"Item quantity must be greater than zero for product {p_id}", 400)
                                return
                            needed_by_product[p_id] = needed_by_product.get(p_id, 0.0) + qty_needed

                        for p_id, total_needed in needed_by_product.items():
                            cur.execute("SELECT COALESCE(SUM(remaining_qty), 0) as available FROM inventory_lots WHERE product_id = ? AND remaining_qty > 0", (p_id,))
                            avail = float(cur.fetchone()["available"])
                            if avail < total_needed:
                                conn.rollback()
                                error_response(self, f"Insufficient stock for product {p_id}. Available: {avail}, Requested: {total_needed}", 400)
                                return

                        # 4. Re-allocate new items
                        total_amount = 0.0
                        total_cogs = 0.0

                        for item in new_items:
                            p_id = int(item["product_id"])
                            qty_needed = float(item["qty"])
                            unit_sale_price = float(item["unit_sale_price"])
                            item_total_sale = round(qty_needed * unit_sale_price, 2)
                            total_amount += item_total_sale

                            cur.execute("""
                                SELECT id, remaining_qty, unit_cost 
                                FROM inventory_lots 
                                WHERE product_id = ? AND remaining_qty > 0 
                                ORDER BY unit_cost ASC, procurement_date ASC
                            """, (p_id,))
                            available_lots = cur.fetchall()

                            item_cogs = 0.0
                            remaining_to_draw = qty_needed
                            lot_allocations = []
                            for lot in available_lots:
                                if remaining_to_draw <= 0:
                                    break
                                lot_draw = min(float(lot["remaining_qty"]), remaining_to_draw)
                                item_cogs += lot_draw * float(lot["unit_cost"])
                                remaining_to_draw -= lot_draw
                                new_rem = float(lot["remaining_qty"]) - lot_draw
                                new_st = 'depleted' if new_rem <= 0 else 'active'
                                cur.execute("UPDATE inventory_lots SET remaining_qty = ?, status = ? WHERE id = ?", (new_rem, new_st, lot["id"]))
                                lot_profit = round((unit_sale_price - float(lot["unit_cost"])) * lot_draw, 2)
                                lot_allocations.append((lot["id"], lot_draw, float(lot["unit_cost"]), lot_profit))

                            if remaining_to_draw > 0.0001:
                                conn.rollback()
                                error_response(self, f"Insufficient stock for product {p_id}. Short by {round(remaining_to_draw, 2)}", 400)
                                return

                            item_cogs = round(item_cogs, 2)
                            item_profit = round(item_total_sale - item_cogs, 2)
                            total_cogs += item_cogs

                            cur.execute("""
                                INSERT INTO sale_items (sale_id, product_id, qty, unit_sale_price, total_sale_price, total_cost, profit, allocation_type)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                            """, (sale_id, p_id, qty_needed, unit_sale_price, item_total_sale, item_cogs, item_profit, 'AUTO_LOWEST_COST'))
                            sale_item_id = cur.lastrowid

                            for lot_id, lot_draw, unit_cost, lot_profit in lot_allocations:
                                cur.execute("""
                                    INSERT INTO sale_item_lots (sale_item_id, lot_id, qty, unit_cost, lot_profit)
                                    VALUES (?, ?, ?, ?, ?)
                                """, (sale_item_id, lot_id, lot_draw, unit_cost, lot_profit))

                        total_amount = round(total_amount, 2)
                        total_cogs = round(total_cogs, 2)
                        net_profit = round(total_amount - total_cogs, 2)
                        cur.execute("""
                            UPDATE sales 
                            SET customer_id = ?, sale_date = ?, total_amount = ?, total_cogs = ?, total_profit = ?, sold_by = ?, notes = ?
                            WHERE id = ?
                        """, (customer_id, sale_date, total_amount, total_cogs, net_profit, sold_by, notes, sale_id))

                else:
                    cur.execute("""
                        UPDATE sales 
                        SET customer_id = ?, sale_date = ?, sold_by = ?, notes = ?
                        WHERE id = ?
                    """, (customer_id, sale_date, sold_by, notes, sale_id))

                conn.commit()
                json_response(self, {"success": True, "id": sale_id, "message": "Sale order updated successfully"})

            # PUT /api/charges/<id>
            elif path.startswith("/api/charges/"):
                entity_id = path.split("/")[-1]
                if not entity_id.isdigit():
                    error_response(self, "Invalid charge ID", 400)
                    return
                charge_id = int(entity_id)
                cur.execute("SELECT id, charge_date, amount, notes FROM charges WHERE id = ?", (charge_id,))
                existing_charge = cur.fetchone()
                if not existing_charge:
                    error_response(self, "Charge not found", 404)
                    return

                charge_date = body.get("charge_date", existing_charge["charge_date"])
                if hasattr(charge_date, "strftime"):
                    charge_date = charge_date.strftime("%Y-%m-%d")
                else:
                    charge_date = str(charge_date).strip()

                try:
                    datetime.strptime(charge_date, "%Y-%m-%d")
                except ValueError:
                    error_response(self, "Invalid date format for charge_date. Expected YYYY-MM-DD", 400)
                    return

                raw_amount = body.get("amount", existing_charge["amount"])
                try:
                    amount = float(raw_amount)
                except (ValueError, TypeError):
                    error_response(self, "Amount must be a valid number", 400)
                    return

                if amount <= 0:
                    error_response(self, "Amount must be greater than zero", 400)
                    return

                notes = body.get("notes", existing_charge["notes"] or "").strip()

                cur.execute(
                    "UPDATE charges SET charge_date = ?, amount = ?, notes = ? WHERE id = ?",
                    (charge_date, round(amount, 2), notes, charge_id)
                )
                conn.commit()
                json_response(self, {
                    "success": True,
                    "id": charge_id,
                    "charge_date": charge_date,
                    "amount": round(amount, 2),
                    "notes": notes,
                    "message": "Business charge updated successfully"
                })

            else:
                error_response(self, "Endpoint not found", 404)

        except Exception as e:
            conn.rollback()
            error_response(self, str(e), 500)
        finally:
            conn.close()

    def handle_api_delete(self, path):
        """Route DELETE requests to the correct entity removal handler."""
        conn = db.get_connection()
        cur = conn.cursor()
        try:
            # DELETE /api/products/<id>
            if path.startswith("/api/products/"):
                entity_id = path.split("/")[-1]
                if not entity_id.isdigit():
                    error_response(self, "Invalid product ID", 400)
                    return
                cur.execute("SELECT id FROM products WHERE id = ?", (int(entity_id),))
                if not cur.fetchone():
                    error_response(self, "Product not found", 404)
                    return
                cur.execute("DELETE FROM products WHERE id = ?", (int(entity_id),))
                conn.commit()
                json_response(self, {"success": True, "message": "Product deleted"})

            # DELETE /api/customers/<id>
            elif path.startswith("/api/customers/"):
                entity_id = path.split("/")[-1]
                if not entity_id.isdigit():
                    error_response(self, "Invalid customer ID", 400)
                    return
                cur.execute("SELECT id FROM customers WHERE id = ?", (int(entity_id),))
                if not cur.fetchone():
                    error_response(self, "Customer not found", 404)
                    return
                cur.execute("DELETE FROM customers WHERE id = ?", (int(entity_id),))
                conn.commit()
                json_response(self, {"success": True, "message": "Customer deleted"})

            # DELETE /api/suppliers/<id>
            elif path.startswith("/api/suppliers/"):
                entity_id = path.split("/")[-1]
                if not entity_id.isdigit():
                    error_response(self, "Invalid supplier ID", 400)
                    return
                cur.execute("SELECT id FROM suppliers WHERE id = ?", (int(entity_id),))
                if not cur.fetchone():
                    error_response(self, "Supplier not found", 404)
                    return
                cur.execute("DELETE FROM suppliers WHERE id = ?", (int(entity_id),))
                conn.commit()
                json_response(self, {"success": True, "message": "Supplier deleted"})

            # DELETE /api/categories/<id>
            elif path.startswith("/api/categories/"):
                entity_id = path.split("/")[-1]
                if not entity_id.isdigit():
                    error_response(self, "Invalid category ID", 400)
                    return
                cur.execute("SELECT id FROM categories WHERE id = ?", (int(entity_id),))
                if not cur.fetchone():
                    error_response(self, "Category not found", 404)
                    return
                cur.execute("DELETE FROM categories WHERE id = ?", (int(entity_id),))
                conn.commit()
                json_response(self, {"success": True, "message": "Category deleted"})

            # DELETE /api/procurements/<id>
            elif path.startswith("/api/procurements/"):
                entity_id = path.split("/")[-1]
                res, status = delete_procurement(conn, cur, entity_id)
                json_response(self, res, status)

            # DELETE /api/sales/<id>
            elif path.startswith("/api/sales/"):
                entity_id = path.split("/")[-1]
                res, status = delete_sale(conn, cur, entity_id)
                json_response(self, res, status)

            # DELETE /api/charges/<id>
            elif path.startswith("/api/charges/"):
                entity_id = path.split("/")[-1]
                if not entity_id.isdigit():
                    error_response(self, "Invalid charge ID", 400)
                    return
                charge_id = int(entity_id)
                cur.execute("SELECT id FROM charges WHERE id = ?", (charge_id,))
                if not cur.fetchone():
                    error_response(self, "Charge not found", 404)
                    return
                cur.execute("DELETE FROM charges WHERE id = ?", (charge_id,))
                conn.commit()
                json_response(self, {"success": True, "id": charge_id, "message": "Charge deleted successfully"})

            else:
                error_response(self, "Endpoint not found", 404)

        except Exception as e:
            conn.rollback()
            error_response(self, str(e), 500)
        finally:
            conn.close()

    def handle_static_file(self, path):
        if path == "/" or path == "":
            path = "/index.html"

        rel_path = path.lstrip("/")
        full_path = os.path.normpath(os.path.join(BASE_DIR, rel_path))

        if not full_path.startswith(BASE_DIR) or not os.path.isfile(full_path):
            if not path.startswith("/static/"):
                full_path = os.path.join(BASE_DIR, "index.html")
            else:
                self.send_response(404)
                self.end_headers()
                self.wfile.write(b"404 Not Found")
                return

        ctype, _ = mimetypes.guess_type(full_path)
        if full_path.endswith(".jsx"):
            ctype = "application/javascript"
        elif not ctype:
            ctype = "application/octet-stream"

        try:
            with open(full_path, "rb") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", f"{ctype}; charset=utf-8")
            self.send_header("Content-Length", str(len(content)))
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(str(e).encode("utf-8"))

    def handle_api_get(self, path, query):
        conn = db.get_connection()
        cur = conn.cursor()
        try:
            if path == "/api/products":
                cur.execute("""
                    SELECT p.*, 
                           COALESCE(SUM(CASE WHEN l.remaining_qty > 0 THEN l.remaining_qty ELSE 0 END), 0) as total_stock,
                           COUNT(CASE WHEN l.remaining_qty > 0 THEN 1 END) as active_lots_count,
                           COALESCE(
                               MIN(CASE WHEN l.remaining_qty > 0 THEN l.unit_cost END),
                               (SELECT l2.unit_cost FROM inventory_lots l2 WHERE l2.product_id = p.id ORDER BY l2.procurement_date DESC, l2.id DESC LIMIT 1),
                               0.0
                           ) as lowest_cost,
                           COALESCE(
                               (SELECT l2.unit_cost FROM inventory_lots l2 WHERE l2.product_id = p.id ORDER BY l2.procurement_date DESC, l2.id DESC LIMIT 1),
                               0.0
                           ) as latest_procurement_cost,
                           (SELECT l2.procurement_date FROM inventory_lots l2 WHERE l2.product_id = p.id ORDER BY l2.procurement_date DESC, l2.id DESC LIMIT 1) as latest_procurement_date,
                           COALESCE(
                               (SELECT l2.source FROM inventory_lots l2 WHERE l2.product_id = p.id ORDER BY l2.procurement_date DESC, l2.id DESC LIMIT 1),
                               ''
                           ) as latest_supplier_source,
                           COALESCE(SUM(l.initial_qty), 0) as total_procured_qty,
                           COALESCE(SUM(CASE WHEN l.remaining_qty > 0 THEN l.remaining_qty * l.unit_cost END) / NULLIF(SUM(CASE WHEN l.remaining_qty > 0 THEN l.remaining_qty END), 0), 0.0) as avg_cost
                    FROM products p
                    LEFT JOIN inventory_lots l ON p.id = l.product_id
                    GROUP BY p.id
                    ORDER BY p.name ASC
                """)
                products = [dict(r) for r in cur.fetchall()]
                for prod in products:
                    if prod.get("latest_procurement_date") is None:
                        prod["latest_procurement_date"] = ""
                    elif hasattr(prod["latest_procurement_date"], "strftime"):
                        prod["latest_procurement_date"] = prod["latest_procurement_date"].strftime("%Y-%m-%d")
                    else:
                        prod["latest_procurement_date"] = str(prod["latest_procurement_date"])
                json_response(self, {"success": True, "products": products})

            elif path == "/api/customers":
                cur.execute("SELECT * FROM customers ORDER BY name ASC")
                customers = [dict(r) for r in cur.fetchall()]
                json_response(self, {"success": True, "customers": customers})

            elif path == "/api/suppliers":
                cur.execute("SELECT * FROM suppliers ORDER BY name ASC")
                suppliers = [dict(r) for r in cur.fetchall()]
                json_response(self, {"success": True, "suppliers": suppliers})

            elif path.startswith("/api/suppliers/"):
                sup_id = path.split("/")[-1]
                if sup_id.isdigit():
                    cur.execute("SELECT * FROM suppliers WHERE id = ?", (int(sup_id),))
                    row = cur.fetchone()
                    if not row:
                        error_response(self, "Supplier not found", 404)
                        return
                    json_response(self, {"success": True, "supplier": dict(row)})
                else:
                    error_response(self, "Invalid supplier ID", 400)

            elif path == "/api/categories":
                cur.execute("SELECT * FROM categories ORDER BY name ASC")
                categories = [dict(r) for r in cur.fetchall()]
                json_response(self, {"success": True, "categories": categories})

            elif path.startswith("/api/categories/"):
                cat_id = path.split("/")[-1]
                if cat_id.isdigit():
                    cur.execute("SELECT * FROM categories WHERE id = ?", (int(cat_id),))
                    row = cur.fetchone()
                    if not row:
                        error_response(self, "Category not found", 404)
                        return
                    json_response(self, {"success": True, "category": dict(row)})
                else:
                    error_response(self, "Invalid category ID", 400)

            elif path == "/api/inventory":
                cur.execute("""
                    SELECT p.id, p.name, p.sku, p.category, p.unit, p.min_stock,
                           COALESCE(SUM(l.remaining_qty), 0) as total_stock,
                           COALESCE(SUM(l.remaining_qty * l.unit_cost), 0.0) as total_valuation
                    FROM products p
                    LEFT JOIN inventory_lots l ON p.id = l.product_id AND l.remaining_qty > 0
                    GROUP BY p.id
                    ORDER BY p.name ASC
                """)
                items = [dict(r) for r in cur.fetchall()]

                for item in items:
                    cur.execute("""
                        SELECT id, procurement_id, batch_code, unit_cost, initial_qty, remaining_qty, procurement_date, source
                        FROM inventory_lots
                        WHERE product_id = ? AND remaining_qty > 0
                        ORDER BY unit_cost ASC, procurement_date ASC
                    """, (item["id"],))
                    item["lots"] = [dict(l) for l in cur.fetchall()]
                    item["avg_cost"] = (item["total_valuation"] / item["total_stock"]) if item["total_stock"] > 0 else 0.0
                    
                    cur.execute("""
                        SELECT unit_cost, procurement_date, source
                        FROM inventory_lots
                        WHERE product_id = ?
                        ORDER BY procurement_date DESC, id DESC LIMIT 1
                    """, (item["id"],))
                    latest_lot = cur.fetchone()
                    if latest_lot:
                        latest_dict = dict(latest_lot)
                        p_date = latest_dict.get("procurement_date")
                        item["latest_procurement_cost"] = float(latest_dict["unit_cost"]) if latest_dict.get("unit_cost") is not None else 0.0
                        item["latest_procurement_date"] = p_date.strftime("%Y-%m-%d") if hasattr(p_date, "strftime") else (str(p_date) if p_date else "")
                        item["latest_source"] = latest_dict.get("source") or ""
                    else:
                        item["latest_procurement_cost"] = 0.0
                        item["latest_procurement_date"] = ""
                        item["latest_source"] = ""

                total_valuation = sum(i["total_valuation"] for i in items)
                total_stock = sum(i["total_stock"] for i in items)
                low_stock_count = sum(1 for i in items if i["total_stock"] <= i["min_stock"])

                json_response(self, {
                    "success": True,
                    "summary": {
                        "total_products": len(items),
                        "total_units": total_stock,
                        "total_valuation": round(total_valuation, 2),
                        "low_stock_count": low_stock_count
                    },
                    "inventory": items
                })

            elif path == "/api/inventory/lots":
                prod_id = query.get("product_id", [None])[0]
                if not prod_id:
                    error_response(self, "product_id parameter required", 400)
                    return
                cur.execute("""
                    SELECT id, batch_code, unit_cost, initial_qty, remaining_qty, procurement_date, source
                    FROM inventory_lots
                    WHERE product_id = ? AND remaining_qty > 0
                    ORDER BY unit_cost ASC, procurement_date ASC
                """, (prod_id,))
                lots = [dict(l) for l in cur.fetchall()]
                json_response(self, {"success": True, "lots": lots})

            elif path.startswith("/api/inventory/lots/product/"):
                prod_id = path.split("/")[-1]
                if not prod_id.isdigit():
                    error_response(self, "Invalid product ID", 400)
                    return
                cur.execute("""
                    SELECT id, batch_code, unit_cost, initial_qty, remaining_qty, procurement_date, source
                    FROM inventory_lots
                    WHERE product_id = ? AND remaining_qty > 0
                    ORDER BY unit_cost ASC, procurement_date ASC
                """, (int(prod_id),))
                lots = [dict(l) for l in cur.fetchall()]
                json_response(self, {"success": True, "lots": lots})

            elif path.startswith("/api/procurements/"):
                proc_id = path.split("/")[-1]
                if not proc_id.isdigit():
                    error_response(self, "Invalid procurement ID", 400)
                    return
                cur.execute("SELECT * FROM procurements WHERE id = ?", (int(proc_id),))
                row = cur.fetchone()
                if not row:
                    error_response(self, "Procurement not found", 404)
                    return
                proc = dict(row)
                proc["supplier_name"] = extract_supplier_name(proc.get("notes"))
                cur.execute("""
                    SELECT l.id, l.product_id, pr.name as product_name, pr.sku, l.batch_code,
                           l.unit_cost, l.initial_qty, l.remaining_qty, l.source
                    FROM inventory_lots l
                    JOIN products pr ON l.product_id = pr.id
                    WHERE l.procurement_id = ?
                """, (proc["id"],))
                proc["items"] = [dict(it) for it in cur.fetchall()]
                json_response(self, {"success": True, "procurement": proc})

            elif path == "/api/procurements":
                cur.execute("""
                    SELECT p.*,
                           (SELECT COUNT(*) FROM inventory_lots l WHERE l.procurement_id = p.id) as items_count
                    FROM procurements p
                    ORDER BY p.procurement_date DESC, p.id DESC
                """)
                procs = [dict(r) for r in cur.fetchall()]
                for p in procs:
                    p["supplier_name"] = extract_supplier_name(p.get("notes"))
                    cur.execute("""
                        SELECT l.id, l.product_id, pr.name as product_name, pr.sku, l.batch_code,
                               l.unit_cost, l.initial_qty, l.remaining_qty, l.source
                        FROM inventory_lots l
                        JOIN products pr ON l.product_id = pr.id
                        WHERE l.procurement_id = ?
                    """, (p["id"],))
                    p["items"] = [dict(it) for it in cur.fetchall()]

                json_response(self, {"success": True, "procurements": procs})

            elif path.startswith("/api/sales/"):
                sale_id = path.split("/")[-1]
                if sale_id.isdigit():
                    cur.execute("""
                        SELECT s.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email, c.address as customer_address
                        FROM sales s
                        LEFT JOIN customers c ON s.customer_id = c.id
                        WHERE s.id = ?
                    """, (sale_id,))
                    sale_row = cur.fetchone()
                    if not sale_row:
                        error_response(self, "Sale not found", 404)
                        return
                    sale = dict(sale_row)
                    cur.execute("""
                        SELECT si.*, p.name as product_name, p.sku, p.unit
                        FROM sale_items si
                        JOIN products p ON si.product_id = p.id
                        WHERE si.sale_id = ?
                    """, (sale_id,))
                    items = [dict(i) for i in cur.fetchall()]
                    for item in items:
                        cur.execute("""
                            SELECT sil.*, l.batch_code, l.source, l.procurement_date
                            FROM sale_item_lots sil
                            JOIN inventory_lots l ON sil.lot_id = l.id
                            WHERE sil.sale_item_id = ?
                        """, (item["id"],))
                        item["allocated_lots"] = [dict(l) for l in cur.fetchall()]
                    sale["items"] = items
                    json_response(self, {"success": True, "sale": sale})
                else:
                    error_response(self, "Invalid sale ID", 400)

            elif path == "/api/sales":
                where_clauses = ["1=1"]
                params = []

                # Optional customer_id filter
                cust_filter = query.get("customer_id", [None])[0]
                if cust_filter:
                    cust_filter = cust_filter.strip()
                    if cust_filter.lower() in ("walk-in", "walk_in", "none", "null"):
                        where_clauses.append("s.customer_id IS NULL")
                    elif cust_filter.isdigit():
                        where_clauses.append("s.customer_id = ?")
                        params.append(int(cust_filter))

                # Optional sold_by filter
                sold_by_filter = query.get("sold_by", [None])[0]
                if sold_by_filter and sold_by_filter.strip() and sold_by_filter.upper() != "ALL":
                    where_clauses.append("LOWER(s.sold_by) = LOWER(?)")
                    params.append(sold_by_filter.strip())

                # Optional date filters
                exact_date = query.get("date", [None])[0]
                from_date = query.get("from_date", [None])[0]
                to_date = query.get("to_date", [None])[0]

                if exact_date and exact_date.strip():
                    where_clauses.append("s.sale_date = ?")
                    params.append(exact_date.strip())
                else:
                    if from_date and from_date.strip():
                        where_clauses.append("s.sale_date >= ?")
                        params.append(from_date.strip())
                    if to_date and to_date.strip():
                        where_clauses.append("s.sale_date <= ?")
                        params.append(to_date.strip())

                where_sql = " AND ".join(where_clauses)

                cur.execute(f"""
                    SELECT s.*, c.name as customer_name,
                           (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) as items_count,
                           (SELECT SUM(qty) FROM sale_items si WHERE si.sale_id = s.id) as total_qty
                    FROM sales s
                    LEFT JOIN customers c ON s.customer_id = c.id
                    WHERE {where_sql}
                    ORDER BY s.sale_date DESC, s.id DESC
                """, params)
                sales = [dict(r) for r in cur.fetchall()]
                json_response(self, {"success": True, "sales": sales})

            elif path == "/api/system/backup":
                cur.execute("SELECT * FROM products ORDER BY id")
                prods = [dict(r) for r in cur.fetchall()]
                cur.execute("SELECT * FROM categories ORDER BY id")
                cats = [dict(r) for r in cur.fetchall()]
                cur.execute("SELECT * FROM suppliers ORDER BY id")
                supps = [dict(r) for r in cur.fetchall()]
                cur.execute("SELECT * FROM customers ORDER BY id")
                custs = [dict(r) for r in cur.fetchall()]
                cur.execute("SELECT * FROM inventory_lots ORDER BY id")
                lots = [dict(r) for r in cur.fetchall()]
                cur.execute("SELECT * FROM procurements ORDER BY id")
                procs = [dict(r) for r in cur.fetchall()]
                cur.execute("SELECT * FROM sales ORDER BY id")
                sales_list = [dict(r) for r in cur.fetchall()]
                cur.execute("SELECT * FROM sale_items ORDER BY id")
                sitems = [dict(r) for r in cur.fetchall()]
                cur.execute("SELECT * FROM sale_item_lots ORDER BY id")
                slots = [dict(r) for r in cur.fetchall()]

                backup_payload = {
                    "version": "1.0",
                    "exported_at": datetime.now().isoformat(),
                    "products": prods,
                    "categories": cats,
                    "suppliers": supps,
                    "customers": custs,
                    "inventory_lots": lots,
                    "procurements": procs,
                    "sales": sales_list,
                    "sale_items": sitems,
                    "sale_item_lots": slots,
                }
                json_response(self, {"success": True, "backup": backup_payload})

            elif path == "/api/charges" or path.startswith("/api/charges/"):
                parts = path.strip("/").split("/")
                if len(parts) == 3 and parts[2].isdigit():
                    charge_id = int(parts[2])
                    cur.execute("SELECT id, charge_date, amount, notes, created_at FROM charges WHERE id = ?", (charge_id,))
                    row = cur.fetchone()
                    if not row:
                        error_response(self, "Charge not found", 404)
                        return
                    json_response(self, {"success": True, "charge": dict(row)})
                    return

                from_date = query.get("from_date", [None])[0] or query.get("fromDate", [None])[0]
                to_date = query.get("to_date", [None])[0] or query.get("toDate", [None])[0]
                search = query.get("search", [""])[0].strip()
                limit = int(query.get("limit", [500])[0])
                offset = int(query.get("offset", [0])[0])

                where_clauses = ["1=1"]
                params = []
                if from_date:
                    where_clauses.append("charge_date >= ?")
                    params.append(from_date)
                if to_date:
                    where_clauses.append("charge_date <= ?")
                    params.append(to_date)
                if search:
                    where_clauses.append("notes LIKE ?")
                    params.append(f"%{search}%")

                where_sql = " AND ".join(where_clauses)

                cur.execute(f"SELECT COUNT(*) as total_count, COALESCE(SUM(amount), 0.0) as total_amount FROM charges WHERE {where_sql}", params)
                sum_row = cur.fetchone()
                total_count = int(sum_row["total_count"]) if sum_row else 0
                total_amount = round(float(sum_row["total_amount"]), 2) if sum_row else 0.0

                query_sql = f"""
                    SELECT id, charge_date, amount, notes, created_at
                    FROM charges
                    WHERE {where_sql}
                    ORDER BY charge_date DESC, id DESC
                    LIMIT ? OFFSET ?
                """
                cur.execute(query_sql, params + [limit, offset])
                charges_list = [dict(r) for r in cur.fetchall()]

                json_response(self, {
                    "success": True,
                    "charges": charges_list,
                    "summary": {
                        "total_count": total_count,
                        "total_amount": total_amount,
                        "average_amount": round(total_amount / total_count, 2) if total_count > 0 else 0.0
                    }
                })

            elif path == "/api/analytics":
                self.handle_analytics_get(cur, query)

            else:
                error_response(self, "Endpoint not found", 404)

        except Exception as e:
            error_response(self, str(e), 500)
        finally:
            conn.close()

    def handle_analytics_get(self, cur, query):
        granularity = query.get("granularity", ["month"])[0].lower()
        from_date = query.get("from_date", [None])[0]
        to_date = query.get("to_date", [None])[0]
        period = query.get("period", [None])[0]

        if period and not from_date and not to_date:
            now = datetime.now()
            p_lower = period.lower().strip()
            if p_lower == "today":
                from_date = now.strftime("%Y-%m-%d")
                to_date = now.strftime("%Y-%m-%d")
            elif p_lower in ("this_week", "week"):
                start_of_week = now - timedelta(days=now.weekday())
                end_of_week = start_of_week + timedelta(days=6)
                from_date = start_of_week.strftime("%Y-%m-%d")
                to_date = end_of_week.strftime("%Y-%m-%d")
            elif p_lower in ("this_month", "month"):
                from_date = now.strftime("%Y-%m-01")
                import calendar
                _, last_day = calendar.monthrange(now.year, now.month)
                to_date = f"{now.year}-{now.month:02d}-{last_day:02d}"
            elif p_lower in ("this_year", "year"):
                from_date = f"{now.year}-01-01"
                to_date = f"{now.year}-12-31"

        where_clauses = ["1=1"]
        params = []
        if from_date:
            where_clauses.append("s.sale_date >= ?")
            params.append(from_date)
        if to_date:
            where_clauses.append("s.sale_date <= ?")
            params.append(to_date)

        where_sql = " AND ".join(where_clauses)

        # Query Charges in the same date window
        charges_where = ["1=1"]
        charges_params = []
        if from_date:
            charges_where.append("charge_date >= ?")
            charges_params.append(from_date)
        if to_date:
            charges_where.append("charge_date <= ?")
            charges_params.append(to_date)
        charges_sql = " AND ".join(charges_where)

        cur.execute(f"SELECT COALESCE(SUM(amount), 0.0) as total_charges, COUNT(*) as charges_count FROM charges WHERE {charges_sql}", charges_params)
        charges_row = cur.fetchone()
        total_charges = float(charges_row["total_charges"]) if charges_row and charges_row["total_charges"] is not None else 0.0
        charges_count = int(charges_row["charges_count"]) if charges_row and charges_row["charges_count"] is not None else 0

        # 1. Summary KPIs (Line-item sums prevent row multiplication across multi-item sales)
        cur.execute(f"""
            SELECT 
                COALESCE(COUNT(DISTINCT s.id), 0) as total_orders,
                COALESCE(SUM(si.total_sale_price), 0.0) as total_revenue,
                COALESCE(SUM(si.total_cost), 0.0) as total_cogs,
                COALESCE(SUM(si.profit), 0.0) as total_profit,
                COALESCE(SUM(si.qty), 0.0) as total_units_sold
            FROM sales s
            LEFT JOIN sale_items si ON s.id = si.sale_id
            WHERE {where_sql}
        """, params)
        sum_row = cur.fetchone()
        revenue = float(sum_row["total_revenue"]) if sum_row and sum_row["total_revenue"] is not None else 0.0
        cogs = float(sum_row["total_cogs"]) if sum_row and sum_row["total_cogs"] is not None else 0.0
        gross_profit = float(sum_row["total_profit"]) if sum_row and sum_row["total_profit"] is not None else 0.0
        net_profit = gross_profit - total_charges
        margin_pct = (net_profit / revenue * 100) if revenue > 0 else 0.0
        gross_margin_pct = (gross_profit / revenue * 100) if revenue > 0 else 0.0
        units = float(sum_row["total_units_sold"]) if sum_row and sum_row["total_units_sold"] is not None else 0.0
        orders_cnt = int(sum_row["total_orders"]) if sum_row and sum_row["total_orders"] is not None else 0

        summary = {
            "total_orders": orders_cnt,
            "order_count": orders_cnt,
            "total_revenue": round(revenue, 2),
            "revenue": round(revenue, 2),
            "total_cogs": round(cogs, 2),
            "cogs": round(cogs, 2),
            "gross_profit": round(gross_profit, 2),
            "total_charges": round(total_charges, 2),
            "charges": round(total_charges, 2),
            "charges_count": charges_count,
            "total_profit": round(net_profit, 2),
            "net_profit": round(net_profit, 2),
            "profit": round(net_profit, 2),
            "margin_pct": round(margin_pct, 1),
            "net_margin_pct": round(margin_pct, 1),
            "gross_margin_pct": round(gross_margin_pct, 1),
            "total_units_sold": round(units, 2),
            "units_sold": round(units, 2)
        }

        # 2. Timeline Aggregation (Line-item sums prevent row multiplication)
        if db.is_postgres():
            if granularity == "day":
                date_group = "TO_CHAR(s.sale_date, 'YYYY-MM-DD')"
                charge_date_group = "TO_CHAR(charge_date, 'YYYY-MM-DD')"
            elif granularity == "week":
                date_group = "TO_CHAR(s.sale_date, 'IYYY-\"W\"IW')"
                charge_date_group = "TO_CHAR(charge_date, 'IYYY-\"W\"IW')"
            elif granularity == "year":
                date_group = "TO_CHAR(s.sale_date, 'YYYY')"
                charge_date_group = "TO_CHAR(charge_date, 'YYYY')"
            else:
                date_group = "TO_CHAR(s.sale_date, 'YYYY-MM')"
                charge_date_group = "TO_CHAR(charge_date, 'YYYY-MM')"
        else:
            if granularity == "day":
                date_group = "strftime('%Y-%m-%d', s.sale_date)"
                charge_date_group = "strftime('%Y-%m-%d', charge_date)"
            elif granularity == "week":
                date_group = "strftime('%Y-W%W', s.sale_date)"
                charge_date_group = "strftime('%Y-W%W', charge_date)"
            elif granularity == "year":
                date_group = "strftime('%Y', s.sale_date)"
                charge_date_group = "strftime('%Y', charge_date)"
            else:
                date_group = "strftime('%Y-%m', s.sale_date)"
                charge_date_group = "strftime('%Y-%m', charge_date)"

        cur.execute(f"""
            SELECT 
                {date_group} as time_bucket,
                COALESCE(COUNT(DISTINCT s.id), 0) as orders_count,
                COALESCE(SUM(si.total_sale_price), 0.0) as revenue,
                COALESCE(SUM(si.total_cost), 0.0) as cogs,
                COALESCE(SUM(si.profit), 0.0) as profit,
                COALESCE(SUM(si.qty), 0.0) as units_sold
            FROM sales s
            LEFT JOIN sale_items si ON s.id = si.sale_id
            WHERE {where_sql}
            GROUP BY time_bucket
            ORDER BY time_bucket ASC
        """, params)
        raw_timeline = [dict(r) for r in cur.fetchall()]

        # Query charges grouped by bucket
        cur.execute(f"""
            SELECT {charge_date_group} as time_bucket, COALESCE(SUM(amount), 0.0) as charges
            FROM charges
            WHERE {charges_sql}
            GROUP BY time_bucket
        """, charges_params)
        charges_by_bucket = {r["time_bucket"]: float(r["charges"]) for r in cur.fetchall() if r["time_bucket"]}

        all_buckets = sorted(list(set(b["time_bucket"] for b in raw_timeline if b.get("time_bucket")) | set(charges_by_bucket.keys())))
        timeline_dict = {b["time_bucket"]: b for b in raw_timeline if b.get("time_bucket")}
        timeline = []
        for b_key in all_buckets:
            if b_key not in timeline_dict:
                timeline_dict[b_key] = {
                    "time_bucket": b_key,
                    "orders_count": 0,
                    "revenue": 0.0,
                    "cogs": 0.0,
                    "profit": 0.0,
                    "units_sold": 0.0
                }
            b_item = dict(timeline_dict[b_key])
            b_chg = round(charges_by_bucket.get(b_key, 0.0), 2)
            b_rev = float(b_item.get("revenue", 0.0))
            b_cogs = float(b_item.get("cogs", 0.0))
            b_gross = round(b_rev - b_cogs, 2)
            b_net = round(b_gross - b_chg, 2)
            b_item["charges"] = b_chg
            b_item["gross_profit"] = b_gross
            b_item["net_profit"] = b_net
            b_item["profit"] = b_net
            b_item["margin_pct"] = round((b_net / b_rev * 100), 1) if b_rev > 0 else 0.0
            timeline.append(b_item)

        # 3. Item-Level Breakdown (Filtered subquery ensures date range is strictly respected)
        cur.execute(f"""
            SELECT 
                p.id as product_id,
                p.name as product_name,
                p.sku,
                p.category,
                p.unit,
                COALESCE((SELECT SUM(l.remaining_qty) FROM inventory_lots l WHERE l.product_id = p.id AND l.remaining_qty > 0), 0) as current_stock,
                COALESCE(SUM(si.qty), 0.0) as units_sold,
                COALESCE(SUM(si.total_sale_price), 0.0) as revenue,
                COALESCE(SUM(si.total_cost), 0.0) as cogs,
                COALESCE(SUM(si.profit), 0.0) as profit
            FROM products p
            LEFT JOIN (
                SELECT si.product_id, si.qty, si.total_sale_price, si.total_cost, si.profit
                FROM sale_items si
                JOIN sales s ON si.sale_id = s.id
                WHERE {where_sql}
            ) si ON p.id = si.product_id
            GROUP BY p.id
            ORDER BY profit DESC, units_sold DESC
        """, params)
        items_breakdown = []
        for r in cur.fetchall():
            it = dict(r)
            it_rev = float(it["revenue"]) if it.get("revenue") is not None else 0.0
            it_prof = float(it["profit"]) if it.get("profit") is not None else 0.0
            it_cogs = float(it["cogs"]) if it.get("cogs") is not None else 0.0
            it_units = float(it["units_sold"]) if it.get("units_sold") is not None else 0.0
            it["name"] = it.get("product_name", "")
            it["margin_pct"] = round((it_prof / it_rev * 100), 1) if it_rev > 0 else 0.0
            it["avg_sale_price"] = round((it_rev / it_units), 2) if it_units > 0 else 0.0
            it["avg_cost_price"] = round((it_cogs / it_units), 2) if it_units > 0 else 0.0
            it["revenue"] = round(it_rev, 2)
            it["cogs"] = round(it_cogs, 2)
            it["profit"] = round(it_prof, 2)
            it["units_sold"] = round(it_units, 2)
            items_breakdown.append(it)

        # 4. Source Breakdown
        cur.execute("""
            SELECT 
                source,
                COUNT(DISTINCT procurement_id) as procurements_count,
                SUM(initial_qty) as total_procured_units,
                SUM(initial_qty * unit_cost) as total_procured_cost,
                SUM(remaining_qty) as remaining_units
            FROM inventory_lots
            GROUP BY source
            ORDER BY total_procured_cost DESC
        """)
        sources = [dict(r) for r in cur.fetchall()]

        json_response(self, {
            "success": True,
            "granularity": granularity,
            "from_date": from_date,
            "to_date": to_date,
            "summary": summary,
            "timeline": timeline,
            "items_breakdown": items_breakdown,
            "products": items_breakdown,
            "sources_breakdown": sources
        })

    def handle_api_post(self, path, body):
        conn = db.get_connection()
        cur = conn.cursor()
        try:
            if path == "/api/products":
                name = body.get("name", "").strip()
                sku = body.get("sku", "").strip()
                category = body.get("category", "General").strip()
                unit = body.get("unit", "pcs").strip()
                min_stock = int(body.get("min_stock", 5))

                if not name or not sku:
                    error_response(self, "Product name and SKU are required", 400)
                    return

                cur.execute(
                    "INSERT INTO products (name, sku, category, unit, min_stock) VALUES (?, ?, ?, ?, ?)",
                    (name, sku, category, unit, min_stock)
                )
                conn.commit()
                json_response(self, {"success": True, "id": cur.lastrowid, "message": "Product created"}, 201)

            elif path == "/api/customers":
                name = body.get("name", "").strip()
                phone = body.get("phone", "").strip()
                email = body.get("email", "").strip()
                address = body.get("address", "").strip()
                credit_limit = float(body.get("credit_limit", body.get("creditLimit", 0.0)))
                notes = body.get("notes", "").strip()

                if not name:
                    error_response(self, "Customer name is required", 400)
                    return

                cur.execute(
                    "INSERT INTO customers (name, phone, email, address, credit_limit, notes) VALUES (?, ?, ?, ?, ?, ?)",
                    (name, phone, email, address, credit_limit, notes)
                )
                conn.commit()
                json_response(self, {"success": True, "id": cur.lastrowid, "message": "Customer created"}, 201)

            elif path == "/api/suppliers":
                name = body.get("name", "").strip()
                contact_person = body.get("contact_person", body.get("contactPerson", "")).strip()
                phone = body.get("phone", "").strip()
                email = body.get("email", "").strip()
                address = body.get("address", "").strip()
                source = body.get("source", "Wholesale Shop").strip()
                payment_terms = body.get("payment_terms", body.get("paymentTerms", "30 days")).strip()
                notes = body.get("notes", "").strip()

                if not name:
                    error_response(self, "Supplier name is required", 400)
                    return

                cur.execute(
                    "INSERT INTO suppliers (name, contact_person, phone, email, address, source, payment_terms, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (name, contact_person, phone, email, address, source, payment_terms, notes)
                )
                conn.commit()
                json_response(self, {"success": True, "id": cur.lastrowid, "message": "Supplier created"}, 201)

            elif path == "/api/categories":
                name = body.get("name", "").strip()
                parent_id = body.get("parent_id")
                icon = body.get("icon", "📦").strip()
                description = body.get("description", "").strip()

                if not name:
                    error_response(self, "Category name is required", 400)
                    return

                cur.execute(
                    "INSERT INTO categories (name, parent_id, icon, description) VALUES (?, ?, ?, ?)",
                    (name, parent_id, icon, description)
                )
                conn.commit()
                json_response(self, {"success": True, "id": cur.lastrowid, "message": "Category created"}, 201)

            elif path == "/api/procurements":
                res, status = execute_procurement(conn, cur, body)
                json_response(self, res, status)

            elif path == "/api/sales/simulate":
                res, status = simulate_sale(cur, body)
                json_response(self, res, status)

            elif path == "/api/sales":
                res, status = execute_sale(conn, cur, body)
                json_response(self, res, status)

            elif path == "/api/auth/google":
                id_token = body.get("idToken", "").strip()
                if not id_token:
                    error_response(self, "idToken is required", 400)
                    return
                try:
                    import base64
                    parts = id_token.split(".")
                    if len(parts) != 3:
                        error_response(self, "Invalid token format", 400)
                        return
                    padded = parts[1] + "=" * ((4 - len(parts[1]) % 4) % 4)
                    payload = json.loads(base64.urlsafe_b64decode(padded.encode("utf-8")).decode("utf-8"))
                    email = payload.get("email", "").strip().lower()
                    authorized_emails = ["rangaprasad.557@gmail.com", "singarisurendra@gmail.com"]
                    if email not in authorized_emails:
                        error_response(self, f"Access denied. Account ({email}) is not authorized to log in.", 403)
                        return
                    json_response(self, {
                        "success": True,
                        "data": {
                            "email": email,
                            "name": payload.get("name", email.split("@")[0]),
                            "role": "full_access",
                            "avatar": payload.get("picture", "")
                        }
                    }, 200)
                except Exception as ex:
                    error_response(self, f"Invalid token: {str(ex)}", 400)

            elif path == "/api/system/clear-data":
                db.clear_all_data(conn)
                json_response(self, {"success": True, "message": "All application data cleared successfully. Ready for fresh entries."}, 200)

            elif path == "/api/system/restore":
                backup = body if isinstance(body, dict) else {}
                if not isinstance(backup, dict) or not backup:
                    error_response(self, "Invalid backup payload format", 400)
                    return
                data = backup.get("backup", backup)
                if db.is_postgres():
                    cur.execute("TRUNCATE TABLE sale_item_lots, sale_items, sales, inventory_lots, procurements, customers, products, suppliers, categories RESTART IDENTITY CASCADE")
                else:
                    cur.execute("PRAGMA foreign_keys = OFF")
                    for tbl in ['sale_item_lots', 'sale_items', 'sales', 'inventory_lots', 'procurements', 'customers', 'products', 'suppliers', 'categories']:
                        cur.execute(f"DELETE FROM {tbl}")
                        cur.execute(f"DELETE FROM sqlite_sequence WHERE name = '{tbl}'")

                for p in data.get("products", []):
                    cur.execute("INSERT INTO products (id, name, sku, category, unit, min_stock, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                                (p["id"], p["name"], p["sku"], p.get("category", "General"), p.get("unit", "pcs"), p.get("min_stock", 1), p.get("created_at", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))))
                for c in data.get("categories", []):
                    cur.execute("INSERT INTO categories (id, name, parent_id, icon, description, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                                (c["id"], c["name"], c.get("parent_id"), c.get("icon", "📦"), c.get("description", ""), c.get("created_at", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))))
                for cu in data.get("customers", []):
                    cur.execute("INSERT INTO customers (id, name, phone, email, address, credit_limit, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                                (cu["id"], cu["name"], cu.get("phone", ""), cu.get("email", ""), cu.get("address", ""), cu.get("credit_limit", 0.0), cu.get("notes", ""), cu.get("created_at", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))))
                for su in data.get("suppliers", []):
                    cur.execute("INSERT INTO suppliers (id, name, contact_person, phone, email, address, source, payment_terms, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                                (su["id"], su["name"], su.get("contact_person", ""), su.get("phone", ""), su.get("email", ""), su.get("address", ""), su.get("source", "Wholesale Shop"), su.get("payment_terms", "30 days"), su.get("notes", ""), su.get("created_at", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))))
                for lot in data.get("inventory_lots", []):
                    cur.execute("INSERT INTO inventory_lots (id, procurement_id, product_id, batch_code, unit_cost, initial_qty, remaining_qty, procurement_date, source, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                                (lot["id"], lot.get("procurement_id"), lot["product_id"], lot.get("batch_code", ""), lot.get("unit_cost", 0.0), lot.get("initial_qty", 0), lot.get("remaining_qty", 0), lot.get("procurement_date", ""), lot.get("source", "Wholesale Shop"), lot.get("status", "active"), lot.get("created_at", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))))
                for pr in data.get("procurements", []):
                    cur.execute("INSERT INTO procurements (id, invoice_no, source, procurement_date, total_amount, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                                (pr["id"], pr["invoice_no"], pr.get("source", ""), pr.get("procurement_date", ""), pr.get("total_amount", 0.0), pr.get("notes", ""), pr.get("created_at", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))))
                for sl in data.get("sales", []):
                    cur.execute("INSERT INTO sales (id, invoice_no, customer_id, sale_date, total_amount, total_cogs, total_profit, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                                (sl["id"], sl["invoice_no"], sl.get("customer_id"), sl.get("sale_date", ""), sl.get("total_amount", 0.0), sl.get("total_cogs", 0.0), sl.get("total_profit", sl.get("net_profit", 0.0)), sl.get("notes", ""), sl.get("created_at", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))))
                
                s_items = data.get("sale_items") if data.get("sale_items") is not None else data.get("sales_items", [])
                for si in s_items:
                    cur.execute("INSERT INTO sale_items (id, sale_id, product_id, qty, unit_sale_price, total_sale_price, total_cost, profit, allocation_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                                (si["id"], si["sale_id"], si["product_id"], si.get("qty", 0), si.get("unit_sale_price", 0.0), si.get("total_sale_price", si.get("subtotal_amount", 0.0)), si.get("total_cost", si.get("subtotal_cogs", 0.0)), si.get("profit", si.get("subtotal_profit", 0.0)), si.get("allocation_type", "AUTO_LOWEST_COST")))
                for sil in data.get("sale_item_lots", []):
                    cur.execute("INSERT INTO sale_item_lots (id, sale_item_id, lot_id, qty, unit_cost, lot_profit) VALUES (?, ?, ?, ?, ?, ?)",
                                (sil["id"], sil["sale_item_id"], sil["lot_id"], sil.get("qty", sil.get("qty_drawn", 0)), sil.get("unit_cost", sil.get("unit_lot_cost", 0.0)), sil.get("lot_profit", 0.0)))

                if db.is_postgres():
                    for tbl in ['sale_item_lots', 'sale_items', 'sales', 'inventory_lots', 'procurements', 'customers', 'products', 'suppliers', 'categories']:
                        try:
                            cur.execute(f"SELECT setval(pg_get_serial_sequence('{tbl}', 'id'), COALESCE((SELECT MAX(id) FROM {tbl}), 1))")
                        except Exception:
                            pass
                    cur.execute("CREATE TABLE IF NOT EXISTS system_meta (key VARCHAR(100) PRIMARY KEY, value TEXT NOT NULL)")
                    cur.execute("INSERT INTO system_meta (key, value) VALUES ('initialized', 'restored') ON CONFLICT (key) DO UPDATE SET value = 'restored'")
                else:
                    for tbl in ['sale_item_lots', 'sale_items', 'sales', 'inventory_lots', 'procurements', 'customers', 'products', 'suppliers', 'categories']:
                        cur.execute(f"SELECT MAX(id) as max_id FROM {tbl}")
                        row = cur.fetchone()
                        max_id = row['max_id'] if row and row['max_id'] else 0
                        if max_id > 0:
                            cur.execute("INSERT OR REPLACE INTO sqlite_sequence (name, seq) VALUES (?, ?)", (tbl, max_id))
                    cur.execute("CREATE TABLE IF NOT EXISTS system_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
                    cur.execute("INSERT OR REPLACE INTO system_meta (key, value) VALUES ('initialized', 'restored')")
                    cur.execute("PRAGMA foreign_keys = ON")

                conn.commit()
                json_response(self, {"success": True, "message": "Database restored successfully.", "products_count": len(data.get("products", []))})

            elif path == "/api/charges":
                charge_date = body.get("charge_date", "").strip()
                raw_amount = body.get("amount", None)
                notes = body.get("notes", "").strip()

                if not charge_date:
                    charge_date = datetime.now().strftime("%Y-%m-%d")
                else:
                    try:
                        datetime.strptime(charge_date, "%Y-%m-%d")
                    except ValueError:
                        error_response(self, "Invalid date format for charge_date. Expected YYYY-MM-DD", 400)
                        return

                if raw_amount is None:
                    error_response(self, "Amount is required for charge", 400)
                    return
                try:
                    amount = float(raw_amount)
                except (ValueError, TypeError):
                    error_response(self, "Amount must be a valid number", 400)
                    return

                if amount <= 0:
                    error_response(self, "Amount must be greater than zero", 400)
                    return

                cur.execute(
                    "INSERT INTO charges (charge_date, amount, notes) VALUES (?, ?, ?)",
                    (charge_date, round(amount, 2), notes)
                )
                conn.commit()
                charge_id = cur.lastrowid
                json_response(self, {
                    "success": True,
                    "id": charge_id,
                    "charge_date": charge_date,
                    "amount": round(amount, 2),
                    "notes": notes,
                    "message": "Business charge recorded successfully"
                }, 201)

            else:
                error_response(self, "Endpoint not found", 404)

        except Exception as e:
            traceback.print_exc()
            conn.rollback()
            error_response(self, str(e), 500)
        finally:
            conn.close()

def run_server(port=PORT):
    db.init_db(seed_if_empty=False)
    server_address = ("", port)
    httpd = socketserver.ThreadingTCPServer(server_address, InventorySalesRequestHandler)
    print(f"============================================================")
    print(f" Multi-Batch Inventory, Procurement & Sales Server Running")
    print(f" Local URL: http://localhost:{port}")
    print(f" Press Ctrl+C to stop.")
    print(f"============================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.server_close()

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else PORT
    run_server(port)
