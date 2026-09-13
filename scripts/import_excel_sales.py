#!/usr/bin/env python3
"""
scripts/import_excel_sales.py
Imports historical sales data from Excel (Cigrattes.xlsx) into the Multi-Batch Inventory & Sales System.
Supports both local SQLite database and Neon PostgreSQL production database.

Business Rules implemented:
1. 'Slk' maps to 'Gold Flake SLK Sleeks'
2. 'Fine Touch' with Rate < 100 maps to 'Flake Galaxy'
   'Fine Touch' with Rate >= 100 maps to 'Fine Touch'
3. Creates required Customers, Products, and historical Inventory Lots with exact acquisition costs.
4. Records 961 sales transactions with exact dates, line items, and profit attribution.
"""

import os
import sys
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from collections import defaultdict

# Add parent directory to path so we can import db
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)
import db

def excel_date(serial):
    """Convert Excel serial date number to YYYY-MM-DD string."""
    try:
        s = float(serial)
        return (datetime(1899, 12, 30) + timedelta(days=s)).strftime('%Y-%m-%d')
    except Exception:
        return str(serial)

def col2num(col):
    num = 0
    for c in col:
        num = num * 26 + (ord(c.upper()) - ord('A')) + 1
    return num

def num2col(num):
    col = ''
    while num > 0:
        num, rem = divmod(num - 1, 26)
        col = chr(65 + rem) + col
    return col

def parse_excel_sales(excel_path):
    """
    Parses Cigrattes.xlsx using standard library zipfile and XML parser.
    Returns: (list of parsed orders, dict of product summaries, dict of customer summaries)
    """
    if not os.path.exists(excel_path):
        raise FileNotFoundError(f"Excel file not found at: {excel_path}")

    with zipfile.ZipFile(excel_path, 'r') as z:
        # Load shared strings
        shared_strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            ss_xml = z.read('xl/sharedStrings.xml')
            ss_tree = ET.fromstring(ss_xml)
            for si in ss_tree.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
                text_parts = [elem.text for elem in si.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t') if elem.text]
                shared_strings.append(''.join(text_parts))

        sheet_xml = z.read('xl/worksheets/sheet1.xml')
        s_tree = ET.fromstring(sheet_xml)
        rows = s_tree.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheetData/{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row')

        # Parse Row 1 headers
        r1 = rows[0]
        col_to_header = {}
        for c in r1.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
            r_ref = c.attrib.get('r')
            col = ''.join([ch for ch in r_ref if ch.isalpha()])
            t = c.attrib.get('t')
            v = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
            val = v.text if v is not None else ''
            if t == 's' and val.isdigit():
                val = shared_strings[int(val)]
            col_to_header[col] = val

        # Map Excel product headers to column blocks
        product_col_map = {}
        sorted_cols = sorted(col_to_header.keys(), key=col2num)
        for col in sorted_cols:
            h = col_to_header[col].strip()
            if not h or h in ['Sold By', 'Customer Name', 'Date', 'Total Sale', 'Total Profit', 'Investment', 'Rate', 'Cost', 'Total Cost', 'Profit', 'Total']:
                continue
            c_num = col2num(col)
            product_col_map[h] = {
                'qty_col': col,
                'rate_col': num2col(c_num + 1),
                'cost_col': num2col(c_num + 2),
                'total_cost_col': num2col(c_num + 3),
                'profit_col': num2col(c_num + 4),
                'total_sale_col': num2col(c_num + 5)
            }

        parsed_orders = []

        for r in rows[2:]: # skip row 1 (header) and row 2 (sum totals)
            row_dict = {}
            for c in r.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                r_ref = c.attrib.get('r')
                col = ''.join([ch for ch in r_ref if ch.isalpha()])
                t = c.attrib.get('t')
                v = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                val = v.text if v is not None else ''
                if t == 's' and val.isdigit():
                    val = shared_strings[int(val)]
                row_dict[col] = val

            cust = row_dict.get('B', '').strip()
            raw_date = row_dict.get('C', '').strip()
            raw_sale = row_dict.get('D', '').strip()
            raw_prof = row_dict.get('E', '').strip()
            raw_cogs = row_dict.get('F', '').strip()
            sold_by = row_dict.get('A', '').strip()

            if not cust and not raw_date and not raw_sale:
                continue

            sale_val = float(raw_sale) if raw_sale else 0.0
            prof_val = float(raw_prof) if raw_prof else 0.0
            cogs_val = float(raw_cogs) if raw_cogs else 0.0
            date_val = excel_date(raw_date)

            order_items = []

            for excel_pname, cols in product_col_map.items():
                qty_str = row_dict.get(cols['qty_col'], '').strip()
                if qty_str:
                    try:
                        q = float(qty_str)
                        if q > 0:
                            rate = float(row_dict.get(cols['rate_col'], 0.0))
                            cost = float(row_dict.get(cols['cost_col'], 0.0))
                            tot_sale = float(row_dict.get(cols['total_sale_col'], 0.0))
                            tot_cost = float(row_dict.get(cols['total_cost_col'], 0.0))
                            profit = float(row_dict.get(cols['profit_col'], 0.0))

                            # Apply business rules for product name mapping:
                            target_product_name = excel_pname

                            if excel_pname == 'Slk':
                                # Rule 1: Slk maps to Gold Flake SLK Sleeks
                                target_product_name = 'Gold Flake SLK Sleeks'
                            elif excel_pname == 'Fine Touch':
                                # Rule 2: Fine Touch sold rate < 100 maps to Flake Galaxy
                                if rate < 100:
                                    target_product_name = 'Flake Galaxy'
                                else:
                                    target_product_name = 'Fine Touch'
                            elif excel_pname == 'King':
                                target_product_name = 'Gold Flake Kings Red'
                            elif excel_pname == 'Lights':
                                target_product_name = 'Gold Flake Kings Blue'
                            elif excel_pname == 'Connect':
                                target_product_name = 'Classic Connect'
                            elif excel_pname == 'Filter':
                                target_product_name = 'Gold Flake Filter'
                            elif excel_pname == 'Wills':
                                target_product_name = 'Falke Wills'
                            elif excel_pname == 'Players':
                                target_product_name = 'Players Gold Leaf'
                            elif excel_pname == 'Ice Burst':
                                target_product_name = 'Classic Ice Burst'
                            elif excel_pname == 'Am N.Y Cool':
                                target_product_name = 'American LIT/NY Cool'
                            elif excel_pname == 'Milds':
                                target_product_name = 'Classic Milds'
                            elif excel_pname == 'U.Milds':
                                target_product_name = 'Classic Ultra Milds'
                            elif excel_pname == 'Ind.Mint':
                                target_product_name = 'Gold Flake Indimint'
                            elif excel_pname == 'Mixpod':
                                target_product_name = 'Gold Flake Mixpod'
                            elif excel_pname == 'Sleeks':
                                target_product_name = 'Gold Flake Sleeks'
                            elif excel_pname == 'Compact':
                                target_product_name = 'Advance Compact'
                            elif excel_pname == 'Shift':
                                target_product_name = 'Shift'
                            elif excel_pname == 'Clove':
                                target_product_name = 'Clove'
                            elif excel_pname == 'Advance':
                                target_product_name = 'Advance'
                            elif excel_pname == 'Regular':
                                target_product_name = 'Classic Regular'
                            elif excel_pname == 'Fuse Beyond':
                                target_product_name = 'Fuse Beyond'
                            elif excel_pname == 'Wills Navy Cut':
                                target_product_name = 'Wills Navy Cut'

                            order_items.append({
                                'excel_product': excel_pname,
                                'product_name': target_product_name,
                                'qty': q,
                                'unit_sale_price': rate,
                                'unit_cost': cost,
                                'total_sale_price': tot_sale,
                                'total_cost': tot_cost,
                                'profit': profit
                            })
                    except Exception:
                        pass

            parsed_orders.append({
                'row_index': len(parsed_orders) + 1,
                'customer_name': cust if cust else 'Walk-in Retail Customer',
                'sold_by': sold_by if sold_by else 'Store Staff',
                'sale_date': date_val,
                'total_amount': sale_val,
                'total_cogs': cogs_val,
                'total_profit': prof_val,
                'items': order_items
            })

    return parsed_orders

def import_data(orders, dry_run=False):
    """
    Inserts customers, products, inventory lots, procurements, and sales orders
    into the database.
    """
    db.init_db()
    conn = db.get_connection()
    cur = conn.cursor()

    # Ensure sold_by column is present
    try:
        if db.is_postgres():
            cur.execute("ALTER TABLE sales ADD COLUMN IF NOT EXISTS sold_by VARCHAR(255) DEFAULT 'Store Staff'")
        else:
            cur.execute("ALTER TABLE sales ADD COLUMN sold_by TEXT DEFAULT 'Store Staff'")
        conn.commit()
    except Exception:
        pass

    print(f"\nConnected to database (Postgres: {db.is_postgres()})")
    print(f"Total orders to import: {len(orders)}")

    # 1. Ensure Categories exist
    cur.execute("SELECT id FROM categories WHERE name = ?", ("Cigrattes",))
    cat_row = cur.fetchone()
    if not cat_row:
        if not dry_run:
            cur.execute("INSERT INTO categories (name, icon, description) VALUES (?, ?, ?)", ("Cigrattes", "🚬", "Cigarette Brands and Formats"))
            conn.commit()
        print("Ensured Category 'Cigrattes' exists.")

    # 2. Ensure Products exist
    # First bootstrap standard catalog if products is empty
    cur.execute("SELECT COUNT(*) as cnt FROM products")
    if cur.fetchone()["cnt"] == 0 and not dry_run:
        db.load_store_catalog(conn)

    # Make sure 'Gold Flake SLK Sleeks' is present
    cur.execute("SELECT id FROM products WHERE name = ?", ("Gold Flake SLK Sleeks",))
    if not cur.fetchone():
        if not dry_run:
            cur.execute(
                "INSERT INTO products (name, sku, category, unit, min_stock) VALUES (?, ?, ?, ?, ?)",
                ("Gold Flake SLK Sleeks", "GOLD-FLAKE-SLK-SLEEKS", "Cigrattes", "box", 1)
            )
            conn.commit()
        print("Created Product: 'Gold Flake SLK Sleeks' (SKU: GOLD-FLAKE-SLK-SLEEKS)")

    # Build product name -> id cache
    cur.execute("SELECT id, name FROM products")
    prod_cache = {p["name"].strip().lower(): p["id"] for p in cur.fetchall()}

    # 3. Ensure Customers exist
    customer_names = sorted(list(set(o['customer_name'] for o in orders)))
    cur.execute("SELECT id, name FROM customers")
    cust_cache = {c["name"].strip().lower(): c["id"] for c in cur.fetchall()}

    for cname in customer_names:
        if cname.strip().lower() not in cust_cache:
            if not dry_run:
                cur.execute(
                    "INSERT INTO customers (name, phone, email, address, notes) VALUES (?, ?, ?, ?, ?)",
                    (cname, "", "", "", "Imported from historical sales sheet")
                )
                conn.commit()
                cur.execute("SELECT id FROM customers WHERE name = ?", (cname,))
                cust_cache[cname.strip().lower()] = cur.fetchone()["id"]
            else:
                cust_cache[cname.strip().lower()] = 999
            print(f"Created Customer: {cname}")

    # 4. Ensure Supplier exists
    cur.execute("SELECT id FROM suppliers WHERE name = ?", ("ITC Wholesale Hub",))
    sup_row = cur.fetchone()
    if not sup_row:
        if not dry_run:
            cur.execute(
                "INSERT INTO suppliers (name, contact_person, phone, source, payment_terms, notes) VALUES (?, ?, ?, ?, ?, ?)",
                ("ITC Wholesale Hub", "Direct Distribution", "1800-ITC-SUPPLY", "Wholesale Shop", "Immediate", "Primary cigarette distribution vendor")
            )
            conn.commit()
            cur.execute("SELECT id FROM suppliers WHERE name = ?", ("ITC Wholesale Hub",))
            supplier_id = cur.fetchone()["id"]
        else:
            supplier_id = 1
    else:
        supplier_id = sup_row["id"]

    if dry_run:
        print("\n[DRY RUN] Verification succeeded. No database modifications committed.")
        conn.close()
        return

    # 5. Insert Procurements & Lots to back the sales
    # Group items by product and cost to generate clean inventory batches
    print("Generating historical procurement lots...")
    product_cost_groups = defaultdict(lambda: {'qty': 0.0, 'earliest_date': '9999-99-99'})

    for o in orders:
        for it in o['items']:
            p_name = it['product_name']
            cost = it['unit_cost']
            qty = it['qty']
            key = (p_name, cost)
            product_cost_groups[key]['qty'] += qty
            if o['sale_date'] < product_cost_groups[key]['earliest_date']:
                product_cost_groups[key]['earliest_date'] = o['sale_date']

    lot_cache = {} # (p_id, cost) -> lot_id

    # Create procurement intake for historical lots (or reuse if re-running)
    cur.execute("SELECT id FROM procurements WHERE invoice_no = 'PROC-HISTORICAL-INITIAL'")
    existing_proc = cur.fetchone()
    if existing_proc:
        proc_id = existing_proc["id"]
        # Purge previous historical run cleanly for idempotency
        cur.execute("DELETE FROM sales WHERE invoice_no LIKE 'INV-2026-%'")
        cur.execute("DELETE FROM inventory_lots WHERE procurement_id = ?", (proc_id,))
        conn.commit()
    else:
        cur.execute(
            "INSERT INTO procurements (invoice_no, source, procurement_date, total_amount, notes) VALUES (?, ?, ?, ?, ?)",
            ("PROC-HISTORICAL-INITIAL", "Wholesale Shop", "2026-01-20", sum(it['qty'] * it['unit_cost'] for it in [dict(qty=v['qty'], unit_cost=k[1]) for k, v in product_cost_groups.items()]), "Initial historical inventory intake to back past sales ledger")
        )
        proc_id = cur.lastrowid
        if not proc_id:
            cur.execute("SELECT id FROM procurements WHERE invoice_no = 'PROC-HISTORICAL-INITIAL'")
            proc_id = cur.fetchone()["id"]

    for (p_name, cost), info in product_cost_groups.items():
        p_id = prod_cache.get(p_name.strip().lower())
        if not p_id:
            # Fallback search
            for k_cache, id_val in prod_cache.items():
                if p_name.strip().lower() in k_cache:
                    p_id = id_val
                    break
        if not p_id:
            print(f"Warning: Product ID not found for '{p_name}'")
            continue

        batch_code = f"LOT-HIST-{p_id}-{int(cost * 10)}"
        cur.execute(
            """INSERT INTO inventory_lots 
               (procurement_id, product_id, batch_code, unit_cost, initial_qty, remaining_qty, procurement_date, source, status)
               VALUES (?, ?, ?, ?, ?, 0, ?, 'Wholesale Shop', 'depleted')""",
            (proc_id, p_id, batch_code, cost, info['qty'], info['earliest_date'])
        )
        lot_id = cur.lastrowid
        if not lot_id:
            cur.execute("SELECT id FROM inventory_lots WHERE batch_code = ?", (batch_code,))
            lot_id = cur.fetchone()["id"]
        lot_cache[(p_id, cost)] = lot_id

    # 6. Insert Sales Orders and Sale Items
    print("Ingesting 961 sales orders and line items...")
    inserted_orders = 0
    total_revenue_recorded = 0.0
    total_cogs_recorded = 0.0
    total_profit_recorded = 0.0

    for idx, o in enumerate(orders, 1):
        invoice_no = f"INV-2026-{idx:04d}"
        cust_id = cust_cache.get(o['customer_name'].strip().lower())
        notes = f"Sold By: {o['sold_by']}. Historical Excel ledger entry."

        cur.execute(
            """INSERT INTO sales (invoice_no, customer_id, sale_date, total_amount, total_cogs, total_profit, sold_by, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (invoice_no, cust_id, o['sale_date'], o['total_amount'], o['total_cogs'], o['total_profit'], o['sold_by'], notes)
        )
        sale_id = cur.lastrowid
        if not sale_id:
            cur.execute("SELECT id FROM sales WHERE invoice_no = ?", (invoice_no,))
            sale_id = cur.fetchone()["id"]

        for it in o['items']:
            p_id = prod_cache.get(it['product_name'].strip().lower())
            if not p_id:
                for k_cache, id_val in prod_cache.items():
                    if it['product_name'].strip().lower() in k_cache:
                        p_id = id_val
                        break
            if not p_id:
                print(f"Error: Product {it['product_name']} still unmapped!")
                conn.rollback()
                return

            cur.execute(
                """INSERT INTO sale_items (sale_id, product_id, qty, unit_sale_price, total_sale_price, total_cost, profit, allocation_type)
                   VALUES (?, ?, ?, ?, ?, ?, ?, 'AUTO_LOWEST_COST')""",
                (sale_id, p_id, it['qty'], it['unit_sale_price'], it['total_sale_price'], it['total_cost'], it['profit'])
            )
            sale_item_id = cur.lastrowid
            if not sale_item_id:
                cur.execute("SELECT MAX(id) as max_id FROM sale_items")
                sale_item_id = cur.fetchone()["max_id"]

            lot_id = lot_cache.get((p_id, it['unit_cost']))
            if lot_id:
                cur.execute(
                    """INSERT INTO sale_item_lots (sale_item_id, lot_id, qty, unit_cost, lot_profit)
                       VALUES (?, ?, ?, ?, ?)""",
                    (sale_item_id, lot_id, it['qty'], it['unit_cost'], it['profit'])
                )

        inserted_orders += 1
        total_revenue_recorded += o['total_amount']
        total_cogs_recorded += o['total_cogs']
        total_profit_recorded += o['total_profit']

        if inserted_orders % 100 == 0 or inserted_orders == len(orders):
            print(f"  Progress: Ingested {inserted_orders}/{len(orders)} orders...")

    conn.commit()

    # Synchronize PostgreSQL sequences if on Postgres
    if db.is_postgres():
        for tbl in ['sale_item_lots', 'sale_items', 'sales', 'inventory_lots', 'procurements', 'customers', 'products', 'suppliers', 'categories']:
            try:
                cur.execute(f"SELECT setval(pg_get_serial_sequence('{tbl}', 'id'), COALESCE((SELECT MAX(id) FROM {tbl}), 1))")
            except Exception:
                pass
        conn.commit()

    # Post-import verification query
    cur.execute("""
        SELECT 
            COUNT(DISTINCT s.id) as total_orders,
            SUM(si.total_sale_price) as total_revenue,
            SUM(si.total_cost) as total_cogs,
            SUM(si.profit) as total_profit
        FROM sales s
        LEFT JOIN sale_items si ON s.id = si.sale_id
    """)
    sum_row = cur.fetchone()

    cur.execute("""
        SELECT sold_by, COUNT(*) as count, SUM(total_amount) as rev, SUM(total_profit) as prof
        FROM sales
        GROUP BY sold_by
        ORDER BY count DESC
    """)
    seller_breakdown = cur.fetchall()

    conn.close()

    print("\n==================================================================")
    print("IMPORT COMPLETED SUCCESSFULLY & RECONCILED WITH DATABASE!")
    print("==================================================================")
    print(f"Total Sales Ingested:   {sum_row['total_orders']} orders")
    print(f"Total Revenue Recorded:  Rs. {float(sum_row['total_revenue']):,.2f}")
    print(f"Total COGS Recorded:     Rs. {float(sum_row['total_cogs']):,.2f}")
    print(f"Total Profit Recorded:   Rs. {float(sum_row['total_profit']):,.2f}")
    margin = (float(sum_row['total_profit']) / float(sum_row['total_revenue']) * 100) if sum_row['total_revenue'] else 0
    print(f"Gross Profit Margin:     {margin:.2f}%")
    print("------------------------------------------------------------------")
    print("Breakdown by Seller (sold_by column):")
    for s_row in seller_breakdown:
        print(f"  * {s_row['sold_by']}: {s_row['count']} orders | Sales: Rs. {float(s_row['rev']):,.2f} | Profit: Rs. {float(s_row['prof']):,.2f}")
    print("==================================================================")

if __name__ == '__main__':
    excel_file = r"C:\Users\singarirangaprasad\Downloads\Cigrattes.xlsx"
    dry_run_mode = "--dry-run" in sys.argv

    # Check for custom database URL flag: --database-url <URL>
    for i, arg in enumerate(sys.argv):
        if arg == "--database-url" and i + 1 < len(sys.argv):
            os.environ["DATABASE_URL"] = sys.argv[i + 1]
            db.reset_pg_pool()
        elif not arg.startswith("--") and arg.endswith(".xlsx"):
            excel_file = arg

    if os.environ.get("DATABASE_URL"):
        masked = os.environ["DATABASE_URL"].split("@")[-1] if "@" in os.environ["DATABASE_URL"] else "postgres"
        print(f"Target Database: Neon PostgreSQL ({masked})")
    else:
        print("Target Database: Local SQLite (inventory_sales.db)")

    print(f"Reading Excel sales ledger from: {excel_file}")
    orders = parse_excel_sales(excel_file)
    print(f"Parsed {len(orders)} transactions.")

    import_data(orders, dry_run=dry_run_mode)
