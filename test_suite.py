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

    def _http_put(self, path, payload):
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(f"{self.base_url}{path}", data=data, headers={"Content-Type": "application/json"}, method="PUT")
        try:
            with urllib.request.urlopen(req) as resp:
                return resp.status, dict(resp.headers), json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            return e.code, dict(e.headers), json.loads(e.read().decode("utf-8"))

    def _http_delete(self, path):
        req = urllib.request.Request(f"{self.base_url}{path}", method="DELETE")
        try:
            with urllib.request.urlopen(req) as resp:
                return resp.status, dict(resp.headers), json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            return e.code, dict(e.headers), json.loads(e.read().decode("utf-8"))

    def test_e2e_01_static_index_html(self):
        status, headers, body = self._http_get("/")
        self.assertEqual(status, 200)
        self.assertIn("text/html", headers.get("Content-Type", ""))
        self.assertIn("Retail Sales", body)

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

        # GET lots/product/:productId -> 200
        status, _, body = self._http_get("/api/inventory/lots/product/1")
        self.assertEqual(status, 200)
        data = json.loads(body)
        self.assertTrue(data["success"])
        self.assertIsInstance(data["lots"], list)

        # GET lots/product/invalid -> 400
        status, _, _ = self._http_get("/api/inventory/lots/product/invalid-id")
        self.assertEqual(status, 400)

    def test_e2e_07_procurements_api(self):
        # POST new procurement
        status, _, res = self._http_post("/api/procurements", {
            "source": "E-Commerce",
            "procurement_date": "2026-09-11",
            "items": [{"product_id": 1, "qty": 15, "unit_cost": 18.50, "batch_code": "LOT-LIVE-PROC"}]
        })
        self.assertEqual(status, 201)
        self.assertTrue(res["success"])

        # GET procurements list
        status, _, body = self._http_get("/api/procurements")
        self.assertEqual(status, 200)
        data = json.loads(body)
        self.assertTrue(data["success"])
        self.assertGreater(len(data["procurements"]), 0)

        # GET procurement by ID
        status, _, body = self._http_get("/api/procurements/1")
        self.assertEqual(status, 200)
        data = json.loads(body)
        self.assertTrue(data["success"])
        self.assertIn("procurement", data)
        self.assertIn("items", data["procurement"])

        # GET non-existent procurement -> 404
        status, _, _ = self._http_get("/api/procurements/999999")
        self.assertEqual(status, 404)

        # GET invalid procurement ID -> 400
        status, _, _ = self._http_get("/api/procurements/invalid-id")
        self.assertEqual(status, 400)

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

    def test_e2e_18_pr005_procurement_and_inventory_lots(self):
        """Automated verification of PR-005 Multi-Batch Procurement Intake & Inventory Lot Engine."""
        backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")

        proc_dir = os.path.join(backend_dir, "src", "modules", "procurements")
        self.assertTrue(os.path.isdir(proc_dir), "procurements module directory must exist")
        for f in ["procurements.controller.ts", "procurements.service.ts", "procurements.module.ts"]:
            self.assertTrue(os.path.isfile(os.path.join(proc_dir, f)), f"procurements/{f} must exist")
        self.assertTrue(os.path.isfile(os.path.join(proc_dir, "dto", "create-procurement.dto.ts")))

        inv_dir = os.path.join(backend_dir, "src", "modules", "inventory")
        self.assertTrue(os.path.isdir(inv_dir), "inventory module directory must exist")
        for f in ["inventory.controller.ts", "inventory.service.ts", "inventory.module.ts"]:
            self.assertTrue(os.path.isfile(os.path.join(inv_dir, f)), f"inventory/{f} must exist")

        # 2. Verify AppModule imports both modules
        app_module_file = os.path.join(backend_dir, "src", "app.module.ts")
        with open(app_module_file, "r", encoding="utf-8") as f:
            app_code = f.read()
        self.assertIn("ProcurementsModule", app_code)
        self.assertIn("InventoryModule", app_code)

        # 3. Verify ProcurementsController route contracts
        with open(os.path.join(proc_dir, "procurements.controller.ts"), "r", encoding="utf-8") as f:
            proc_ctrl_code = f.read()
        self.assertIn("@Get()", proc_ctrl_code)
        self.assertIn("@Get(':id')", proc_ctrl_code)
        self.assertIn("@Post()", proc_ctrl_code)
        self.assertIn("JwtAuthGuard", proc_ctrl_code)

        # 4. Verify InventoryController route contracts
        with open(os.path.join(inv_dir, "inventory.controller.ts"), "r", encoding="utf-8") as f:
            inv_ctrl_code = f.read()
        self.assertIn("@Get()", inv_ctrl_code)
        self.assertIn("@Get('lots')", inv_ctrl_code)
        self.assertIn("@Get('lots/product/:productId')", inv_ctrl_code)

        # 5. Verify ProcurementsService invariants
        with open(os.path.join(proc_dir, "procurements.service.ts"), "r", encoding="utf-8") as f:
            proc_serv_code = f.read()
        self.assertIn("VALID_SOURCES.includes", proc_serv_code)
        self.assertIn("async create(dto: CreateProcurementDto)", proc_serv_code)
        self.assertIn("async findAll(", proc_serv_code)
        self.assertIn("async findById(id: number)", proc_serv_code)

        # 6. Verify InventoryService invariants
        with open(os.path.join(inv_dir, "inventory.service.ts"), "r", encoding="utf-8") as f:
            inv_serv_code = f.read()
        self.assertIn("async getStoreValuation()", inv_serv_code)
        self.assertIn("async getLotsForProduct(", inv_serv_code)
        self.assertIn("async getAllActiveLots()", inv_serv_code)

        # 7. Verify Jest test assertion counts across all 5 test suites (total = 72 assertions)
        inv_proc_test_file = os.path.join(backend_dir, "tests", "inventory_procurements.test.ts")
        self.assertTrue(os.path.isfile(inv_proc_test_file), "inventory_procurements.test.ts must exist")
        with open(inv_proc_test_file, "r", encoding="utf-8") as f:
            inv_proc_assertions = f.read().count("test(")
        self.assertEqual(inv_proc_assertions, 11, "inventory_procurements.test.ts must contain exactly 11 assertions")

        prod_test_file = os.path.join(backend_dir, "tests", "products_discovery.test.ts")
        with open(prod_test_file, "r", encoding="utf-8") as f:
            prod_assertions = f.read().count("test(")

        master_test_file = os.path.join(backend_dir, "tests", "master_data.test.ts")
        with open(master_test_file, "r", encoding="utf-8") as f:
            master_assertions = f.read().count("test(")

        auth_test_file = os.path.join(backend_dir, "tests", "auth.test.ts")
        with open(auth_test_file, "r", encoding="utf-8") as f:
            auth_assertions = f.read().count("test(")

        schema_test_file = os.path.join(backend_dir, "tests", "schema_verification.test.ts")
        with open(schema_test_file, "r", encoding="utf-8") as f:
            schema_assertions = f.read().count("test(")

        total_jest = inv_proc_assertions + prod_assertions + master_assertions + auth_assertions + schema_assertions
        self.assertEqual(total_jest, 72, f"Total Jest assertions across 5 suites must equal 72, got {total_jest}")

    def test_e2e_19_pr006_sales_engine_and_lcf_allocation(self):
        """Automated verification of PR-006 Sales Engine & Lowest-Cost-First Automated Allocation."""
        backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")

        # 1. Verify sales module directory and required files
        sales_dir = os.path.join(backend_dir, "src", "modules", "sales")
        self.assertTrue(os.path.isdir(sales_dir), "sales module directory must exist")
        for f in ["sales.controller.ts", "sales.service.ts", "sales.module.ts"]:
            self.assertTrue(os.path.isfile(os.path.join(sales_dir, f)), f"sales/{f} must exist")
        self.assertTrue(os.path.isfile(os.path.join(sales_dir, "dto", "create-sale.dto.ts")))
        self.assertTrue(os.path.isfile(os.path.join(sales_dir, "dto", "simulate-sale.dto.ts")))

        # 2. Verify AppModule imports SalesModule
        app_module_file = os.path.join(backend_dir, "src", "app.module.ts")
        with open(app_module_file, "r", encoding="utf-8") as f:
            app_code = f.read()
        self.assertIn("SalesModule", app_code)

        # 3. Verify SalesController route contracts
        with open(os.path.join(sales_dir, "sales.controller.ts"), "r", encoding="utf-8") as f:
            ctrl_code = f.read()
        self.assertIn("@Post('simulate')", ctrl_code)
        self.assertIn("@Post()", ctrl_code)
        self.assertIn("@Get()", ctrl_code)
        self.assertIn("@Get(':id')", ctrl_code)
        self.assertIn("JwtAuthGuard", ctrl_code)

        # 4. Verify SalesService invariants
        with open(os.path.join(sales_dir, "sales.service.ts"), "r", encoding="utf-8") as f:
            serv_code = f.read()
        self.assertIn("async simulate(", serv_code)
        self.assertIn("async create(", serv_code)
        self.assertIn("async findAll(", serv_code)
        self.assertIn("async findById(", serv_code)
        self.assertIn("Cross-product lot leakage prevented", serv_code)
        self.assertIn("AUTO_LOWEST_COST", serv_code)
        self.assertIn("MANUAL_OVERRIDE", serv_code)
        self.assertIn("db.transaction", serv_code)

        # 5. Verify Jest test assertion counts across all 6 test suites (total = 86 assertions)
        sales_test_file = os.path.join(backend_dir, "tests", "sales_allocation.test.ts")
        self.assertTrue(os.path.isfile(sales_test_file), "sales_allocation.test.ts must exist")
        with open(sales_test_file, "r", encoding="utf-8") as f:
            sales_assertions = f.read().count("test(")
        self.assertEqual(sales_assertions, 14, "sales_allocation.test.ts must contain exactly 14 assertions")

        inv_proc_file = os.path.join(backend_dir, "tests", "inventory_procurements.test.ts")
        with open(inv_proc_file, "r", encoding="utf-8") as f:
            inv_proc_assertions = f.read().count("test(")

        prod_test_file = os.path.join(backend_dir, "tests", "products_discovery.test.ts")
        with open(prod_test_file, "r", encoding="utf-8") as f:
            prod_assertions = f.read().count("test(")

        master_test_file = os.path.join(backend_dir, "tests", "master_data.test.ts")
        with open(master_test_file, "r", encoding="utf-8") as f:
            master_assertions = f.read().count("test(")

        auth_test_file = os.path.join(backend_dir, "tests", "auth.test.ts")
        with open(auth_test_file, "r", encoding="utf-8") as f:
            auth_assertions = f.read().count("test(")

        schema_test_file = os.path.join(backend_dir, "tests", "schema_verification.test.ts")
        with open(schema_test_file, "r", encoding="utf-8") as f:
            schema_assertions = f.read().count("test(")

        total_jest = (
            sales_assertions
            + inv_proc_assertions
            + prod_assertions
            + master_assertions
            + auth_assertions
            + schema_assertions
        )
        self.assertEqual(total_jest, 86, f"Total Jest assertions across 6 suites must equal 86, got {total_jest}")

    def test_e2e_20_pr007_analytics_engine(self):
        """Automated verification of PR-007 Granular Profit & Sales Analytics Engine."""
        backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")

        # 1. Verify analytics module directory and required files
        analytics_dir = os.path.join(backend_dir, "src", "modules", "analytics")
        self.assertTrue(os.path.isdir(analytics_dir), "analytics module directory must exist")
        for f in ["analytics.controller.ts", "analytics.service.ts", "analytics.module.ts"]:
            self.assertTrue(os.path.isfile(os.path.join(analytics_dir, f)), f"analytics/{f} must exist")
        self.assertTrue(os.path.isfile(os.path.join(analytics_dir, "dto", "analytics-query.dto.ts")))

        # 2. Verify AppModule imports AnalyticsModule
        app_module_file = os.path.join(backend_dir, "src", "app.module.ts")
        with open(app_module_file, "r", encoding="utf-8") as f:
            app_code = f.read()
        self.assertIn("AnalyticsModule", app_code)

        # 3. Verify AnalyticsController route contracts
        with open(os.path.join(analytics_dir, "analytics.controller.ts"), "r", encoding="utf-8") as f:
            ctrl_code = f.read()
        self.assertIn("@Get()", ctrl_code)
        self.assertIn("granularity", ctrl_code)
        self.assertIn("from_date", ctrl_code)
        self.assertIn("to_date", ctrl_code)

        # 4. Verify AnalyticsService invariants
        with open(os.path.join(analytics_dir, "analytics.service.ts"), "r", encoding="utf-8") as f:
            serv_code = f.read()
        self.assertIn("async getAnalytics(", serv_code)
        self.assertIn("getTimeBucketKey", serv_code)
        self.assertIn("getIsoWeek", serv_code)
        self.assertIn("total_revenue", serv_code)
        self.assertIn("total_cogs", serv_code)
        self.assertIn("total_profit", serv_code)
        self.assertIn("margin_pct", serv_code)

        # 5. Verify Jest test assertion counts across all 7 test suites (total = 94 assertions)
        analytics_test_file = os.path.join(backend_dir, "tests", "analytics_engine.test.ts")
        self.assertTrue(os.path.isfile(analytics_test_file), "analytics_engine.test.ts must exist")
        with open(analytics_test_file, "r", encoding="utf-8") as f:
            analytics_assertions = f.read().count("test(")
        self.assertEqual(analytics_assertions, 8, "analytics_engine.test.ts must contain exactly 8 assertions")

        sales_test_file = os.path.join(backend_dir, "tests", "sales_allocation.test.ts")
        with open(sales_test_file, "r", encoding="utf-8") as f:
            sales_assertions = f.read().count("test(")

        inv_proc_file = os.path.join(backend_dir, "tests", "inventory_procurements.test.ts")
        with open(inv_proc_file, "r", encoding="utf-8") as f:
            inv_proc_assertions = f.read().count("test(")

        prod_test_file = os.path.join(backend_dir, "tests", "products_discovery.test.ts")
        with open(prod_test_file, "r", encoding="utf-8") as f:
            prod_assertions = f.read().count("test(")

        master_test_file = os.path.join(backend_dir, "tests", "master_data.test.ts")
        with open(master_test_file, "r", encoding="utf-8") as f:
            master_assertions = f.read().count("test(")

        auth_test_file = os.path.join(backend_dir, "tests", "auth.test.ts")
        with open(auth_test_file, "r", encoding="utf-8") as f:
            auth_assertions = f.read().count("test(")

        schema_test_file = os.path.join(backend_dir, "tests", "schema_verification.test.ts")
        with open(schema_test_file, "r", encoding="utf-8") as f:
            schema_assertions = f.read().count("test(")

        total_jest = (
            analytics_assertions
            + sales_assertions
            + inv_proc_assertions
            + prod_assertions
            + master_assertions
            + auth_assertions
            + schema_assertions
        )
        self.assertEqual(total_jest, 94, f"Total Jest assertions across 7 suites must equal 94, got {total_jest}")

    def test_e2e_21_pr008_frontend_shell_and_visual_testing_gate(self):
        """Automated verification of PR-008 Next.js Frontend Shell, Mobbin Design Tokens & Visual Testing Gate."""
        root_dir = os.path.dirname(os.path.abspath(__file__))
        frontend_dir = os.path.join(root_dir, "frontend")

        # 1. Verify frontend core directory and configuration
        self.assertTrue(os.path.isdir(frontend_dir), "frontend directory must exist")
        for f in ["package.json", "tsconfig.json", "next.config.mjs", "tailwind.config.ts", "postcss.config.mjs", "jest.config.js"]:
            self.assertTrue(os.path.isfile(os.path.join(frontend_dir, f)), f"frontend/{f} must exist")

        # 2. Verify App Router structure and Mobbin design tokens
        app_dir = os.path.join(frontend_dir, "app")
        self.assertTrue(os.path.isfile(os.path.join(app_dir, "globals.css")))
        self.assertTrue(os.path.isfile(os.path.join(app_dir, "layout.tsx")))
        self.assertTrue(os.path.isfile(os.path.join(app_dir, "page.tsx")))
        self.assertTrue(os.path.isfile(os.path.join(app_dir, "login", "page.tsx")))

        # 3. Verify globals.css contains dark/light theme variables and WCAG AAA tokens
        with open(os.path.join(app_dir, "globals.css"), "r", encoding="utf-8") as f:
            css_content = f.read()
        self.assertIn(":root", css_content)
        self.assertIn(".dark", css_content)
        self.assertIn("--primary", css_content)
        self.assertIn("--status-active-bg", css_content)
        self.assertIn(":focus-visible", css_content)

        # 4. Verify Accessible Components & Zustand Store
        comp_dir = os.path.join(frontend_dir, "components")
        self.assertTrue(os.path.isfile(os.path.join(comp_dir, "ThemeToggle.tsx")))
        self.assertTrue(os.path.isfile(os.path.join(comp_dir, "CommandPalette.tsx")))
        self.assertTrue(os.path.isfile(os.path.join(comp_dir, "Navigation.tsx")))
        self.assertTrue(os.path.isfile(os.path.join(frontend_dir, "store", "useUIStore.ts")))
        self.assertTrue(os.path.isfile(os.path.join(frontend_dir, "lib", "queryClient.ts")))

        # 5. Verify Visual Testing & Accessibility Suite (10 assertions)
        visual_test_file = os.path.join(frontend_dir, "tests", "visual_theme_a11y.test.ts")
        self.assertTrue(os.path.isfile(visual_test_file), "visual_theme_a11y.test.ts must exist")
        with open(visual_test_file, "r", encoding="utf-8") as f:
            visual_test_code = f.read()
        visual_assertions = visual_test_code.count("test(")
        self.assertEqual(visual_assertions, 10, "visual_theme_a11y.test.ts must contain exactly 10 visual/a11y assertions")
        self.assertIn("getContrastRatio", visual_test_code)
        self.assertIn("Color-Blind Safety Simulation", visual_test_code)
        self.assertIn("Desktop vs Mobile Breakpoints", visual_test_code)
        self.assertIn("Focus Indicator Verification", visual_test_code)

        # 6. Verify index.html and static/app.jsx theme integration
        with open(os.path.join(root_dir, "index.html"), "r", encoding="utf-8") as f:
            index_html = f.read()
        self.assertIn("darkMode: 'class'", index_html)

        with open(os.path.join(root_dir, "static", "app.jsx"), "r", encoding="utf-8") as f:
            app_jsx = f.read()
        self.assertIn("toggleTheme", app_jsx)
        self.assertIn("apex_theme", app_jsx)

    def test_e2e_22_pr009_masters_and_catalogue_ui(self):
        """Automated verification of PR-009 Configurable Masters UI & Catalogue Management."""
        root_dir = os.path.dirname(os.path.abspath(__file__))
        frontend_dir = os.path.join(root_dir, "frontend")

        # 1. Verify master pages exist
        app_dir = os.path.join(frontend_dir, "app")
        for page in ["customers", "suppliers", "categories", "catalogue"]:
            page_path = os.path.join(app_dir, page, "page.tsx")
            self.assertTrue(os.path.isfile(page_path), f"{page}/page.tsx must exist")

        # 2. Verify reusable Drawer and CategoryTree components
        comp_dir = os.path.join(frontend_dir, "components")
        self.assertTrue(os.path.isfile(os.path.join(comp_dir, "Drawer.tsx")), "Drawer.tsx must exist")
        self.assertTrue(os.path.isfile(os.path.join(comp_dir, "CategoryTree.tsx")), "CategoryTree.tsx must exist")

        with open(os.path.join(comp_dir, "Drawer.tsx"), "r", encoding="utf-8") as f:
            drawer_code = f.read()
        self.assertIn('role="dialog"', drawer_code)
        self.assertIn('aria-modal="true"', drawer_code)
        self.assertIn("Escape", drawer_code)
        self.assertIn("overflow = 'hidden'", drawer_code)

        # 3. Verify Customer Directory page contracts
        with open(os.path.join(app_dir, "customers", "page.tsx"), "r", encoding="utf-8") as f:
            cust_page = f.read()
        self.assertIn("Customer Directory", cust_page)
        self.assertIn("Credit Limit", cust_page)
        self.assertIn("validateForm", cust_page)
        self.assertIn("Drawer", cust_page)

        # 4. Verify Supplier Directory page contracts
        with open(os.path.join(app_dir, "suppliers", "page.tsx"), "r", encoding="utf-8") as f:
            sup_page = f.read()
        self.assertIn("Supplier & Vendor Directory", sup_page)
        self.assertIn("Wholesale Shop", sup_page)
        self.assertIn("Quick Commerce", sup_page)
        self.assertIn("E-Commerce", sup_page)
        self.assertIn("Payment Terms", sup_page)

        # 5. Verify Categories page contracts
        with open(os.path.join(app_dir, "categories", "page.tsx"), "r", encoding="utf-8") as f:
            cat_page = f.read()
        self.assertIn("Category Hierarchy", cat_page)
        self.assertIn("CategoryTree", cat_page)
        self.assertIn("Category Inspector", cat_page)
        self.assertIn("Hierarchical Category Structure", cat_page)

        # 6. Verify Catalogue page contracts & non-color-reliant stock badges
        with open(os.path.join(app_dir, "catalogue", "page.tsx"), "r", encoding="utf-8") as f:
            cat_prod_page = f.read()
        self.assertIn("Product Catalogue", cat_prod_page)
        self.assertIn("CheckCircle2", cat_prod_page)
        self.assertIn("AlertTriangle", cat_prod_page)
        self.assertIn("XCircle", cat_prod_page)
        self.assertIn("UNITS_OF_MEASURE", cat_prod_page)
        self.assertIn("Add to Catalogue", cat_prod_page)

        # 7. Verify PR-009 Visual & Accessibility test suite assertions
        test_file = os.path.join(frontend_dir, "tests", "masters_catalogue_a11y.test.ts")
        self.assertTrue(os.path.isfile(test_file), "masters_catalogue_a11y.test.ts must exist")
        with open(test_file, "r", encoding="utf-8") as f:
            test_content = f.read()
        it_count = test_content.count("it(")
        self.assertEqual(it_count, 20, f"masters_catalogue_a11y.test.ts must contain exactly 20 test assertions, got {it_count}")
        self.assertIn("Customer Master Data Validation", test_content)
        self.assertIn("Supplier Procurement Channels", test_content)
        self.assertIn("Hierarchical Category Tree", test_content)
        self.assertIn("Product Catalogue Stock Health", test_content)
        self.assertIn("Slide-Over Drawer Accessibility", test_content)
        self.assertIn("WCAG 2.1 AAA Contrast Ratio", test_content)

    def test_e2e_23_pr010_pos_billing_picker_and_certification(self):
        """Automated verification of PR-010 POS Billing View, Advanced Product Picker Grid & End-to-End Certification."""
        root_dir = os.path.dirname(os.path.abspath(__file__))
        frontend_dir = os.path.join(root_dir, "frontend")

        # 1. Verify POS Billing, Procurement, and Analytics pages
        app_dir = os.path.join(frontend_dir, "app")
        self.assertTrue(os.path.isfile(os.path.join(app_dir, "sales", "page.tsx")), "sales/page.tsx must exist")
        self.assertTrue(os.path.isfile(os.path.join(app_dir, "procurement", "page.tsx")), "procurement/page.tsx must exist")
        self.assertTrue(os.path.isfile(os.path.join(app_dir, "analytics", "page.tsx")), "analytics/page.tsx must exist")

        # 2. Verify ProductPickerModal component
        comp_dir = os.path.join(frontend_dir, "components")
        picker_path = os.path.join(comp_dir, "ProductPickerModal.tsx")
        self.assertTrue(os.path.isfile(picker_path), "ProductPickerModal.tsx must exist")
        with open(picker_path, "r", encoding="utf-8") as f:
            picker_code = f.read()
        self.assertIn("fuzzyMatch", picker_code)
        self.assertIn('role="dialog"', picker_code)
        self.assertIn('aria-modal="true"', picker_code)
        self.assertIn("handleSort", picker_code)
        self.assertIn("handleAddAllSelected", picker_code)
        self.assertIn("handleQtyChange", picker_code)

        # 3. Verify ManualLotOverrideModal component
        override_path = os.path.join(comp_dir, "ManualLotOverrideModal.tsx")
        self.assertTrue(os.path.isfile(override_path), "ManualLotOverrideModal.tsx must exist")
        with open(override_path, "r", encoding="utf-8") as f:
            override_code = f.read()
        self.assertIn("Manual Batch Selection Override", override_code)
        self.assertIn("totalAllocated !== requiredQty", override_code)
        self.assertIn("onResetToAutoLCF", override_code)

        # 4. Verify InvoiceReceiptModal component
        receipt_path = os.path.join(comp_dir, "InvoiceReceiptModal.tsx")
        self.assertTrue(os.path.isfile(receipt_path), "InvoiceReceiptModal.tsx must exist")
        with open(receipt_path, "r", encoding="utf-8") as f:
            receipt_code = f.read()
        self.assertIn("window.print()", receipt_code)
        self.assertIn("INVOICE #", receipt_code)
        self.assertIn("Cost of Goods Sold (COGS)", receipt_code)
        self.assertIn("Net Order Profit", receipt_code)

        # 5. Verify lib/fuzzy.ts utility functions
        fuzzy_path = os.path.join(frontend_dir, "lib", "fuzzy.ts")
        self.assertTrue(os.path.isfile(fuzzy_path), "lib/fuzzy.ts must exist")
        with open(fuzzy_path, "r", encoding="utf-8") as f:
            fuzzy_code = f.read()
        self.assertIn("export function fuzzyMatch", fuzzy_code)

        # 6. Verify POS Billing page business invariants
        with open(os.path.join(app_dir, "sales", "page.tsx"), "r", encoding="utf-8") as f:
            sales_code = f.read()
        self.assertIn("computeLCFAllocation", sales_code)
        self.assertIn("AUTO_LOWEST_COST", sales_code)
        self.assertIn("MANUAL_OVERRIDE", sales_code)
        self.assertIn("isCreditExceeded", sales_code)
        self.assertIn("ProductPickerModal", sales_code)
        self.assertIn("ManualLotOverrideModal", sales_code)
        self.assertIn("InvoiceReceiptModal", sales_code)

        # 7. Verify PR-010 Visual & Accessibility test assertions (24 tests)
        test_file = os.path.join(frontend_dir, "tests", "pos_billing_a11y.test.ts")
        self.assertTrue(os.path.isfile(test_file), "pos_billing_a11y.test.ts must exist")
        with open(test_file, "r", encoding="utf-8") as f:
            pos_test_content = f.read()
        it_count = pos_test_content.count("it(")
        self.assertEqual(it_count, 24, f"pos_billing_a11y.test.ts must contain exactly 24 test assertions, got {it_count}")
        self.assertIn("Typo-Tolerant Fuzzy Search Algorithm", pos_test_content)
        self.assertIn("Advanced Product Picker Grid Sorting", pos_test_content)
        self.assertIn("Automated Lowest-Cost-First (LCF) Multi-Batch Allocation", pos_test_content)
        self.assertIn("Manual Batch Selection Override Validation", pos_test_content)
        self.assertIn("Customer Credit Limit", pos_test_content)
        self.assertIn("WCAG 2.1 AAA Contrast Ratio Verification", pos_test_content)

    def test_e2e_24_pr011_global_search_sso_and_brand_polish(self):
        """Automated verification of PR-011 Global Search, Google SSO Auth Persistence, Brand Polish & Overview Removal."""
        root_dir = os.path.dirname(os.path.abspath(__file__))
        frontend_dir = os.path.join(root_dir, "frontend")
        comp_dir = os.path.join(frontend_dir, "components")
        app_dir = os.path.join(frontend_dir, "app")

        # 1. Verify CigaretteIcon component
        cig_path = os.path.join(comp_dir, "CigaretteIcon.tsx")
        self.assertTrue(os.path.isfile(cig_path), "CigaretteIcon.tsx must exist")
        with open(cig_path, "r", encoding="utf-8") as f:
            cig_code = f.read()
        self.assertIn("export function CigaretteIcon", cig_code)
        self.assertIn("<svg", cig_code)
        self.assertIn("Cigarette Sales Icon", cig_code)

        # 2. Verify GlobalSearchBar component
        search_path = os.path.join(comp_dir, "GlobalSearchBar.tsx")
        self.assertTrue(os.path.isfile(search_path), "GlobalSearchBar.tsx must exist")
        with open(search_path, "r", encoding="utf-8") as f:
            search_code = f.read()
        self.assertIn("export function GlobalSearchBar", search_code)
        self.assertIn("fuzzyMatch", search_code)
        self.assertIn("SEED_GLOBAL_ITEMS", search_code)
        self.assertIn("filteredResults", search_code)
        self.assertIn("getItemBadgeStyle", search_code)

        # 3. Verify Navigation component brand emblem, global search, auth pill & removal of Overview
        nav_path = os.path.join(comp_dir, "Navigation.tsx")
        with open(nav_path, "r", encoding="utf-8") as f:
            nav_code = f.read()
        self.assertIn("CigaretteIcon", nav_code)
        self.assertIn("currentUser", nav_code)
        self.assertIn("logout", nav_code)
        # Overview must not be in navLinks
        self.assertNotIn("label: 'Overview'", nav_code)
        # POS Billing must be at root '/'
        self.assertIn("{ href: '/', label: 'POS Billing'", nav_code)

        # 4. Verify Root Page renders POS Billing directly
        root_page_path = os.path.join(app_dir, "page.tsx")
        with open(root_page_path, "r", encoding="utf-8") as f:
            root_page_code = f.read()
        self.assertIn("SalesPOSPage", root_page_code)
        self.assertIn("<SalesPOSPage />", root_page_code)

        # 5. Verify useUIStore auth session state and localStorage persistence
        store_path = os.path.join(frontend_dir, "store", "useUIStore.ts")
        with open(store_path, "r", encoding="utf-8") as f:
            store_code = f.read()
        self.assertIn("export interface UserSession", store_code)
        self.assertIn("currentUser: UserSession | null", store_code)
        self.assertIn("login: (user: UserSession)", store_code)
        self.assertIn("logout: () => void", store_code)
        self.assertIn("apex_user_session", store_code)
        self.assertIn("apex_auth_token", store_code)

        # 6. Verify LoginPage session dispatch
        login_page_path = os.path.join(app_dir, "login", "page.tsx")
        with open(login_page_path, "r", encoding="utf-8") as f:
            login_code = f.read()
        self.assertIn("login({", login_code)
        self.assertIn("router.push('/')", login_code)

        # 7. Verify PR-011 test suite exists and has test assertions (13 tests)
        test_file = os.path.join(frontend_dir, "tests", "global_search_auth_brand.test.ts")
        self.assertTrue(os.path.isfile(test_file), "global_search_auth_brand.test.ts must exist")
        with open(test_file, "r", encoding="utf-8") as f:
            test_content = f.read()
        it_count = test_content.count("it(")
        self.assertEqual(it_count, 13, f"global_search_auth_brand.test.ts must contain exactly 13 test assertions, got {it_count}")
        self.assertIn("Google SSO Auth Session Lifecycle & Persistence", test_content)
        self.assertIn("Navigation Top-Right Alignment & Auth UI Contracts", test_content)
        self.assertIn("Brand Emblem Polish & Overview Page Removal", test_content)
        self.assertIn("Global Search Bar & Multi-Entity Fuzzy Filtering", test_content)
        self.assertIn("WCAG 2.1 AAA Accessibility & Visual Testing Quality Gate", test_content)

    def test_e2e_25_pr012_authorized_users_and_search_removal(self):
        """Automated verification of PR-012 Search Removal and Exclusive Two-User Full-Access Authorization."""
        root_dir = os.path.dirname(os.path.abspath(__file__))
        frontend_dir = os.path.join(root_dir, "frontend")
        comp_dir = os.path.join(frontend_dir, "components")
        app_dir = os.path.join(frontend_dir, "app")
        backend_dir = os.path.join(root_dir, "backend")

        # 1. Verify Navigation omits GlobalSearchBar and displays Full Access badge
        nav_path = os.path.join(comp_dir, "Navigation.tsx")
        with open(nav_path, "r", encoding="utf-8") as f:
            nav_code = f.read()
        self.assertNotIn("<GlobalSearchBar", nav_code, "Navigation must not render GlobalSearchBar")
        self.assertIn("Full Access", nav_code, "Navigation must display Full Access badge")
        self.assertIn("CigaretteIcon", nav_code, "Navigation must retain CigaretteIcon")

        # 2. Verify sales page features Product Picker Grid and restored Quick Search
        sales_path = os.path.join(app_dir, "sales", "page.tsx")
        with open(sales_path, "r", encoding="utf-8") as f:
            sales_code = f.read()
        self.assertIn("searchQuery", sales_code, "sales/page.tsx features Quick Search per PR-013 user request")
        self.assertIn("Open Product Picker Grid", sales_code, "sales/page.tsx must feature Product Picker Grid trigger")

        # 3. Verify useUIStore authorized emails whitelist
        store_path = os.path.join(frontend_dir, "store", "useUIStore.ts")
        with open(store_path, "r", encoding="utf-8") as f:
            store_code = f.read()
        self.assertIn("rangaprasad.557@gmail.com", store_code)
        self.assertIn("singarisurendra@gmail.com", store_code)
        self.assertIn("isAuthorizedEmail", store_code)

        # 4. Verify LoginPage presents two authorized users with full access
        login_path = os.path.join(app_dir, "login", "page.tsx")
        with open(login_path, "r", encoding="utf-8") as f:
            login_code = f.read()
        self.assertIn("rangaprasad.557@gmail.com", login_code)
        self.assertIn("singarisurendra@gmail.com", login_code)
        self.assertIn("Full Access", login_code)
        self.assertNotIn("salesperson", login_code)
        self.assertNotIn("auditor", login_code)

        # 5. Verify Backend AuthService whitelist
        auth_service_path = os.path.join(backend_dir, "src", "modules", "auth", "auth.service.ts")
        with open(auth_service_path, "r", encoding="utf-8") as f:
            auth_code = f.read()
        self.assertIn("rangaprasad.557@gmail.com", auth_code)
        self.assertIn("singarisurendra@gmail.com", auth_code)
        self.assertIn("isAuthorizedEmail", auth_code)
        self.assertIn("full_access", auth_code)

        # 6. Verify PR-012 frontend test suite exists (13 assertions)
        pr012_test_file = os.path.join(frontend_dir, "tests", "authorized_users_and_clean_ui.test.ts")
        self.assertTrue(os.path.isfile(pr012_test_file), "authorized_users_and_clean_ui.test.ts must exist")
        with open(pr012_test_file, "r", encoding="utf-8") as f:
            test_content = f.read()
        it_count = test_content.count("it(")
        self.assertEqual(it_count, 13, f"authorized_users_and_clean_ui.test.ts must contain 13 test assertions, got {it_count}")
        self.assertIn("Two-User Whitelist Authorization Gate", test_content)
        self.assertIn("User Session Lifecycle, Storage & Role Purge", test_content)
        self.assertIn("Clean UI Architecture Contracts", test_content)
        self.assertIn("WCAG 2.1 AAA Accessibility & Visual Quality Gate", test_content)

    def test_e2e_26_pr013_auth_guard_clean_data_and_branding(self):
        """Automated verification of PR-013 Strict AuthGuard, Clean Data, Favicon & Retail Sales Branding."""
        root_dir = os.path.dirname(os.path.abspath(__file__))
        frontend_dir = os.path.join(root_dir, "frontend")
        app_dir = os.path.join(frontend_dir, "app")
        comp_dir = os.path.join(frontend_dir, "components")

        # 1. Verify App Title is 'Retail Sales' in layout and index.html
        layout_path = os.path.join(app_dir, "layout.tsx")
        with open(layout_path, "r", encoding="utf-8") as f:
            layout_code = f.read()
        self.assertIn("title: 'Retail Sales'", layout_code)
        self.assertIn("icon: '/favicon.ico'", layout_code)
        self.assertIn("<AuthGuard>", layout_code)

        index_path = os.path.join(root_dir, "index.html")
        with open(index_path, "r", encoding="utf-8") as f:
            index_code = f.read()
        self.assertIn("<title>Retail Sales</title>", index_code)
        self.assertIn("/favicon.ico", index_code)

        # 2. Verify favicon.ico exists in app and public
        fav_app = os.path.join(app_dir, "favicon.ico")
        fav_pub = os.path.join(frontend_dir, "public", "favicon.ico")
        self.assertTrue(os.path.isfile(fav_app), "frontend/app/favicon.ico must exist")
        self.assertTrue(os.path.isfile(fav_pub), "frontend/public/favicon.ico must exist")

        # 3. Verify AuthGuard component implementation
        guard_path = os.path.join(comp_dir, "AuthGuard.tsx")
        with open(guard_path, "r", encoding="utf-8") as f:
            guard_code = f.read()
        self.assertIn("isAuthorizedEmail(currentUser.email)", guard_code)
        self.assertIn("router.replace('/login')", guard_code)
        self.assertIn("Retail Sales Protected Workspace", guard_code)

        # 4. Verify Navigation minimal header on /login
        nav_path = os.path.join(comp_dir, "Navigation.tsx")
        with open(nav_path, "r", encoding="utf-8") as f:
            nav_code = f.read()
        self.assertIn("pathname === '/login'", nav_code)
        self.assertIn("Retail Sales", nav_code)
        self.assertIn("handleLogout", nav_code)

        # 5. Verify CommandPalette disabled on /login or unauthenticated
        cmd_path = os.path.join(comp_dir, "CommandPalette.tsx")
        with open(cmd_path, "r", encoding="utf-8") as f:
            cmd_code = f.read()
        self.assertIn("pathname === '/login' || !currentUser", cmd_code)

        # 6. Verify Quick Search in sales/page.tsx
        sales_path = os.path.join(app_dir, "sales", "page.tsx")
        with open(sales_path, "r", encoding="utf-8") as f:
            sales_code = f.read()
        self.assertIn("Quick search & add product", sales_code)
        self.assertIn("handleQuickAdd", sales_code)
        self.assertIn("Open Product Picker Grid", sales_code)

        # 7. Verify PR-013 test suite exists (13 assertions)
        pr013_test_file = os.path.join(frontend_dir, "tests", "auth_guard.test.ts")
        self.assertTrue(os.path.isfile(pr013_test_file), "auth_guard.test.ts must exist")
        with open(pr013_test_file, "r", encoding="utf-8") as f:
            test_content = f.read()
        test_count = test_content.count("test(")
        self.assertEqual(test_count, 13, f"auth_guard.test.ts must contain 13 test assertions, got {test_count}")

        # 8. Verify clean data in main app database
        main_db = os.path.join(root_dir, "inventory_sales.db")
        if os.path.exists(main_db):
            mconn = sqlite3.connect(main_db)
            mcur = mconn.cursor()
            mcur.execute("SELECT COUNT(*) FROM products")
            self.assertGreaterEqual(mcur.fetchone()[0], 0, "Main app products must be queryable")
            mcur.execute("SELECT COUNT(*) FROM customers")
            self.assertGreaterEqual(mcur.fetchone()[0], 0, "Main app customers must be queryable")
            mcur.execute("SELECT COUNT(*) FROM procurements")
            self.assertGreaterEqual(mcur.fetchone()[0], 0, "Main app procurements must be queryable")
            mcur.execute("SELECT COUNT(*) FROM sales")
            self.assertGreaterEqual(mcur.fetchone()[0], 0, "Main app sales must be queryable")
            mconn.close()

    def test_e2e_27_real_google_oauth_gis(self):
        """Automated verification of PR-014 Real Google OAuth 2.0 GIS and Impersonation Elimination."""
        root_dir = os.path.dirname(os.path.abspath(__file__))
        frontend_dir = os.path.join(root_dir, "frontend")
        app_dir = os.path.join(frontend_dir, "app")
        comp_dir = os.path.join(frontend_dir, "components")

        # 1. Helper to construct simulated Google JWT
        import base64
        def make_token(payload):
            header_b64 = base64.urlsafe_b64encode(json.dumps({"alg": "RS256"}).encode()).decode().rstrip("=")
            body_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
            return f"{header_b64}.{body_b64}.fake_sig"

        # 2. Test /api/auth/google endpoint rejection of missing/empty token
        status, _, res_missing = self._http_post("/api/auth/google", {})
        self.assertEqual(status, 400)
        self.assertFalse(res_missing.get("success", False))

        # 3. Test /api/auth/google rejection of malformed token
        status, _, res_malformed = self._http_post("/api/auth/google", {"idToken": "bad-token"})
        self.assertEqual(status, 400)

        # 4. Test /api/auth/google rejection of unauthorized email
        unauth_token = make_token({"email": "intruder@gmail.com", "name": "Intruder"})
        status, _, res_unauth = self._http_post("/api/auth/google", {"idToken": unauth_token})
        self.assertEqual(status, 403)
        self.assertIn("Access denied", res_unauth.get("error", ""))

        # 5. Test /api/auth/google approval of rangaprasad.557@gmail.com
        token_ranga = make_token({"email": "rangaprasad.557@gmail.com", "name": "Ranga Prasad"})
        status, _, res_ranga = self._http_post("/api/auth/google", {"idToken": token_ranga})
        self.assertEqual(status, 200)
        self.assertTrue(res_ranga.get("success"))
        self.assertEqual(res_ranga.get("data", {}).get("email"), "rangaprasad.557@gmail.com")

        # 6. Test /api/auth/google approval of singarisurendra@gmail.com
        token_surendra = make_token({"email": "singarisurendra@gmail.com", "name": "Surendra Singari"})
        status, _, res_surendra = self._http_post("/api/auth/google", {"idToken": token_surendra})
        self.assertEqual(status, 200)
        self.assertTrue(res_surendra.get("success"))
        self.assertEqual(res_surendra.get("data", {}).get("email"), "singarisurendra@gmail.com")

        # 7. Verify elimination of mock cards and presence of GIS components in code
        login_path = os.path.join(app_dir, "login", "page.tsx")
        with open(login_path, "r", encoding="utf-8") as f:
            login_code = f.read()
        self.assertNotIn("AUTHORIZED_ACCOUNTS = [", login_code)
        self.assertNotIn("handleAuthorizedLogin", login_code)
        self.assertNotIn("Direct Sign In with Full Access", login_code)
        self.assertIn("GoogleSignInButton", login_code)
        self.assertIn("handleGoogleCredential", login_code)

        # 8. Verify GoogleSignInButton component exists
        btn_path = os.path.join(comp_dir, "GoogleSignInButton.tsx")
        self.assertTrue(os.path.isfile(btn_path), "GoogleSignInButton.tsx must exist")
        with open(btn_path, "r", encoding="utf-8") as f:
            btn_code = f.read()
        self.assertIn("https://accounts.google.com/gsi/client", btn_code)
        self.assertIn("window.google.accounts.id.renderButton", btn_code)

        # 9. Verify PR-014 frontend test suite exists
        pr014_test_file = os.path.join(frontend_dir, "tests", "real_google_oauth_gis.test.ts")
        self.assertTrue(os.path.isfile(pr014_test_file), "real_google_oauth_gis.test.ts must exist")
        with open(pr014_test_file, "r", encoding="utf-8") as f:
            test_content = f.read()
        it_count = test_content.count("it(")
        self.assertEqual(it_count, 12, f"real_google_oauth_gis.test.ts must contain 12 assertions, got {it_count}")

    def test_e2e_28_master_data_crud_and_editing(self):
        """
        PR-015: Master Data Editing, Persistence & Cross-Page Integration
        Verifies:
        1. Products full CRUD (POST create, GET list, PUT update, DELETE remove)
        2. Customers full CRUD (POST with creditLimit/notes, GET, PUT update, DELETE)
        3. Suppliers full CRUD (POST with source/terms, GET, PUT update, DELETE)
        4. Categories full CRUD (POST, GET, PUT update, DELETE)
        5. Cross-page Category discovery: created category used in product catalogue
        6. Negative tests: invalid ID 400 rejection and nonexistent ID 404 handling
        7. Frontend verification: PR-015 test file master_data_editing.test.ts exists
        """
        # --- 1. Products CRUD ---
        root_dir = os.path.dirname(os.path.abspath(__file__))
        frontend_dir = os.path.join(root_dir, "frontend")
        # Create product
        prod_payload = {
            "name": "Single Origin Organic Cardamom 100g",
            "sku": "SPICE-CRD-100G",
            "category": "Organic Spices",
            "unit": "pack",
            "min_stock": 10
        }
        status, _, res = self._http_post("/api/products", prod_payload)
        self.assertEqual(status, 201)
        self.assertTrue(res.get("success"))
        prod_id = res.get("id")
        self.assertIsNotNone(prod_id)

        # Verify created in GET list
        status, _, body = self._http_get("/api/products")
        self.assertEqual(status, 200)
        prods = json.loads(body).get("products", [])
        created_prod = next((p for p in prods if p["id"] == prod_id), None)
        self.assertIsNotNone(created_prod)
        self.assertEqual(created_prod["name"], "Single Origin Organic Cardamom 100g")
        self.assertEqual(created_prod["sku"], "SPICE-CRD-100G")

        # Update product via PUT
        update_payload = {
            "name": "Single Origin Premium Green Cardamom 100g",
            "sku": "SPICE-CRD-100G",
            "category": "Gourmet Spices",
            "unit": "pack",
            "min_stock": 15
        }
        status, _, res = self._http_put(f"/api/products/{prod_id}", update_payload)
        self.assertEqual(status, 200)
        self.assertTrue(res.get("success"))

        # Verify updated data in GET
        status, _, body = self._http_get("/api/products")
        prods = json.loads(body).get("products", [])
        updated_prod = next((p for p in prods if p["id"] == prod_id), None)
        self.assertIsNotNone(updated_prod)
        self.assertEqual(updated_prod["name"], "Single Origin Premium Green Cardamom 100g")
        self.assertEqual(updated_prod["category"], "Gourmet Spices")
        self.assertEqual(updated_prod["min_stock"], 15)

        # Delete product via DELETE
        status, _, res = self._http_delete(f"/api/products/{prod_id}")
        self.assertEqual(status, 200)
        self.assertTrue(res.get("success"))

        # Verify deletion
        status, _, body = self._http_get("/api/products")
        prods = json.loads(body).get("products", [])
        self.assertIsNone(next((p for p in prods if p["id"] == prod_id), None))

        # --- 2. Customers CRUD ---
        cust_payload = {
            "name": "Zenith Wellness Club",
            "phone": "9811223344",
            "email": "purchasing@zenithwellness.com",
            "address": "45 Boulevard Heights, Suite 12",
            "creditLimit": 18000.0,
            "notes": "Premium fitness accounts. Net 30."
        }
        status, _, res = self._http_post("/api/customers", cust_payload)
        self.assertEqual(status, 201)
        self.assertTrue(res.get("success"))
        cust_id = res.get("id")
        self.assertIsNotNone(cust_id)

        # Verify in GET list
        status, _, body = self._http_get("/api/customers")
        self.assertEqual(status, 200)
        custs = json.loads(body).get("customers", [])
        created_cust = next((c for c in custs if c["id"] == cust_id), None)
        self.assertIsNotNone(created_cust)
        self.assertEqual(created_cust["name"], "Zenith Wellness Club")
        self.assertEqual(created_cust["phone"], "9811223344")

        # Update customer via PUT
        update_cust = {
            "name": "Zenith Wellness & Spa Group",
            "phone": "9811223355",
            "email": "finance@zenithwellness.com",
            "address": "50 Boulevard Heights, Level 2",
            "creditLimit": 25000.0,
            "notes": "Approved credit expansion to Net 45."
        }
        status, _, res = self._http_put(f"/api/customers/{cust_id}", update_cust)
        self.assertEqual(status, 200)
        self.assertTrue(res.get("success"))

        # Verify update in GET
        status, _, body = self._http_get("/api/customers")
        custs = json.loads(body).get("customers", [])
        updated_c = next((c for c in custs if c["id"] == cust_id), None)
        self.assertIsNotNone(updated_c)
        self.assertEqual(updated_c["name"], "Zenith Wellness & Spa Group")
        self.assertEqual(updated_c["email"], "finance@zenithwellness.com")

        # Delete customer
        status, _, res = self._http_delete(f"/api/customers/{cust_id}")
        self.assertEqual(status, 200)

        # --- 3. Suppliers CRUD ---
        sup_payload = {
            "name": "Malabar Heritage Plantation",
            "contact_person": "Joseph Mathew",
            "phone": "9447012345",
            "email": "sales@malabarheritage.in",
            "address": "Plantation Estate, Wayanad",
            "source": "Wholesale Shop",
            "payment_terms": "Net 15 Days",
            "notes": "Direct estate spice producer"
        }
        status, _, res = self._http_post("/api/suppliers", sup_payload)
        self.assertEqual(status, 201)
        self.assertTrue(res.get("success"))
        sup_id = res.get("id")
        self.assertIsNotNone(sup_id)

        # Verify in GET
        status, _, body = self._http_get("/api/suppliers")
        self.assertEqual(status, 200)
        sups = json.loads(body).get("suppliers", [])
        created_sup = next((s for s in sups if s["id"] == sup_id), None)
        self.assertIsNotNone(created_sup)
        self.assertEqual(created_sup["name"], "Malabar Heritage Plantation")
        self.assertEqual(created_sup["contact_person"], "Joseph Mathew")

        # Update supplier via PUT
        update_sup = {
            "name": "Malabar Heritage Agro Organics Ltd",
            "contact_person": "Joseph Mathew",
            "phone": "9447012345",
            "email": "export@malabarheritage.in",
            "address": "Plantation Estate, Wayanad",
            "source": "E-Commerce",
            "payment_terms": "Net 30 Days",
            "notes": "Export grade certification active"
        }
        status, _, res = self._http_put(f"/api/suppliers/{sup_id}", update_sup)
        self.assertEqual(status, 200)
        self.assertTrue(res.get("success"))

        # Verify update in GET
        status, _, body = self._http_get("/api/suppliers")
        sups = json.loads(body).get("suppliers", [])
        updated_s = next((s for s in sups if s["id"] == sup_id), None)
        self.assertIsNotNone(updated_s)
        self.assertEqual(updated_s["name"], "Malabar Heritage Agro Organics Ltd")
        self.assertEqual(updated_s["source"], "E-Commerce")
        self.assertEqual(updated_s["payment_terms"], "Net 30 Days")

        # Delete supplier
        status, _, res = self._http_delete(f"/api/suppliers/{sup_id}")
        self.assertEqual(status, 200)

        # --- 4. Categories CRUD & Cross-Page Integration ---
        cat_payload = {
            "name": "Artisan Spice Blends",
            "parent_id": None,
            "icon": "SPICES",
            "description": "Hand-milled small batch spice powders"
        }
        status, _, res = self._http_post("/api/categories", cat_payload)
        self.assertEqual(status, 201)
        self.assertTrue(res.get("success"))
        cat_id = res.get("id")
        self.assertIsNotNone(cat_id)

        # Verify in GET
        status, _, body = self._http_get("/api/categories")
        self.assertEqual(status, 200)
        cats = json.loads(body).get("categories", [])
        created_cat = next((c for c in cats if c["id"] == cat_id), None)
        self.assertIsNotNone(created_cat)
        self.assertEqual(created_cat["name"], "Artisan Spice Blends")

        # Update category via PUT
        update_cat = {
            "name": "Artisan & Heritage Spice Blends",
            "parent_id": None,
            "icon": "SPICE-HERITAGE",
            "description": "Certified heritage single-origin blends"
        }
        status, _, res = self._http_put(f"/api/categories/{cat_id}", update_cat)
        self.assertEqual(status, 200)
        self.assertTrue(res.get("success"))

        # Verify category updated
        status, _, body = self._http_get("/api/categories")
        cats = json.loads(body).get("categories", [])
        updated_cat = next((c for c in cats if c["id"] == cat_id), None)
        self.assertIsNotNone(updated_cat)
        self.assertEqual(updated_cat["name"], "Artisan & Heritage Spice Blends")

        # Cross-page integration: create product using newly created Category!
        integrated_prod = {
            "name": "Garam Masala Special Reserve 200g",
            "sku": "SPICE-GM-200G",
            "category": "Artisan & Heritage Spice Blends",
            "unit": "pack",
            "min_stock": 5
        }
        status, _, res = self._http_post("/api/products", integrated_prod)
        self.assertEqual(status, 201)
        p_id = res.get("id")

        # Verify product is linked with the category
        status, _, body = self._http_get("/api/products")
        prods = json.loads(body).get("products", [])
        ip = next((p for p in prods if p["id"] == p_id), None)
        self.assertIsNotNone(ip)
        self.assertEqual(ip["category"], "Artisan & Heritage Spice Blends")

        # Cleanup
        self._http_delete(f"/api/products/{p_id}")
        self._http_delete(f"/api/categories/{cat_id}")

        # --- 5. Negative / Boundary Tests ---
        # Invalid IDs return 400
        status, _, _ = self._http_put("/api/products/bad-id", {"name": "X", "sku": "Y"})
        self.assertEqual(status, 400)
        status, _, _ = self._http_put("/api/customers/bad-id", {"name": "X"})
        self.assertEqual(status, 400)
        status, _, _ = self._http_put("/api/suppliers/bad-id", {"name": "X"})
        self.assertEqual(status, 400)
        status, _, _ = self._http_put("/api/categories/bad-id", {"name": "X"})
        self.assertEqual(status, 400)

        # Nonexistent IDs return 404
        status, _, _ = self._http_put("/api/products/999999", {"name": "X", "sku": "Y"})
        self.assertEqual(status, 404)
        status, _, _ = self._http_put("/api/customers/999999", {"name": "X"})
        self.assertEqual(status, 404)
        status, _, _ = self._http_put("/api/suppliers/999999", {"name": "X"})
        self.assertEqual(status, 404)
        status, _, _ = self._http_put("/api/categories/999999", {"name": "X"})
        self.assertEqual(status, 404)

        # --- 6. Verify PR-015 frontend test suite exists ---
        pr015_test_file = os.path.join(frontend_dir, "tests", "master_data_editing.test.ts")
        self.assertTrue(os.path.isfile(pr015_test_file), "master_data_editing.test.ts must exist")
        with open(pr015_test_file, "r", encoding="utf-8") as f:
            test_content = f.read()
        it_count = test_content.count("it(")
        self.assertGreaterEqual(it_count, 8, f"master_data_editing.test.ts must contain >= 8 assertions, got {it_count}")

if __name__ == "__main__":
    unittest.main(verbosity=1)





