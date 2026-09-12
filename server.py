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
from datetime import datetime, timedelta
import db

PORT = 8000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def json_response(handler, data, status=200):
    """Send a JSON HTTP response with CORS headers."""
    payload = json.dumps(data, default=str).encode("utf-8")
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
                if lot["remaining_qty"] < lot_take:
                    return {"error": f"Lot {lot['batch_code']} has only {lot['remaining_qty']} available (requested {lot_take})", "success": False}, 400

                allocated.append({
                    "lot_id": lot["id"],
                    "batch_code": lot["batch_code"],
                    "source": lot["source"],
                    "procurement_date": lot["procurement_date"],
                    "qty": lot_take,
                    "unit_cost": lot["unit_cost"],
                    "line_cost": lot_take * lot["unit_cost"]
                })
                item_cogs += lot_take * lot["unit_cost"]
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
                take = min(rem, lot["remaining_qty"])
                allocated.append({
                    "lot_id": lot["id"],
                    "batch_code": lot["batch_code"],
                    "source": lot["source"],
                    "procurement_date": lot["procurement_date"],
                    "qty": take,
                    "unit_cost": lot["unit_cost"],
                    "line_cost": take * lot["unit_cost"]
                })
                item_cogs += take * lot["unit_cost"]
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
    notes = body.get("notes", "").strip()
    items = body.get("items", [])

    if not items:
        return {"error": "At least one item is required for a sale", "success": False}, 400

    invoice_no = body.get("invoice_no", "").strip()
    if not invoice_no:
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S%f")
        invoice_no = f"INV-{timestamp[:17]}-{uuid.uuid4().hex[:4].upper()}"

    # Insert parent sale record
    cur.execute(
        "INSERT INTO sales (invoice_no, customer_id, sale_date, total_amount, total_cogs, total_profit, notes) VALUES (?, ?, ?, 0, 0, 0, ?)",
        (invoice_no, customer_id, sale_date, notes)
    )
    sale_id = cur.lastrowid

    total_sale_amount = 0.0
    total_cogs_amount = 0.0

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
                if not lot or lot["remaining_qty"] < take:
                    conn.rollback()
                    return {"error": f"Insufficient stock or invalid lot {lot_id} for product {prod_id}", "success": False}, 400

                allocated.append((lot["id"], take, lot["unit_cost"]))
                item_cogs += take * lot["unit_cost"]
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
                take = min(rem, lot["remaining_qty"])
                allocated.append((lot["id"], take, lot["unit_cost"]))
                rem -= take
                item_cogs += take * lot["unit_cost"]

            if rem > 0.0001:
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
                           COALESCE(SUM(l.remaining_qty), 0) as total_stock,
                           COUNT(CASE WHEN l.remaining_qty > 0 THEN 1 END) as active_lots_count,
                           COALESCE(MIN(CASE WHEN l.remaining_qty > 0 THEN l.unit_cost END), 0.0) as lowest_cost,
                           COALESCE(SUM(CASE WHEN l.remaining_qty > 0 THEN l.remaining_qty * l.unit_cost END) / NULLIF(SUM(CASE WHEN l.remaining_qty > 0 THEN l.remaining_qty END), 0), 0.0) as avg_cost
                    FROM products p
                    LEFT JOIN inventory_lots l ON p.id = l.product_id AND l.remaining_qty > 0
                    GROUP BY p.id
                    ORDER BY p.name ASC
                """)
                products = [dict(r) for r in cur.fetchall()]
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
                cur.execute("""
                    SELECT s.*, c.name as customer_name,
                           (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) as items_count,
                           (SELECT SUM(qty) FROM sale_items si WHERE si.sale_id = s.id) as total_qty
                    FROM sales s
                    LEFT JOIN customers c ON s.customer_id = c.id
                    ORDER BY s.sale_date DESC, s.id DESC
                """)
                sales = [dict(r) for r in cur.fetchall()]
                json_response(self, {"success": True, "sales": sales})

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

        where_clauses = ["1=1"]
        params = []
        if from_date:
            where_clauses.append("s.sale_date >= ?")
            params.append(from_date)
        if to_date:
            where_clauses.append("s.sale_date <= ?")
            params.append(to_date)

        where_sql = " AND ".join(where_clauses)

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
        revenue = sum_row["total_revenue"]
        cogs = sum_row["total_cogs"]
        profit = sum_row["total_profit"]
        margin_pct = (profit / revenue * 100) if revenue > 0 else 0.0

        summary = {
            "total_orders": sum_row["total_orders"],
            "total_revenue": round(revenue, 2),
            "total_cogs": round(cogs, 2),
            "total_profit": round(profit, 2),
            "margin_pct": round(margin_pct, 1),
            "total_units_sold": sum_row["total_units_sold"]
        }

        # 2. Timeline Aggregation (Line-item sums prevent row multiplication)
        if granularity == "day":
            date_group = "strftime('%Y-%m-%d', s.sale_date)"
        elif granularity == "week":
            date_group = "strftime('%Y-W%W', s.sale_date)"
        elif granularity == "year":
            date_group = "strftime('%Y', s.sale_date)"
        else:
            date_group = "strftime('%Y-%m', s.sale_date)"

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
        timeline = [dict(r) for r in cur.fetchall()]

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
            it_rev = it["revenue"]
            it_prof = it["profit"]
            it_units = it["units_sold"]
            it["margin_pct"] = round((it_prof / it_rev * 100), 1) if it_rev > 0 else 0.0
            it["avg_sale_price"] = round((it_rev / it_units), 2) if it_units > 0 else 0.0
            it["avg_cost_price"] = round((it["cogs"] / it_units), 2) if it_units > 0 else 0.0
            it["revenue"] = round(it_rev, 2)
            it["cogs"] = round(it["cogs"], 2)
            it["profit"] = round(it_prof, 2)
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
            "summary": summary,
            "timeline": timeline,
            "items_breakdown": items_breakdown,
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

            else:
                error_response(self, "Endpoint not found", 404)

        except Exception as e:
            conn.rollback()
            error_response(self, str(e), 500)
        finally:
            conn.close()

def run_server(port=PORT):
    db.init_db()
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
