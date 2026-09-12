"""
test_suite.py - Comprehensive Unit, Integration & Calculation Tests for
Multi-Batch Inventory, Lowest-Cost-First Sales Billing & Granular Analytics.
"""

import unittest
import sqlite3
import os
import json
import tempfile
import threading
import socketserver
import urllib.request
import urllib.error
import db
import server
from datetime import datetime

class TestMultiBatchInventoryAndSales(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.test_db_fd, cls.test_db_path = tempfile.mkstemp(suffix=".db")
        db.DB_FILE = cls.test_db_path
        db.init_db()

    @classmethod
    def tearDownClass(cls):
        os.close(cls.test_db_fd)
        if os.path.exists(cls.test_db_path):
            os.remove(cls.test_db_path)

    def setUp(self):
        self.conn = db.get_connection()
        self.cur = self.conn.cursor()

    def tearDown(self):
        self.conn.close()

    def test_01_seed_data_integrity(self):
        """Verify seeded products, customers, and active lots."""
        self.cur.execute("SELECT COUNT(*) as count FROM products")
        self.assertGreater(self.cur.fetchone()["count"], 0)

        self.cur.execute("SELECT COUNT(*) as count FROM customers")
        self.assertGreater(self.cur.fetchone()["count"], 0)

        self.cur.execute("SELECT COUNT(*) as count FROM inventory_lots WHERE remaining_qty > 0")
        self.assertGreater(self.cur.fetchone()["count"], 0)

    def test_02_procurement_creation_multi_source(self):
        """Test creating procurements from different sources and prices."""
        self.cur.execute("INSERT INTO products (name, sku, category, unit, min_stock) VALUES (?, ?, ?, ?, ?)",
                         ("Test Smartwatch", "TST-WAT-99", "Wearables", "pcs", 5))
        prod_id = self.cur.lastrowid
        self.conn.commit()

        # Batch 1: Wholesale Shop @ $50.00 (Qty: 10)
        res1, status1 = server.execute_procurement(self.conn, self.cur, {
            "invoice_no": "TEST-PROC-01",
            "source": "Wholesale Shop",
            "procurement_date": "2026-09-01",
            "items": [{"product_id": prod_id, "qty": 10, "unit_cost": 50.00, "batch_code": "LOT-TST-01"}]
        })
        self.assertEqual(status1, 201)
        self.assertTrue(res1["success"])

        # Batch 2: Quick Commerce @ $65.00 (Qty: 5)
        res2, status2 = server.execute_procurement(self.conn, self.cur, {
            "invoice_no": "TEST-PROC-02",
            "source": "Quick Commerce",
            "procurement_date": "2026-09-05",
            "items": [{"product_id": prod_id, "qty": 5, "unit_cost": 65.00, "batch_code": "LOT-TST-02"}]
        })
        self.assertEqual(status2, 201)

        # Batch 3: E-Commerce Flash Sale @ $45.00 (Qty: 8) - Lowest Cost!
        res3, status3 = server.execute_procurement(self.conn, self.cur, {
            "invoice_no": "TEST-PROC-03",
            "source": "E-Commerce",
            "procurement_date": "2026-09-10",
            "items": [{"product_id": prod_id, "qty": 8, "unit_cost": 45.00, "batch_code": "LOT-TST-03"}]
        })
        self.assertEqual(status3, 201)

        # Total stock should be 10 + 5 + 8 = 23
        self.cur.execute("SELECT SUM(remaining_qty) as total FROM inventory_lots WHERE product_id = ?", (prod_id,))
        self.assertEqual(self.cur.fetchone()["total"], 23)

    def test_03_lowest_cost_first_allocation(self):
        """Test that selling automatically draws from the cheapest lot first."""
        self.cur.execute("SELECT id FROM products WHERE sku = 'TST-WAT-99'")
        prod_id = self.cur.fetchone()["id"]

        # Simulate sale of 5 units @ $80.00
        sim_res, sim_status = server.simulate_sale(self.cur, {
            "items": [{"product_id": prod_id, "qty": 5, "unit_sale_price": 80.00, "allocation_mode": "AUTO"}]
        })
        self.assertEqual(sim_status, 200)
        self.assertEqual(len(sim_res["items"][0]["allocated_lots"]), 1)
        # Verify it chose the $45 lot (LOT-TST-03)
        self.assertEqual(sim_res["items"][0]["allocated_lots"][0]["unit_cost"], 45.00)
        self.assertEqual(sim_res["items"][0]["allocated_lots"][0]["qty"], 5)
        self.assertEqual(sim_res["summary"]["total_cogs"], 225.00)
        self.assertEqual(sim_res["summary"]["total_profit"], 175.00)

        # Execute Sale of 5 units @ $80.00
        sale_res, sale_status = server.execute_sale(self.conn, self.cur, {
            "invoice_no": "TEST-INV-01",
            "customer_id": 1,
            "sale_date": "2026-09-11",
            "items": [{"product_id": prod_id, "qty": 5, "unit_sale_price": 80.00, "allocation_mode": "AUTO"}]
        })
        self.assertEqual(sale_status, 201)
        self.assertEqual(sale_res["total_amount"], 400.00)
        self.assertEqual(sale_res["total_cogs"], 225.00)
        self.assertEqual(sale_res["total_profit"], 175.00)

        # Verify LOT-TST-03 remaining qty is now 8 - 5 = 3
        self.cur.execute("SELECT remaining_qty FROM inventory_lots WHERE batch_code = 'LOT-TST-03'")
        self.assertEqual(self.cur.fetchone()["remaining_qty"], 3)

    def test_04_split_batch_lowest_cost_allocation(self):
        """Test that selling more than cheapest batch remaining automatically splits to next cheapest."""
        self.cur.execute("SELECT id FROM products WHERE sku = 'TST-WAT-99'")
        prod_id = self.cur.fetchone()["id"]

        # Current remaining:
        # LOT-TST-03 @ $45.00: 3 remaining
        # LOT-TST-01 @ $50.00: 10 remaining
        # LOT-TST-02 @ $65.00: 5 remaining
        #
        # Selling 7 units @ $90.00:
        # 3 units from LOT-TST-03 @ $45.00 = $135.00
        # 4 units from LOT-TST-01 @ $50.00 = $200.00
        # Total COGS = $335.00
        # Total Revenue = 7 * $90.00 = $630.00
        # Net Profit = $630.00 - $335.00 = $295.00

        sale_res, sale_status = server.execute_sale(self.conn, self.cur, {
            "invoice_no": "TEST-INV-02",
            "customer_id": 1,
            "sale_date": "2026-09-11",
            "items": [{"product_id": prod_id, "qty": 7, "unit_sale_price": 90.00, "allocation_mode": "AUTO"}]
        })
        self.assertEqual(sale_status, 201)
        self.assertEqual(sale_res["total_amount"], 630.00)
        self.assertEqual(sale_res["total_cogs"], 335.00)
        self.assertEqual(sale_res["total_profit"], 295.00)

        # Verify LOT-TST-03 is now 0 (depleted)
        self.cur.execute("SELECT remaining_qty, status FROM inventory_lots WHERE batch_code = 'LOT-TST-03'")
        lot3 = self.cur.fetchone()
        self.assertEqual(lot3["remaining_qty"], 0)
        self.assertEqual(lot3["status"], "depleted")

        # Verify LOT-TST-01 is now 10 - 4 = 6 remaining
        self.cur.execute("SELECT remaining_qty FROM inventory_lots WHERE batch_code = 'LOT-TST-01'")
        self.assertEqual(self.cur.fetchone()["remaining_qty"], 6)

    def test_05_manual_lot_selection_override(self):
        """Test manually choosing to bill from a higher-cost lot (e.g. $65 lot instead of $50 lot)."""
        self.cur.execute("SELECT id FROM products WHERE sku = 'TST-WAT-99'")
        prod_id = self.cur.fetchone()["id"]

        # Current remaining:
        # LOT-TST-01 @ $50.00: 6 remaining
        # LOT-TST-02 @ $65.00: 5 remaining
        #
        # User explicitly chooses to bill 2 units from LOT-TST-02 @ $65.00
        self.cur.execute("SELECT id FROM inventory_lots WHERE batch_code = 'LOT-TST-02'")
        lot2_id = self.cur.fetchone()["id"]

        sale_req = {
            "customer_id": 1,
            "sale_date": "2026-09-11",
            "invoice_no": "TEST-INV-03-MANUAL",
            "notes": "Manual batch override test",
            "items": [{
                "product_id": prod_id,
                "qty": 2,
                "unit_sale_price": 100.00,
                "allocation_mode": "MANUAL",
                "manual_lots": [{"lot_id": lot2_id, "qty": 2}]
            }]
        }

        sale_res, sale_status = server.execute_sale(self.conn, self.cur, sale_req)
        self.assertEqual(sale_status, 201)
        self.assertEqual(sale_res["total_amount"], 200.00)
        self.assertEqual(sale_res["total_cogs"], 130.00) # 2 * 65.00
        self.assertEqual(sale_res["total_profit"], 70.00)

        # Check LOT-TST-02 remaining is now 5 - 2 = 3
        self.cur.execute("SELECT remaining_qty FROM inventory_lots WHERE id = ?", (lot2_id,))
        self.assertEqual(self.cur.fetchone()["remaining_qty"], 3)

        # Verify LOT-TST-01 was UNTOUCHED (still 6)
        self.cur.execute("SELECT remaining_qty FROM inventory_lots WHERE batch_code = 'LOT-TST-01'")
        self.assertEqual(self.cur.fetchone()["remaining_qty"], 6)

    def test_06_insufficient_stock_rejection(self):
        """Test that asking for more stock than available rejects cleanly with 400 error."""
        self.cur.execute("SELECT id FROM products WHERE sku = 'TST-WAT-99'")
        prod_id = self.cur.fetchone()["id"]

        # Total remaining for smartwatch is 6 + 3 = 9. Trying to sell 15 must fail.
        sale_req = {
            "customer_id": 1,
            "sale_date": "2026-09-11",
            "items": [{
                "product_id": prod_id,
                "qty": 15,
                "unit_sale_price": 100.00,
                "allocation_mode": "AUTO"
            }]
        }

        res, status = server.execute_sale(self.conn, self.cur, sale_req)
        self.assertEqual(status, 400)
        self.assertFalse(res["success"])
        self.assertIn("Insufficient stock", res["error"])

    def test_07_granular_analytics_math(self):
        """Test granular analytics aggregations (day, month, year) match exact totals."""
        self.cur.execute("SELECT SUM(total_amount) as rev, SUM(total_cogs) as cogs, SUM(total_profit) as prof FROM sales")
        totals = self.cur.fetchone()

        self.cur.execute("""
            SELECT 
                strftime('%Y-%m', sale_date) as time_bucket,
                SUM(total_amount) as revenue,
                SUM(total_cogs) as cogs,
                SUM(total_profit) as profit
            FROM sales
            GROUP BY time_bucket
        """)
        monthly = self.cur.fetchall()
        month_rev_sum = sum(m["revenue"] for m in monthly)
        month_prof_sum = sum(m["profit"] for m in monthly)

        self.assertAlmostEqual(totals["rev"], month_rev_sum, places=2)
        self.assertAlmostEqual(totals["prof"], month_prof_sum, places=2)

    def test_08_exact_depletion_to_zero_and_status_update(self):
        """Test depleting inventory lot to exactly 0 sets status to 'depleted' and blocks further sales."""
        self.cur.execute("INSERT INTO products (name, sku, category, unit, min_stock) VALUES (?, ?, ?, ?, ?)",
                         ("Zero Depletion Gadget", "TST-ZERO-01", "Gadgets", "pcs", 1))
        prod_id = self.cur.lastrowid
        self.conn.commit()

        # Procure exactly 4 units
        res_p, st_p = server.execute_procurement(self.conn, self.cur, {
            "source": "Wholesale Shop",
            "items": [{"product_id": prod_id, "qty": 4, "unit_cost": 25.00, "batch_code": "LOT-ZERO-01"}]
        })
        self.assertEqual(st_p, 201)

        # Over-allocation check: Sell 5 units (must fail cleanly, no changes)
        res_fail, st_fail = server.execute_sale(self.conn, self.cur, {
            "customer_id": 1,
            "items": [{"product_id": prod_id, "qty": 5, "unit_sale_price": 50.00, "allocation_mode": "AUTO"}]
        })
        self.assertEqual(st_fail, 400)
        self.assertIn("Insufficient stock", res_fail["error"])

        # Check lot is still active with 4 units
        self.cur.execute("SELECT remaining_qty, status FROM inventory_lots WHERE batch_code = 'LOT-ZERO-01'")
        lot_before = self.cur.fetchone()
        self.assertEqual(lot_before["remaining_qty"], 4)
        self.assertEqual(lot_before["status"], "active")

        # Deplete exactly 4 units
        res_dep, st_dep = server.execute_sale(self.conn, self.cur, {
            "customer_id": 1,
            "items": [{"product_id": prod_id, "qty": 4, "unit_sale_price": 50.00, "allocation_mode": "AUTO"}]
        })
        self.assertEqual(st_dep, 201)

        # Lot must now have 0 remaining and status 'depleted'
        self.cur.execute("SELECT remaining_qty, status FROM inventory_lots WHERE batch_code = 'LOT-ZERO-01'")
        lot_after = self.cur.fetchone()
        self.assertEqual(lot_after["remaining_qty"], 0)
        self.assertEqual(lot_after["status"], "depleted")

        # Subsequent sale of even 1 unit must fail
        res_after, st_after = server.execute_sale(self.conn, self.cur, {
            "customer_id": 1,
            "items": [{"product_id": prod_id, "qty": 1, "unit_sale_price": 50.00, "allocation_mode": "AUTO"}]
        })
        self.assertEqual(st_after, 400)
        self.assertIn("Insufficient stock", res_after["error"])

    def test_09_invalid_input_validation(self):
        """Test input rejection for negative price, zero qty, empty items, and manual mismatch."""
        # 1. Procurement invalid source
        res, st = server.execute_procurement(self.conn, self.cur, {
            "source": "",
            "items": [{"product_id": 1, "qty": 5, "unit_cost": 10.00}]
        })
        self.assertEqual(st, 400)
        self.assertIn("source is required", res["error"])

        # 2. Procurement zero/negative qty
        res, st = server.execute_procurement(self.conn, self.cur, {
            "source": "Wholesale Shop",
            "items": [{"product_id": 1, "qty": 0, "unit_cost": 10.00}]
        })
        self.assertEqual(st, 400)
        self.assertIn("Quantity must be > 0", res["error"])

        # 3. Procurement negative unit cost
        res, st = server.execute_procurement(self.conn, self.cur, {
            "source": "Wholesale Shop",
            "items": [{"product_id": 1, "qty": 5, "unit_cost": -5.00}]
        })
        self.assertEqual(st, 400)
        self.assertIn("unit cost >= 0", res["error"])

        # 4. Sale empty items
        res, st = server.execute_sale(self.conn, self.cur, {"items": []})
        self.assertEqual(st, 400)
        self.assertIn("At least one item is required", res["error"])

        # 5. Sale negative price
        res, st = server.execute_sale(self.conn, self.cur, {
            "items": [{"product_id": 1, "qty": 1, "unit_sale_price": -10.00, "allocation_mode": "AUTO"}]
        })
        self.assertEqual(st, 400)
        self.assertIn("Invalid quantity or price", res["error"])

        # 6. Simulation non-existent product
        res, st = server.simulate_sale(self.cur, {
            "items": [{"product_id": 999999, "qty": 1, "unit_sale_price": 20.00}]
        })
        self.assertEqual(st, 404)
        self.assertIn("not found", res["error"])

        # 7. Simulation manual lot mismatch
        res, st = server.simulate_sale(self.cur, {
            "items": [{
                "product_id": 1,
                "qty": 5,
                "unit_sale_price": 20.00,
                "allocation_mode": "MANUAL",
                "manual_lots": [{"lot_id": 1, "qty": 2}]
            }]
        })
        self.assertEqual(st, 400)
        self.assertIn("does not match", res["error"])

    def test_10_atomic_transaction_rollback_on_partial_failure(self):
        """Test multi-item sale atomic rollback: shortage on item 2 does not deduct item 1."""
        self.cur.execute("INSERT INTO products (name, sku, category) VALUES ('Item A Rollback', 'SKU-ROLL-A', 'Test')")
        id_a = self.cur.lastrowid
        self.cur.execute("INSERT INTO products (name, sku, category) VALUES ('Item B Rollback', 'SKU-ROLL-B', 'Test')")
        id_b = self.cur.lastrowid
        self.conn.commit()

        # Procure 10 of A, 2 of B
        server.execute_procurement(self.conn, self.cur, {
            "source": "Wholesale Shop",
            "items": [
                {"product_id": id_a, "qty": 10, "unit_cost": 10.00, "batch_code": "LOT-RA-1"},
                {"product_id": id_b, "qty": 2, "unit_cost": 20.00, "batch_code": "LOT-RB-1"}
            ]
        })

        self.cur.execute("SELECT COUNT(*) as count FROM sales")
        sales_count_before = self.cur.fetchone()["count"]

        # Attempt multi-item sale: 5 of A (available), 5 of B (only 2 available -> fails!)
        res, st = server.execute_sale(self.conn, self.cur, {
            "customer_id": 1,
            "items": [
                {"product_id": id_a, "qty": 5, "unit_sale_price": 25.00, "allocation_mode": "AUTO"},
                {"product_id": id_b, "qty": 5, "unit_sale_price": 45.00, "allocation_mode": "AUTO"}
            ]
        })
        self.assertEqual(st, 400)
        self.assertIn("Insufficient stock", res["error"])

        # Verify rollback: Item A stock is STILL 10
        self.cur.execute("SELECT remaining_qty FROM inventory_lots WHERE batch_code = 'LOT-RA-1'")
        self.assertEqual(self.cur.fetchone()["remaining_qty"], 10)

        # Verify no partial sale was committed
        self.cur.execute("SELECT COUNT(*) as count FROM sales")
        self.assertEqual(self.cur.fetchone()["count"], sales_count_before)

    def test_11_decimal_pricing_margin_precision(self):
        """Test floating-point arithmetic precision in procurement, sale, and margin calculation."""
        self.cur.execute("INSERT INTO products (name, sku, category) VALUES ('Precision Dongle', 'SKU-DONG-01', 'Gadgets')")
        dong_id = self.cur.lastrowid
        self.conn.commit()

        # Cost: $12.35 * 3 = $37.05
        res_p, _ = server.execute_procurement(self.conn, self.cur, {
            "source": "E-Commerce",
            "items": [{"product_id": dong_id, "qty": 3, "unit_cost": 12.35, "batch_code": "LOT-DONG-01"}]
        })
        self.assertEqual(res_p["total_amount"], 37.05)

        # Sale: $19.99 * 3 = $59.97, COGS = $37.05, Profit = $22.92, Margin = 38.2%
        res_s, st_s = server.execute_sale(self.conn, self.cur, {
            "customer_id": 1,
            "items": [{"product_id": dong_id, "qty": 3, "unit_sale_price": 19.99, "allocation_mode": "AUTO"}]
        })
        self.assertEqual(st_s, 201)
        self.assertEqual(res_s["total_amount"], 59.97)
        self.assertEqual(res_s["total_cogs"], 37.05)
        self.assertEqual(res_s["total_profit"], 22.92)
        expected_margin = round((22.92 / 59.97) * 100, 1)
        self.assertEqual(res_s["margin_pct"], expected_margin)

    def test_12_all_rest_routes_integrity(self):
        """Test that all database queries underlying all REST routes execute correctly."""
        # 1. GET /api/products query
        self.cur.execute("""
            SELECT p.*, 
                   COALESCE(SUM(l.remaining_qty), 0) as total_stock,
                   COUNT(CASE WHEN l.remaining_qty > 0 THEN 1 END) as active_lots_count
            FROM products p
            LEFT JOIN inventory_lots l ON p.id = l.product_id AND l.remaining_qty > 0
            GROUP BY p.id
            ORDER BY p.name ASC
        """)
        products = [dict(r) for r in self.cur.fetchall()]
        self.assertGreater(len(products), 0)

        # 2. GET /api/customers query
        self.cur.execute("SELECT * FROM customers ORDER BY name ASC")
        customers = [dict(r) for r in self.cur.fetchall()]
        self.assertGreater(len(customers), 0)

        # 3. GET /api/inventory query
        self.cur.execute("""
            SELECT p.id, p.name, p.sku, p.category, p.unit, p.min_stock,
                   COALESCE(SUM(l.remaining_qty), 0) as total_stock,
                   COALESCE(SUM(l.remaining_qty * l.unit_cost), 0.0) as total_valuation
            FROM products p
            LEFT JOIN inventory_lots l ON p.id = l.product_id AND l.remaining_qty > 0
            GROUP BY p.id
            ORDER BY p.name ASC
        """)
        inv = [dict(r) for r in self.cur.fetchall()]
        self.assertGreater(len(inv), 0)

        # 4. GET /api/procurements query
        self.cur.execute("""
            SELECT p.*, (SELECT COUNT(*) FROM inventory_lots l WHERE l.procurement_id = p.id) as items_count
            FROM procurements p
            ORDER BY p.procurement_date DESC, p.id DESC
        """)
        procs = [dict(r) for r in self.cur.fetchall()]
        self.assertGreater(len(procs), 0)

        # 5. GET /api/sales and /api/sales/:id query
        self.cur.execute("SELECT id FROM sales LIMIT 1")
        sale_row = self.cur.fetchone()
        if sale_row:
            sale_id = sale_row["id"]
            self.cur.execute("SELECT * FROM sales WHERE id = ?", (sale_id,))
            self.assertIsNotNone(self.cur.fetchone())
            self.cur.execute("SELECT * FROM sale_items WHERE sale_id = ?", (sale_id,))
            self.assertGreater(len(self.cur.fetchall()), 0)

        # 6. GET /api/analytics queries across day, week, month, year
        for gran in ["day", "week", "month", "year"]:
            if gran == "day":
                date_group = "strftime('%Y-%m-%d', s.sale_date)"
            elif gran == "week":
                date_group = "strftime('%Y-W%W', s.sale_date)"
            elif gran == "year":
                date_group = "strftime('%Y', s.sale_date)"
            else:
                date_group = "strftime('%Y-%m', s.sale_date)"

            self.cur.execute(f"""
                SELECT 
                    {date_group} as time_bucket,
                    COALESCE(COUNT(DISTINCT s.id), 0) as orders_count,
                    COALESCE(SUM(s.total_amount), 0.0) as revenue,
                    COALESCE(SUM(s.total_cogs), 0.0) as cogs,
                    COALESCE(SUM(s.total_profit), 0.0) as profit,
                    COALESCE(SUM(si.qty), 0.0) as units_sold
                FROM sales s
                LEFT JOIN sale_items si ON s.id = si.sale_id
                WHERE 1=1
                GROUP BY time_bucket
                ORDER BY time_bucket ASC
            """)
            rows = self.cur.fetchall()
            self.assertIsNotNone(rows)

class TestLiveHTTPServerE2E(unittest.TestCase):
    """End-to-End network tests against a running live HTTP server instance."""
    @classmethod
    def setUpClass(cls):
        cls.test_db_fd, cls.test_db_path = tempfile.mkstemp(suffix=".db")
        db.DB_FILE = cls.test_db_path
        db.init_db()

        cls.httpd = socketserver.ThreadingTCPServer(("127.0.0.1", 0), server.InventorySalesRequestHandler)
        cls.port = cls.httpd.server_address[1]
        cls.base_url = f"http://127.0.0.1:{cls.port}"

        cls.server_thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.server_thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()
        os.close(cls.test_db_fd)
        if os.path.exists(cls.test_db_path):
            os.remove(cls.test_db_path)

    def _http_get(self, path):
        req = urllib.request.Request(f"{self.base_url}{path}")
        try:
            with urllib.request.urlopen(req) as resp:
                return resp.status, dict(resp.headers), resp.read().decode("utf-8")
        except urllib.error.HTTPError as e:
            return e.code, dict(e.headers), e.read().decode("utf-8")

    def _http_post(self, path, payload):
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(f"{self.base_url}{path}", data=data, headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req) as resp:
                return resp.status, dict(resp.headers), json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            return e.code, dict(e.headers), json.loads(e.read().decode("utf-8"))

    def test_e2e_01_static_index_html(self):
        status, headers, body = self._http_get("/")
        self.assertEqual(status, 200)
        self.assertIn("text/html", headers.get("Content-Type", ""))
        self.assertIn("Apex Inventory & Sales", body)

    def test_e2e_02_static_app_jsx(self):
        status, headers, body = self._http_get("/static/app.jsx")
        self.assertEqual(status, 200)
        self.assertIn("application/javascript", headers.get("Content-Type", ""))
        self.assertIn("ReactDOM.createRoot", body)
        self.assertIn("CatalogueView", body)
        self.assertIn("ProductModal", body)

        # Lexical validation: balanced braces and parens
        self.assertEqual(body.count("{"), body.count("}"), "Unbalanced curly braces in static/app.jsx")
        self.assertEqual(body.count("("), body.count(")"), "Unbalanced parentheses in static/app.jsx")
        self.assertEqual(body.count("["), body.count("]"), "Unbalanced square brackets in static/app.jsx")

        # Verify ProductModal has no duplicate function or duplicate state declarations
        prod_modal_idx = body.find("function ProductModal")
        self.assertNotEqual(prod_modal_idx, -1)
        next_fn_idx = body.find("function CustomerModal", prod_modal_idx)
        prod_modal_body = body[prod_modal_idx:next_fn_idx]
        self.assertEqual(prod_modal_body.count("const [name, setName]"), 1, "Duplicate identifier in ProductModal")
        self.assertEqual(prod_modal_body.count("const [sku, setSku]"), 1, "Duplicate identifier in ProductModal")

    def test_e2e_03_cors_preflight(self):
        req = urllib.request.Request(f"{self.base_url}/api/products", method="OPTIONS")
        with urllib.request.urlopen(req) as resp:
            self.assertEqual(resp.status, 204)
            self.assertEqual(resp.headers.get("Access-Control-Allow-Origin"), "*")

    def test_e2e_04_products_api(self):
        # GET products
        status, _, body = self._http_get("/api/products")
        self.assertEqual(status, 200)
        data = json.loads(body)
        self.assertTrue(data["success"])
        self.assertIsInstance(data["products"], list)

        # POST invalid product (missing SKU)
        status, _, res = self._http_post("/api/products", {"name": "Test SKUless", "sku": ""})
        self.assertEqual(status, 400)
        self.assertFalse(res["success"])

        # POST valid product
        status, _, res = self._http_post("/api/products", {
            "name": "Live HTTP Headset",
            "sku": "LIVE-HEAD-01",
            "category": "Audio",
            "unit": "pcs",
            "min_stock": 2
        })
        self.assertEqual(status, 201)
        self.assertTrue(res["success"])

    def test_e2e_05_customers_api(self):
        # GET customers
        status, _, body = self._http_get("/api/customers")
        self.assertEqual(status, 200)
        data = json.loads(body)
        self.assertTrue(data["success"])

        # POST valid customer
        status, _, res = self._http_post("/api/customers", {
            "name": "Global Traders Inc",
            "phone": "+1-800-555-0100",
            "email": "procurement@globaltraders.com",
            "address": "400 Wall St, New York, NY"
        })
        self.assertEqual(status, 201)
        self.assertTrue(res["success"])

    def test_e2e_06_inventory_and_lots_api(self):
        # GET inventory
        status, _, body = self._http_get("/api/inventory")
        self.assertEqual(status, 200)
        data = json.loads(body)
        self.assertTrue(data["success"])
        self.assertIn("summary", data)
        self.assertIn("inventory", data)

        # GET lots without product_id -> 400
        status, _, body = self._http_get("/api/inventory/lots")
        self.assertEqual(status, 400)

        # GET lots with product_id -> 200
        status, _, body = self._http_get("/api/inventory/lots?product_id=1")
        self.assertEqual(status, 200)
        data = json.loads(body)
        self.assertTrue(data["success"])
        self.assertIsInstance(data["lots"], list)

    def test_e2e_07_procurements_api(self):
        # POST new procurement
        status, _, res = self._http_post("/api/procurements", {
            "source": "E-Commerce",
            "procurement_date": "2026-09-11",
            "items": [{"product_id": 1, "qty": 15, "unit_cost": 18.50, "batch_code": "LOT-LIVE-PROC"}]
        })
        self.assertEqual(status, 201)
        self.assertTrue(res["success"])

        # GET procurements
        status, _, body = self._http_get("/api/procurements")
        self.assertEqual(status, 200)
        data = json.loads(body)
        self.assertTrue(data["success"])
        self.assertGreater(len(data["procurements"]), 0)

    def test_e2e_08_sales_simulate_and_execute(self):
        # 1. Simulate sale
        status, _, sim = self._http_post("/api/sales/simulate", {
            "items": [{"product_id": 1, "qty": 3, "unit_sale_price": 35.00, "allocation_mode": "AUTO"}]
        })
        self.assertEqual(status, 200)
        self.assertTrue(sim["success"])
        self.assertEqual(len(sim["items"]), 1)
        self.assertGreater(sim["summary"]["total_profit"], 0)

        # 2. Execute sale
        status, _, sale = self._http_post("/api/sales", {
            "customer_id": 1,
            "sale_date": "2026-09-11",
            "notes": "Live HTTP E2E Test Sale",
            "items": [{"product_id": 1, "qty": 3, "unit_sale_price": 35.00, "allocation_mode": "AUTO"}]
        })
        self.assertEqual(status, 201)
        self.assertTrue(sale["success"])
        sale_id = sale["sale_id"]

        # 3. GET sale invoice details
        status, _, body = self._http_get(f"/api/sales/{sale_id}")
        self.assertEqual(status, 200)
        invoice = json.loads(body)
        self.assertTrue(invoice["success"])
        self.assertEqual(invoice["sale"]["id"], sale_id)
        self.assertEqual(len(invoice["sale"]["items"]), 1)
        self.assertGreater(len(invoice["sale"]["items"][0]["allocated_lots"]), 0)

        # 4. GET non-existent sale -> 404
        status, _, _ = self._http_get("/api/sales/999999")
        self.assertEqual(status, 404)

        # 5. GET invalid sale id -> 400
        status, _, _ = self._http_get("/api/sales/invalid-id")
        self.assertEqual(status, 400)

    def test_e2e_09_analytics_api_filters(self):
        for gran in ["day", "week", "month", "year"]:
            status, _, body = self._http_get(f"/api/analytics?granularity={gran}")
            self.assertEqual(status, 200)
            data = json.loads(body)
            self.assertTrue(data["success"])
            self.assertEqual(data["granularity"], gran)
            self.assertIn("summary", data)
            self.assertIn("timeline", data)
            self.assertIn("items_breakdown", data)
            self.assertIn("sources_breakdown", data)

        # Date range filter
        status, _, body = self._http_get("/api/analytics?from_date=2026-01-01&to_date=2026-12-31")
        self.assertEqual(status, 200)
        data = json.loads(body)
        self.assertTrue(data["success"])

    def test_e2e_10_multi_item_analytics_exactness(self):
        """Verify that analytics summary exactly equals sum of all line item totals without duplication."""
        status, _, body = self._http_get("/api/analytics?granularity=month")
        self.assertEqual(status, 200)
        data = json.loads(body)
        summary = data["summary"]

        # Calculate exact sum from DB directly
        conn = db.get_connection()
        cur = conn.cursor()
        cur.execute("SELECT SUM(total_sale_price) as rev, SUM(total_cost) as cogs, SUM(profit) as prof, SUM(qty) as q FROM sale_items")
        row = cur.fetchone()
        conn.close()

        self.assertAlmostEqual(summary["total_revenue"], round(row["rev"], 2), places=2)
        self.assertAlmostEqual(summary["total_cogs"], round(row["cogs"], 2), places=2)
        self.assertAlmostEqual(summary["total_profit"], round(row["prof"], 2), places=2)
        self.assertAlmostEqual(summary["total_units_sold"], row["q"], places=2)

    def test_e2e_11_cross_product_lot_rejection(self):
        """Verify that allocating Lot from Product A into Product B is rejected with 400."""
        # Find a lot for product 2
        conn = db.get_connection()
        cur = conn.cursor()
        cur.execute("SELECT id FROM inventory_lots WHERE product_id = 2 AND remaining_qty > 0 LIMIT 1")
        lot_prod_2 = cur.fetchone()["id"]
        conn.close()

        # Try to simulate sale for product 1 using lot from product 2
        status, _, sim = self._http_post("/api/sales/simulate", {
            "items": [{
                "product_id": 1,
                "qty": 1,
                "unit_sale_price": 25.00,
                "allocation_mode": "MANUAL",
                "manual_lots": [{"lot_id": lot_prod_2, "qty": 1}]
            }]
        })
        self.assertEqual(status, 400)
        self.assertFalse(sim["success"])

        # Try to execute sale for product 1 using lot from product 2
        status, _, sale = self._http_post("/api/sales", {
            "customer_id": 1,
            "sale_date": "2026-09-11",
            "items": [{
                "product_id": 1,
                "qty": 1,
                "unit_sale_price": 25.00,
                "allocation_mode": "MANUAL",
                "manual_lots": [{"lot_id": lot_prod_2, "qty": 1}]
            }]
        })
        self.assertEqual(status, 400)
        self.assertFalse(sale["success"])

    def test_e2e_12_accessibility_and_color_blind_support(self):
        """Verify that UI contains accessible light-blue palette, non-color-reliant indicators, and accessibility modal."""
        # 1. Verify index.html light-blue theme & brand definitions
        status, _, html_body = self._http_get("/")
        self.assertEqual(status, 200)
        self.assertIn("#f8fbff", html_body, "Ambient light-blue background missing from index.html")
        self.assertIn("#f0f9ff", html_body, "Brand-50 light-blue hex #f0f9ff missing from index.html")

        # 2. Verify static/app.jsx accessible badge components and modal
        status, _, app_body = self._http_get("/static/app.jsx")
        self.assertEqual(status, 200)
        self.assertIn("SourceBadge", app_body, "SourceBadge component missing")
        self.assertIn("StockBadge", app_body, "StockBadge component missing")
        self.assertIn("ProfitBadge", app_body, "ProfitBadge component missing")
        self.assertIn("function AccessibilityModal", app_body, "AccessibilityModal component missing")
        self.assertIn("Accessibility & Legend", app_body, "Accessibility header button missing")

        # 3. Verify redundant symbols for color-blind accessibility
        self.assertIn("checkCircle", app_body)
        self.assertIn("xCircle", app_body)
        self.assertIn("alert", app_body)

    def test_e2e_13_clear_data_api(self):
        """Verify POST /api/system/clear-data cleanly clears all application tables."""
        status, _, res = self._http_post("/api/system/clear-data", {})
        self.assertEqual(status, 200)
        self.assertTrue(res["success"])

        # Verify products, customers, and sales are now 0
        status, _, body = self._http_get("/api/products")
        self.assertEqual(status, 200)
        self.assertEqual(len(json.loads(body)["products"]), 0)

        status, _, body = self._http_get("/api/customers")
        self.assertEqual(status, 200)
        self.assertEqual(len(json.loads(body)["customers"]), 0)

        # Re-initialization does not re-seed when marked clean
        conn = db.get_connection()
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM products")
        self.assertEqual(cur.fetchone()[0], 0)
        conn.close()

    def test_e2e_14_pr001_foundation_and_drizzle_schema(self):
        """Automated verification of PR-001 schema files, Drizzle migration SQL, and solo migrator."""
        backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
        self.assertTrue(os.path.isdir(backend_dir), "backend directory must exist")

        # 1. Verify schema files
        schema_dir = os.path.join(backend_dir, "src", "db", "schema")
        expected_schema_files = [
            "users.ts", "categories.ts", "suppliers.ts", "customers.ts", "products.ts",
            "procurements.ts", "inventory_lots.ts", "sales.ts", "sale_items.ts",
            "sale_item_lots.ts", "relations.ts", "index.ts"
        ]
        for sfile in expected_schema_files:
            fpath = os.path.join(schema_dir, sfile)
            self.assertTrue(os.path.isfile(fpath), f"Schema file {sfile} must exist")

        # 2. Verify migration SQL file
        mig_dir = os.path.join(backend_dir, "drizzle", "migrations")
        self.assertTrue(os.path.isdir(mig_dir), "Migrations folder must exist")
        sql_files = [f for f in os.listdir(mig_dir) if f.endswith(".sql")]
        self.assertGreaterEqual(len(sql_files), 1, "At least one migration SQL file must exist")

        with open(os.path.join(mig_dir, sql_files[0]), "r", encoding="utf-8") as f:
            sql_content = f.read()

        expected_tables = [
            "users", "categories", "suppliers", "customers", "products",
            "procurements", "inventory_lots", "sales", "sale_items", "sale_item_lots"
        ]
        for tbl in expected_tables:
            self.assertIn(f'CREATE TABLE IF NOT EXISTS "{tbl}"', sql_content)

        # Verify composite indexes for lowest-cost-first allocation
        self.assertIn('CREATE INDEX IF NOT EXISTS "lot_product_cost_idx"', sql_content)
        self.assertIn('CREATE INDEX IF NOT EXISTS "lot_remaining_qty_idx"', sql_content)
        self.assertIn('CREATE INDEX IF NOT EXISTS "sales_date_idx"', sql_content)
        self.assertIn('CREATE INDEX IF NOT EXISTS "sales_customer_idx"', sql_content)

        # 3. Verify solo migrator
        migrator_file = os.path.join(backend_dir, "src", "db", "migrate.ts")
        self.assertTrue(os.path.isfile(migrator_file), "migrate.ts must exist")
        with open(migrator_file, "r", encoding="utf-8") as f:
            migrator_code = f.read()
        self.assertIn("vector", migrator_code)
        self.assertIn("pg_trgm", migrator_code)
        self.assertIn("migrate(db, { migrationsFolder:", migrator_code)

        # 4. Verify test file assertions completeness
        test_file = os.path.join(backend_dir, "tests", "schema_verification.test.ts")
        self.assertTrue(os.path.isfile(test_file), "schema_verification.test.ts must exist")
        with open(test_file, "r", encoding="utf-8") as f:
            test_code = f.read()

        test_count = test_code.count("test(")
        self.assertEqual(test_count, 12, "schema_verification.test.ts must contain exactly 12 test assertions")

    def test_e2e_15_pr002_google_sso_and_user_management(self):
        """Automated verification of PR-002 Google SSO Auth & User Management modules and tests."""
        backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")

        # 1. Verify Auth and Users modules files exist
        auth_dir = os.path.join(backend_dir, "src", "modules", "auth")
        self.assertTrue(os.path.isdir(auth_dir), "auth module directory must exist")
        expected_auth_files = [
            "auth.controller.ts", "auth.service.ts", "auth.module.ts",
            "jwt.strategy.ts", "jwt-auth.guard.ts", "roles.decorator.ts", "roles.guard.ts"
        ]
        for afile in expected_auth_files:
            self.assertTrue(os.path.isfile(os.path.join(auth_dir, afile)), f"Auth file {afile} must exist")

        users_dir = os.path.join(backend_dir, "src", "modules", "users")
        self.assertTrue(os.path.isdir(users_dir), "users module directory must exist")
        expected_users_files = ["users.controller.ts", "users.service.ts", "users.module.ts"]
        for ufile in expected_users_files:
            self.assertTrue(os.path.isfile(os.path.join(users_dir, ufile)), f"Users file {ufile} must exist")

        # 2. Verify AppModule imports AuthModule and UsersModule
        app_module_file = os.path.join(backend_dir, "src", "app.module.ts")
        self.assertTrue(os.path.isfile(app_module_file))
        with open(app_module_file, "r", encoding="utf-8") as f:
            app_module_code = f.read()
        self.assertIn("AuthModule", app_module_code)
        self.assertIn("UsersModule", app_module_code)

        # 3. Verify API route contracts in AuthController
        auth_ctrl_file = os.path.join(auth_dir, "auth.controller.ts")
        with open(auth_ctrl_file, "r", encoding="utf-8") as f:
            auth_ctrl_code = f.read()
        self.assertIn("@Post('google')", auth_ctrl_code)
        self.assertIn("@Post('dev-login')", auth_ctrl_code)
        self.assertIn("@Get('me')", auth_ctrl_code)
        self.assertIn("@Post('logout')", auth_ctrl_code)
        self.assertIn("JwtAuthGuard", auth_ctrl_code)

        # 4. Verify API route contracts in UsersController
        users_ctrl_file = os.path.join(users_dir, "users.controller.ts")
        with open(users_ctrl_file, "r", encoding="utf-8") as f:
            users_ctrl_code = f.read()
        self.assertIn("@Get()", users_ctrl_code)
        self.assertIn("@Patch(':id/role')", users_ctrl_code)
        self.assertIn("@Roles('admin')", users_ctrl_code)
        self.assertIn("RolesGuard", users_ctrl_code)

        # 5. Verify Jest test assertion counts (16 in auth.test.ts + 12 in schema_verification.test.ts = 28 total)
        auth_test_file = os.path.join(backend_dir, "tests", "auth.test.ts")
        self.assertTrue(os.path.isfile(auth_test_file), "auth.test.ts must exist")
        with open(auth_test_file, "r", encoding="utf-8") as f:
            auth_test_code = f.read()
        auth_assertions = auth_test_code.count("test(")
        self.assertEqual(auth_assertions, 16, "auth.test.ts must contain exactly 16 test assertions")

        schema_test_file = os.path.join(backend_dir, "tests", "schema_verification.test.ts")
        with open(schema_test_file, "r", encoding="utf-8") as f:
            schema_test_code = f.read()
        schema_assertions = schema_test_code.count("test(")
        self.assertEqual(schema_assertions, 12, "schema_verification.test.ts must contain exactly 12 test assertions")
        self.assertEqual(auth_assertions + schema_assertions, 28, "Total backend Jest test assertions must equal 28")

    def test_e2e_16_pr003_master_data_modules(self):
        """Automated verification of PR-003 Master Data modules (Customers, Suppliers, Categories) and tests."""
        backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")

        # 1. Verify module directories and files exist
        modules = {
            "customers": ["customers.controller.ts", "customers.service.ts", "customers.module.ts"],
            "suppliers": ["suppliers.controller.ts", "suppliers.service.ts", "suppliers.module.ts"],
            "categories": ["categories.controller.ts", "categories.service.ts", "categories.module.ts"],
        }
        for mod_name, files in modules.items():
            mod_dir = os.path.join(backend_dir, "src", "modules", mod_name)
            self.assertTrue(os.path.isdir(mod_dir), f"{mod_name} module directory must exist")
            for f in files:
                self.assertTrue(os.path.isfile(os.path.join(mod_dir, f)), f"{mod_name}/{f} must exist")

        # 2. Verify AppModule imports all 3 modules
        app_module_file = os.path.join(backend_dir, "src", "app.module.ts")
        with open(app_module_file, "r", encoding="utf-8") as f:
            app_code = f.read()
        self.assertIn("CustomersModule", app_code)
        self.assertIn("SuppliersModule", app_code)
        self.assertIn("CategoriesModule", app_code)

        # 3. Verify Customers route contracts
        with open(os.path.join(backend_dir, "src", "modules", "customers", "customers.controller.ts"), "r", encoding="utf-8") as f:
            cust_code = f.read()
        self.assertIn("@Get()", cust_code)
        self.assertIn("@Get(':id')", cust_code)
        self.assertIn("@Post()", cust_code)
        self.assertIn("@Put(':id')", cust_code)
        self.assertIn("@Delete(':id')", cust_code)

        # 4. Verify Suppliers route contracts
        with open(os.path.join(backend_dir, "src", "modules", "suppliers", "suppliers.controller.ts"), "r", encoding="utf-8") as f:
            sup_code = f.read()
        self.assertIn("@Get()", sup_code)
        self.assertIn("@Get(':id')", sup_code)
        self.assertIn("@Post()", sup_code)
        self.assertIn("@Put(':id')", sup_code)
        self.assertIn("@Delete(':id')", sup_code)

        # 5. Verify Categories route contracts
        with open(os.path.join(backend_dir, "src", "modules", "categories", "categories.controller.ts"), "r", encoding="utf-8") as f:
            cat_code = f.read()
        self.assertIn("@Get()", cat_code)
        self.assertIn("@Get('tree')", cat_code)
        self.assertIn("@Get(':id')", cat_code)
        self.assertIn("@Post()", cat_code)
        self.assertIn("@Put(':id')", cat_code)
        self.assertIn("@Delete(':id')", cat_code)

        # 6. Verify Jest test assertion counts (19 in master_data.test.ts, 16 in auth.test.ts, 12 in schema_verification.test.ts = 47 total)
        master_test_file = os.path.join(backend_dir, "tests", "master_data.test.ts")
        self.assertTrue(os.path.isfile(master_test_file), "master_data.test.ts must exist")
        with open(master_test_file, "r", encoding="utf-8") as f:
            master_code = f.read()
        master_assertions = master_code.count("test(")
        self.assertEqual(master_assertions, 19, "master_data.test.ts must contain exactly 19 test assertions")

        auth_test_file = os.path.join(backend_dir, "tests", "auth.test.ts")
        with open(auth_test_file, "r", encoding="utf-8") as f:
            auth_assertions = f.read().count("test(")

        schema_test_file = os.path.join(backend_dir, "tests", "schema_verification.test.ts")
        with open(schema_test_file, "r", encoding="utf-8") as f:
            schema_assertions = f.read().count("test(")

        total_jest = master_assertions + auth_assertions + schema_assertions
        self.assertEqual(total_jest, 47, f"Total Jest assertions across 3 suites must equal 47, got {total_jest}")

    def test_e2e_17_pr004_products_discovery(self):
        """Automated verification of PR-004 Product Catalogue, pgvector & fuzzy discovery modules and tests."""
        backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")

        # 1. Verify module files exist
        products_dir = os.path.join(backend_dir, "src", "modules", "products")
        self.assertTrue(os.path.isdir(products_dir), "products module directory must exist")
        for f in ["products.controller.ts", "products.service.ts", "products.module.ts"]:
            self.assertTrue(os.path.isfile(os.path.join(products_dir, f)), f"products/{f} must exist")
        dto_dir = os.path.join(products_dir, "dto")
        self.assertTrue(os.path.isdir(dto_dir), "products/dto directory must exist")
        for f in ["create-product.dto.ts", "search-product.dto.ts"]:
            self.assertTrue(os.path.isfile(os.path.join(dto_dir, f)), f"products/dto/{f} must exist")

        # 2. Verify AppModule imports ProductsModule
        app_module_file = os.path.join(backend_dir, "src", "app.module.ts")
        with open(app_module_file, "r", encoding="utf-8") as f:
            app_code = f.read()
        self.assertIn("ProductsModule", app_code)

        # 3. Verify Products route contracts
        with open(os.path.join(products_dir, "products.controller.ts"), "r", encoding="utf-8") as f:
            prod_code = f.read()
        self.assertIn("@Get()", prod_code)
        self.assertIn("@Get('search')", prod_code)
        self.assertIn("@Post('semantic-search')", prod_code)
        self.assertIn("@Get(':id')", prod_code)
        self.assertIn("@Post()", prod_code)
        self.assertIn("@Put(':id')", prod_code)
        self.assertIn("@Delete(':id')", prod_code)
        self.assertIn("JwtAuthGuard", prod_code)

        # 4. Verify Jest test assertion counts (14 in products_discovery.test.ts = 61 total across 4 suites)
        prod_test_file = os.path.join(backend_dir, "tests", "products_discovery.test.ts")
        self.assertTrue(os.path.isfile(prod_test_file), "products_discovery.test.ts must exist")
        with open(prod_test_file, "r", encoding="utf-8") as f:
            prod_test_code = f.read()
        prod_assertions = prod_test_code.count("test(")
        self.assertEqual(prod_assertions, 14, "products_discovery.test.ts must contain exactly 14 test assertions")

        master_test_file = os.path.join(backend_dir, "tests", "master_data.test.ts")
        with open(master_test_file, "r", encoding="utf-8") as f:
            master_assertions = f.read().count("test(")

        auth_test_file = os.path.join(backend_dir, "tests", "auth.test.ts")
        with open(auth_test_file, "r", encoding="utf-8") as f:
            auth_assertions = f.read().count("test(")

        schema_test_file = os.path.join(backend_dir, "tests", "schema_verification.test.ts")
        with open(schema_test_file, "r", encoding="utf-8") as f:
            schema_assertions = f.read().count("test(")

        total_jest = prod_assertions + master_assertions + auth_assertions + schema_assertions
        self.assertEqual(total_jest, 61, f"Total Jest assertions across 4 suites must equal 61, got {total_jest}")

        # 5. Verify ProductsService business logic methods & contracts
        with open(os.path.join(products_dir, "products.service.ts"), "r", encoding="utf-8") as f:
            serv_code = f.read()
        self.assertIn("async create(dto: CreateProductDto)", serv_code)
        self.assertIn("async findAll(query?: SearchProductQueryDto)", serv_code)
        self.assertIn("async findById(id: number)", serv_code)
        self.assertIn("async update(id: number, dto: UpdateProductDto)", serv_code)
        self.assertIn("async delete(id: number)", serv_code)
        self.assertIn("async fuzzySearch(searchQuery: string)", serv_code)
        self.assertIn("async semanticSearch(dto: SemanticSearchDto)", serv_code)
        self.assertIn("'In Stock'", serv_code)
        self.assertIn("'Low Stock'", serv_code)
        self.assertIn("'Out of Stock'", serv_code)

        # 6. Verify routing precedence in ProductsController: @Get('search') before @Get(':id')
        search_idx = prod_code.find("@Get('search')")
        param_idx = prod_code.find("@Get(':id')")
        self.assertTrue(search_idx < param_idx, "@Get('search') must precede @Get(':id') to prevent route collision")

        # 7. Verify TypeScript build artifact cleanliness
        tsbuildinfo = os.path.join(backend_dir, "dist", "tsconfig.tsbuildinfo")
        self.assertTrue(os.path.isfile(tsbuildinfo), "TypeScript buildinfo must exist")
        self.assertGreater(os.path.getsize(tsbuildinfo), 100000, "TypeScript buildinfo must be non-trivial (>100KB)")

if __name__ == "__main__":
    unittest.main(verbosity=1)

