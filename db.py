"""
db.py - Database Schema and Initialization for Multi-Batch Inventory & Sales System
Supports Dual Database Engines:
1. Production: PostgreSQL (via psycopg2-binary, enabled when DATABASE_URL is set)
2. Development / Testing: SQLite (standalone file/in-memory, default fallback)
"""

import sqlite3
import os
import re
import json
from datetime import datetime, timedelta

def is_postgres():
    """Returns True if a PostgreSQL DATABASE_URL is configured."""
    return bool(os.environ.get("DATABASE_URL"))

_pg_pool = None

def _resolve_host_if_needed(db_url):
    """If the hostname in db_url cannot be resolved by standard DNS, try resolving via public DNS."""
    if not db_url:
        return db_url
    try:
        import urllib.parse
        import socket
        import subprocess
        import re

        parsed = urllib.parse.urlparse(db_url)
        host = parsed.hostname
        if not host:
            return db_url
        try:
            socket.gethostbyname(host)
            return db_url
        except Exception:
            # Fallback to nslookup with 8.8.8.8
            res = subprocess.run(['nslookup', host, '8.8.8.8'], capture_output=True, text=True, timeout=5)
            all_ips = re.findall(r'\b(?:\d{1,3}\.){3}\d{1,3}\b', res.stdout)
            neon_ips = [ip for ip in all_ips if ip != '8.8.8.8']
            if neon_ips and 'hostaddr=' not in db_url:
                sep = '&' if '?' in db_url else '?'
                return f"{db_url}{sep}hostaddr={neon_ips[0]}"
    except Exception as ex:
        pass
    return db_url

def reset_pg_pool():
    """Reset and close existing connection pool if any."""
    global _pg_pool
    if _pg_pool is not None:
        try:
            _pg_pool.closeall()
        except Exception:
            pass
        _pg_pool = None

def get_pg_pool():
    """Lazy initialize and return ThreadedConnectionPool for PostgreSQL."""
    global _pg_pool
    if _pg_pool is None:
        db_url = os.environ.get("DATABASE_URL")
        if not db_url:
            return None
        import psycopg2
        from psycopg2.pool import ThreadedConnectionPool
        if db_url.startswith("postgres://"):
            db_url = db_url.replace("postgres://", "postgresql://", 1)
        db_url = _resolve_host_if_needed(db_url)
        _pg_pool = ThreadedConnectionPool(minconn=1, maxconn=10, dsn=db_url)
    return _pg_pool

class PgCursorWrapper:
    """Cursor wrapper adapting SQLite conventions to PostgreSQL."""
    def __init__(self, raw_cur, conn_wrapper):
        self._cur = raw_cur
        self._conn_wrapper = conn_wrapper
        self._lastrowid = None

    @property
    def lastrowid(self):
        return self._lastrowid

    @property
    def rowcount(self):
        return self._cur.rowcount

    def _adapt_sql(self, sql):
        s = sql.strip()
        if s.upper().startswith("PRAGMA"):
            return "SELECT 1"
        if re.search(r"INSERT\s+OR\s+IGNORE\s+INTO", s, re.IGNORECASE):
            s = re.sub(r"INSERT\s+OR\s+IGNORE\s+INTO", "INSERT INTO", s, flags=re.IGNORECASE)
            if "ON CONFLICT" not in s.upper():
                s = s + " ON CONFLICT DO NOTHING"
        s = re.sub(r"datetime\('now',\s*'localtime'\)", "CURRENT_TIMESTAMP", s, flags=re.IGNORECASE)
        # Adapt SQLite strftime to PostgreSQL TO_CHAR
        s = re.sub(r"strftime\s*\(\s*'%Y-%m-%d'\s*,\s*([^)]+)\)", r"TO_CHAR(\1, 'YYYY-MM-DD')", s, flags=re.IGNORECASE)
        s = re.sub(r"strftime\s*\(\s*'%Y-W%W'\s*,\s*([^)]+)\)", r"TO_CHAR(\1, 'IYYY-\"W\"IW')", s, flags=re.IGNORECASE)
        s = re.sub(r"strftime\s*\(\s*'%Y-%m'\s*,\s*([^)]+)\)", r"TO_CHAR(\1, 'YYYY-MM')", s, flags=re.IGNORECASE)
        s = re.sub(r"strftime\s*\(\s*'%Y'\s*,\s*([^)]+)\)", r"TO_CHAR(\1, 'YYYY')", s, flags=re.IGNORECASE)
        s = s.replace("?", "%s")
        return s

    def execute(self, sql, params=None):
        adapted = self._adapt_sql(sql)
        is_insert = adapted.strip().upper().startswith("INSERT INTO")
        has_returning = "RETURNING" in adapted.upper()

        if is_insert and not has_returning:
            sql_to_run = adapted + " RETURNING id"
            try:
                if params is not None:
                    self._cur.execute(sql_to_run, tuple(params))
                else:
                    self._cur.execute(sql_to_run)
                row = self._cur.fetchone()
                if row:
                    self._lastrowid = row.get("id") if isinstance(row, dict) else row[0]
                return self
            except Exception:
                self._conn_wrapper._raw_conn.rollback()
                self._lastrowid = None
                if params is not None:
                    self._cur.execute(adapted, tuple(params))
                else:
                    self._cur.execute(adapted)
                return self
        else:
            if params is not None:
                self._cur.execute(adapted, tuple(params))
            else:
                self._cur.execute(adapted)
            return self

    def executemany(self, sql, params_seq):
        adapted = self._adapt_sql(sql)
        for p in params_seq:
            self.execute(adapted, p)
        return self

    def fetchone(self):
        row = self._cur.fetchone()
        if row is None:
            return None
        return dict(row)

    def fetchall(self):
        rows = self._cur.fetchall()
        return [dict(r) for r in rows]

    def close(self):
        self._cur.close()

class PgConnectionWrapper:
    """Connection wrapper ensuring thread pooling and dict cursor factory."""
    def __init__(self, raw_conn, pool):
        self._raw_conn = raw_conn
        self._pool = pool
        self._closed = False

    def cursor(self):
        from psycopg2.extras import RealDictCursor
        raw_cur = self._raw_conn.cursor(cursor_factory=RealDictCursor)
        return PgCursorWrapper(raw_cur, self)

    def commit(self):
        self._raw_conn.commit()

    def rollback(self):
        self._raw_conn.rollback()

    def execute(self, sql, params=None):
        cur = self.cursor()
        return cur.execute(sql, params)

    def close(self):
        if not self._closed:
            self._closed = True
            if self._pool:
                self._pool.putconn(self._raw_conn)
            else:
                self._raw_conn.close()

def get_db_path():
    """Determine database file path with persistent volume mount support."""
    if os.environ.get("DB_FILE"):
        return os.environ.get("DB_FILE")
    # Check if /data persistent volume is mounted (Cloud Storage FUSE or Docker volume)
    if os.path.exists("/data") and os.access("/data", os.W_OK):
        return "/data/inventory_sales.db"
    if os.environ.get("DATA_DIR"):
        return os.path.join(os.environ.get("DATA_DIR"), "inventory_sales.db")
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), "inventory_sales.db")

DB_FILE = get_db_path()

def get_connection():
    """Return database connection: PostgreSQL pool if DATABASE_URL is set, else SQLite."""
    if is_postgres():
        pool = get_pg_pool()
        raw_conn = pool.getconn()
        return PgConnectionWrapper(raw_conn, pool)

    db_path = get_db_path() if DB_FILE == "" else DB_FILE
    parent_dir = os.path.dirname(os.path.abspath(db_path))
    if parent_dir and not os.path.exists(parent_dir):
        os.makedirs(parent_dir, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def load_store_catalog(conn):
    """Load real store catalog snapshot from data/store_catalog.json if database is empty."""
    cur = conn.cursor()
    cat_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "store_catalog.json")
    if not os.path.exists(cat_file):
        return
    try:
        import json
        with open(cat_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        prods = data.get("products", [])
        for p in prods:
            cur.execute(
                "INSERT OR IGNORE INTO products (id, name, sku, category, unit, min_stock, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (p["id"], p["name"], p["sku"], p.get("category", "General"), p.get("unit", "pcs"), p.get("min_stock", 1), p.get("created_at", datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
            )
        for c in data.get("categories", []):
            cur.execute("INSERT OR IGNORE INTO categories (id, name, description, icon) VALUES (?, ?, ?, ?)",
                        (c["id"], c["name"], c.get("description", ""), c.get("icon", "")))
        for cu in data.get("customers", []):
            cur.execute("INSERT OR IGNORE INTO customers (id, name, phone, email, address, credit_limit, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
                        (cu["id"], cu["name"], cu.get("phone", ""), cu.get("email", ""), cu.get("address", ""), cu.get("credit_limit", 0.0), cu.get("notes", "")))
        for su in data.get("suppliers", []):
            cur.execute("INSERT OR IGNORE INTO suppliers (id, name, contact_person, phone, email, address, payment_terms) VALUES (?, ?, ?, ?, ?, ?, ?)",
                        (su["id"], su["name"], su.get("contact_person", ""), su.get("phone", ""), su.get("email", ""), su.get("address", ""), su.get("payment_terms", "")))
        conn.commit()
        if prods:
            print(f"Bootstrapped {len(prods)} real catalog products from store_catalog.json")
    except Exception as e:
        print(f"Notice: store_catalog.json load skipped: {e}")

def _init_postgres_db(seed_if_empty=False):
    """Initialize PostgreSQL tables, relations, and indices (zero-wipe guarantee)."""
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        sku VARCHAR(100) NOT NULL UNIQUE,
        category VARCHAR(100) NOT NULL,
        unit VARCHAR(50) NOT NULL DEFAULT 'pcs',
        min_stock INTEGER NOT NULL DEFAULT 5,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        email VARCHAR(255),
        address TEXT,
        credit_limit NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS suppliers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        contact_person VARCHAR(255),
        phone VARCHAR(50),
        email VARCHAR(255),
        address TEXT,
        source VARCHAR(100) DEFAULT 'Wholesale Shop',
        payment_terms VARCHAR(100) DEFAULT '30 days',
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        icon VARCHAR(50) DEFAULT '📦',
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS procurements (
        id SERIAL PRIMARY KEY,
        invoice_no VARCHAR(100) NOT NULL UNIQUE,
        source VARCHAR(100) NOT NULL,
        procurement_date DATE NOT NULL,
        total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS inventory_lots (
        id SERIAL PRIMARY KEY,
        procurement_id INTEGER REFERENCES procurements(id) ON DELETE SET NULL,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        batch_code VARCHAR(100) NOT NULL,
        unit_cost NUMERIC(12, 2) NOT NULL,
        initial_qty NUMERIC(12, 2) NOT NULL,
        remaining_qty NUMERIC(12, 2) NOT NULL,
        procurement_date DATE NOT NULL,
        source VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        invoice_no VARCHAR(100) NOT NULL UNIQUE,
        customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
        sale_date DATE NOT NULL,
        total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
        total_cogs NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
        total_profit NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
        sold_by VARCHAR(255) DEFAULT 'Store Staff',
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sale_items (
        id SERIAL PRIMARY KEY,
        sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        qty NUMERIC(12, 2) NOT NULL,
        unit_sale_price NUMERIC(12, 2) NOT NULL,
        total_sale_price NUMERIC(12, 2) NOT NULL,
        total_cost NUMERIC(12, 2) NOT NULL,
        profit NUMERIC(12, 2) NOT NULL,
        allocation_type VARCHAR(50) NOT NULL DEFAULT 'AUTO_LOWEST_COST'
    );

    CREATE TABLE IF NOT EXISTS sale_item_lots (
        id SERIAL PRIMARY KEY,
        sale_item_id INTEGER NOT NULL REFERENCES sale_items(id) ON DELETE CASCADE,
        lot_id INTEGER NOT NULL REFERENCES inventory_lots(id) ON DELETE RESTRICT,
        qty NUMERIC(12, 2) NOT NULL,
        unit_cost NUMERIC(12, 2) NOT NULL,
        lot_profit NUMERIC(12, 2) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS system_meta (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_lots_product_cost ON inventory_lots(product_id, unit_cost, remaining_qty);
    CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
    CREATE INDEX IF NOT EXISTS idx_procurements_date ON procurements(procurement_date);
    """)
    try:
        cur.execute("ALTER TABLE sales ADD COLUMN IF NOT EXISTS sold_by VARCHAR(255) DEFAULT 'Store Staff'")
        conn.commit()
    except Exception:
        pass

    conn.commit()

    # Check if products already exist
    cur.execute("SELECT COUNT(*) as count FROM products")
    row = cur.fetchone()
    count = row["count"] if row else 0

    if count == 0:
        if seed_if_empty:
            seed_data(conn)
            cur.execute("INSERT INTO system_meta (key, value) VALUES ('initialized', 'seeded') ON CONFLICT (key) DO UPDATE SET value = 'seeded'")
        else:
            load_store_catalog(conn)
            cur.execute("INSERT INTO system_meta (key, value) VALUES ('initialized', 'ready') ON CONFLICT (key) DO UPDATE SET value = 'ready'")
        conn.commit()

    # Sync sequences so SERIAL id generation starts after imported records
    for tbl in ['sale_item_lots', 'sale_items', 'sales', 'inventory_lots', 'procurements', 'customers', 'products', 'suppliers', 'categories']:
        try:
            cur.execute(f"SELECT setval(pg_get_serial_sequence('{tbl}', 'id'), COALESCE((SELECT MAX(id) FROM {tbl}), 1))")
        except Exception:
            pass

    conn.commit()
    conn.close()
    print("PostgreSQL Database initialized successfully (persistent mode).")

def _init_sqlite_db(seed_if_empty=False):
    """Initialize SQLite database tables and indices without seeding (starts from zero)."""
    conn = get_connection()
    cur = conn.cursor()

    # 1. Products
    cur.execute("""
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        sku TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL,
        unit TEXT NOT NULL DEFAULT 'pcs',
        min_stock INTEGER NOT NULL DEFAULT 5,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
    """)

    # 2. Customers
    cur.execute("""
    CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        credit_limit REAL NOT NULL DEFAULT 0.0,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
    """)
    try:
        cur.execute("ALTER TABLE customers ADD COLUMN credit_limit REAL NOT NULL DEFAULT 0.0")
    except sqlite3.OperationalError:
        pass
    try:
        cur.execute("ALTER TABLE customers ADD COLUMN notes TEXT")
    except sqlite3.OperationalError:
        pass

    # 2b. Suppliers / Vendors
    cur.execute("""
    CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        contact_person TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        source TEXT DEFAULT 'Wholesale Shop',
        payment_terms TEXT DEFAULT '30 days',
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
    """)
    try:
        cur.execute("ALTER TABLE suppliers ADD COLUMN source TEXT DEFAULT 'Wholesale Shop'")
    except sqlite3.OperationalError:
        pass

    # 2c. Categories (hierarchical with parent_id)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        parent_id INTEGER,
        icon TEXT DEFAULT '📦',
        description TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
    )
    """)

    # 3. Procurements (Stock In Invoices)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS procurements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_no TEXT NOT NULL UNIQUE,
        source TEXT NOT NULL, -- 'E-Commerce', 'Quick Commerce', 'Wholesale Shop', 'Other'
        procurement_date TEXT NOT NULL,
        total_amount REAL NOT NULL DEFAULT 0.0,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
    """)

    # 4. Inventory Lots (Batches with distinct procurement costs)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS inventory_lots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        procurement_id INTEGER,
        product_id INTEGER NOT NULL,
        batch_code TEXT NOT NULL,
        unit_cost REAL NOT NULL,
        initial_qty REAL NOT NULL,
        remaining_qty REAL NOT NULL,
        procurement_date TEXT NOT NULL,
        source TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active', -- 'active', 'depleted'
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (procurement_id) REFERENCES procurements(id) ON DELETE SET NULL,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
    """)

    # 5. Sales (Invoices)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_no TEXT NOT NULL UNIQUE,
        customer_id INTEGER,
        sale_date TEXT NOT NULL,
        total_amount REAL NOT NULL DEFAULT 0.0,
        total_cogs REAL NOT NULL DEFAULT 0.0,
        total_profit REAL NOT NULL DEFAULT 0.0,
        sold_by TEXT DEFAULT 'Store Staff',
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
    )
    """)
    try:
        cur.execute("ALTER TABLE sales ADD COLUMN sold_by TEXT DEFAULT 'Store Staff'")
        conn.commit()
    except sqlite3.OperationalError:
        pass

    # 6. Sale Items (Line items on sale invoice)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        qty REAL NOT NULL,
        unit_sale_price REAL NOT NULL,
        total_sale_price REAL NOT NULL,
        total_cost REAL NOT NULL,
        profit REAL NOT NULL,
        allocation_type TEXT NOT NULL DEFAULT 'AUTO_LOWEST_COST', -- 'AUTO_LOWEST_COST' or 'MANUAL'
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    )
    """)

    # 7. Sale Item Lots (Granular lineage: exact lots billed for each sale item)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS sale_item_lots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_item_id INTEGER NOT NULL,
        lot_id INTEGER NOT NULL,
        qty REAL NOT NULL,
        unit_cost REAL NOT NULL,
        lot_profit REAL NOT NULL,
        FOREIGN KEY (sale_item_id) REFERENCES sale_items(id) ON DELETE CASCADE,
        FOREIGN KEY (lot_id) REFERENCES inventory_lots(id) ON DELETE RESTRICT
    )
    """)

    # Indices for high performance
    cur.execute("CREATE INDEX IF NOT EXISTS idx_lots_product_cost ON inventory_lots(product_id, unit_cost, remaining_qty)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_procurements_date ON procurements(procurement_date)")

    # System metadata table to remember explicit clean state
    cur.execute("""
    CREATE TABLE IF NOT EXISTS system_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    """)
    conn.commit()

    # Check if database has products or was explicitly cleared
    cur.execute("SELECT value FROM system_meta WHERE key = 'initialized'")
    meta = cur.fetchone()

    if meta is None:
        # First-time initialization
        cur.execute("SELECT COUNT(*) as count FROM products")
        if cur.fetchone()["count"] == 0:
            if seed_if_empty:
                seed_data(conn)
                cur.execute("INSERT OR REPLACE INTO system_meta (key, value) VALUES ('initialized', 'seeded')")
            else:
                load_store_catalog(conn)
                cur.execute("INSERT OR REPLACE INTO system_meta (key, value) VALUES ('initialized', 'ready')")
            conn.commit()
        else:
            cur.execute("INSERT OR REPLACE INTO system_meta (key, value) VALUES ('initialized', 'ready')")
            conn.commit()
    elif meta["value"] == "clean":
        # Database was explicitly cleared by user; do NOT re-seed
        pass
    elif meta["value"] == "seeded":
        cur.execute("SELECT COUNT(*) as count FROM products")
        if cur.fetchone()["count"] == 0 and seed_if_empty:
            seed_data(conn)

    conn.close()

def init_db(seed_if_empty=False):
    """Initialize database tables and indices without wiping existing data."""
    if is_postgres():
        _init_postgres_db(seed_if_empty)
    else:
        _init_sqlite_db(seed_if_empty)

def clear_all_data(conn=None):
    """
    Clears all application data (sales, procurements, lots, customers, products)
    and resets auto-increment sequences so the user can start completely fresh.
    """
    close_at_end = False
    if conn is None:
        conn = get_connection()
        close_at_end = True

    cur = conn.cursor()
    if is_postgres():
        cur.execute("TRUNCATE TABLE sale_item_lots, sale_items, sales, inventory_lots, procurements, customers, products, suppliers, categories RESTART IDENTITY CASCADE")
        cur.execute("INSERT INTO system_meta (key, value) VALUES ('initialized', 'clean') ON CONFLICT (key) DO UPDATE SET value = 'clean'")
        conn.commit()
    else:
        cur.execute("PRAGMA foreign_keys = OFF")
        cur.execute("DELETE FROM sale_item_lots")
        cur.execute("DELETE FROM sale_items")
        cur.execute("DELETE FROM sales")
        cur.execute("DELETE FROM inventory_lots")
        cur.execute("DELETE FROM procurements")
        cur.execute("DELETE FROM customers")
        cur.execute("DELETE FROM products")
        cur.execute("DELETE FROM suppliers")
        cur.execute("DELETE FROM categories")
        cur.execute("DELETE FROM sqlite_sequence WHERE name IN ('sale_item_lots', 'sale_items', 'sales', 'inventory_lots', 'procurements', 'customers', 'products', 'suppliers', 'categories')")
        cur.execute("CREATE TABLE IF NOT EXISTS system_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
        cur.execute("INSERT OR REPLACE INTO system_meta (key, value) VALUES ('initialized', 'clean')")
        cur.execute("PRAGMA foreign_keys = ON")
        conn.commit()

    if close_at_end:
        conn.close()
    print("All application data successfully cleared. Store is fresh and ready for new entries.")

def seed_data(conn):
    """Seed initial realistic products, procurements across different prices & sources, and sales."""
    cur = conn.cursor()
    print("Seeding realistic sample data...")

    # Seed Products
    products = [
        ("Wireless Optical Mouse", "TECH-MOU-01", "Electronics", "pcs", 5),
        ("Mechanical Gaming Keyboard", "TECH-KEY-02", "Electronics", "pcs", 3),
        ("USB-C Fast Charging Hub 7-in-1", "TECH-HUB-03", "Accessories", "pcs", 5),
        ("Noise-Cancelling Headphones", "AUD-HEA-04", "Audio", "pcs", 2),
        ("Ergonomic Aluminium Laptop Stand", "ACC-STA-05", "Accessories", "pcs", 4),
        ("Premium Arabica Coffee Beans 500g", "GRO-COF-06", "Groceries", "bag", 8),
        ("Smart LED Desk Lamp", "HOM-LMP-07", "Home & Office", "pcs", 3)
    ]
    cur.executemany("INSERT INTO products (name, sku, category, unit, min_stock) VALUES (?, ?, ?, ?, ?)", products)

    # Seed Customers
    customers = [
        ("Walk-in Customer", "9999999999", "walkin@store.local", "In-Store Counter"),
        ("Acme Tech Solutions", "9876543210", "procurement@acmetech.com", "42 Silicon Valley Blvd"),
        ("Rahul Sharma", "9823114455", "rahul.sharma@example.com", "Flat 302, Green Meadows"),
        ("Priya Nair", "9711223344", "priya.nair@example.com", "Apex Towers, Unit 12B"),
        ("Nexus Co-working Space", "9123456780", "admin@nexuswork.in", "Cyber City Phase 2")
    ]
    cur.executemany("INSERT INTO customers (name, phone, email, address) VALUES (?, ?, ?, ?)", customers)

    # Prepare historical procurement dates
    today = datetime.now()
    d_m2 = (today - timedelta(days=60)).strftime("%Y-%m-%d")
    d_m1 = (today - timedelta(days=30)).strftime("%Y-%m-%d")
    d_w2 = (today - timedelta(days=14)).strftime("%Y-%m-%d")
    d_w1 = (today - timedelta(days=7)).strftime("%Y-%m-%d")
    d_yesterday = (today - timedelta(days=1)).strftime("%Y-%m-%d")
    d_today = today.strftime("%Y-%m-%d")

    procurements_data = [
        {
            "invoice_no": "PROC-2026-001",
            "source": "Wholesale Shop",
            "date": d_m2,
            "notes": "Bulk initial stock intake from Metro Wholesale Hub",
            "items": [
                (1, 25, 7.50, "LOT-MOU-01A"),
                (2, 10, 35.00, "LOT-KEY-01A")
            ]
        },
        {
            "invoice_no": "PROC-2026-002",
            "source": "Wholesale Shop",
            "date": d_m1,
            "notes": "Accessories & Audio wholesale shipment",
            "items": [
                (3, 20, 12.50, "LOT-HUB-01A"),
                (4, 8, 55.00, "LOT-HEA-01A")
            ]
        },
        {
            "invoice_no": "PROC-2026-003",
            "source": "E-Commerce",
            "date": d_m1,
            "notes": "Online flash deal restocking",
            "items": [
                (1, 15, 9.00, "LOT-MOU-01B")
            ]
        },
        {
            "invoice_no": "PROC-2026-004",
            "source": "Wholesale Shop",
            "date": d_w2,
            "notes": "Mid-month accessories & coffee stock",
            "items": [
                (2, 8, 42.00, "LOT-KEY-01B"),
                (5, 15, 18.00, "LOT-STA-01A"),
                (6, 25, 8.00, "LOT-COF-01A"),
                (7, 12, 24.00, "LOT-LMP-01A")
            ]
        },
        {
            "invoice_no": "PROC-2026-005",
            "source": "Quick Commerce",
            "date": d_w1,
            "notes": "Urgent same-day restock via Quick Commerce",
            "items": [
                (1, 10, 11.20, "LOT-MOU-01C"),
                (3, 10, 15.00, "LOT-HUB-01B")
            ]
        },
        {
            "invoice_no": "PROC-2026-006",
            "source": "Quick Commerce",
            "date": d_yesterday,
            "notes": "Quick commerce urgent weekend supply",
            "items": [
                (5, 8, 22.00, "LOT-STA-01B"),
                (6, 15, 10.50, "LOT-COF-01B")
            ]
        },
        {
            "invoice_no": "PROC-2026-007",
            "source": "E-Commerce",
            "date": d_today,
            "notes": "Premium headphones delivery",
            "items": [
                (4, 5, 62.00, "LOT-HEA-01B")
            ]
        }
    ]

    for p in procurements_data:
        total_amt = sum(qty * cost for _, qty, cost, _ in p["items"])
        cur.execute(
            "INSERT INTO procurements (invoice_no, source, procurement_date, total_amount, notes) VALUES (?, ?, ?, ?, ?)",
            (p["invoice_no"], p["source"], p["date"], total_amt, p["notes"])
        )
        proc_id = cur.lastrowid
        for prod_id, qty, cost, batch_code in p["items"]:
            cur.execute(
                """INSERT INTO inventory_lots
                (procurement_id, product_id, batch_code, unit_cost, initial_qty, remaining_qty, procurement_date, source, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')""",
                (proc_id, prod_id, batch_code, cost, qty, qty, p["date"], p["source"])
            )

    # Seed Sample Completed Sales (demonstrating Lowest-Cost-First billing)
    seed_sale(cur, invoice_no="INV-2026-001", customer_id=2, sale_date=d_m1, notes="Corporate bulk setup order", items=[
        {"product_id": 1, "qty": 12, "unit_sale_price": 15.00},
        {"product_id": 2, "qty": 4, "unit_sale_price": 65.00}
    ])

    seed_sale(cur, invoice_no="INV-2026-002", customer_id=3, sale_date=d_w2, notes="Office lab refurbishment", items=[
        {"product_id": 1, "qty": 15, "unit_sale_price": 16.00},
        {"product_id": 3, "qty": 6, "unit_sale_price": 25.00}
    ])

    seed_sale(cur, invoice_no="INV-2026-003", customer_id=4, sale_date=d_w1, notes="Home office kit", items=[
        {"product_id": 4, "qty": 2, "unit_sale_price": 95.00},
        {"product_id": 5, "qty": 3, "unit_sale_price": 32.00}
    ])

    seed_sale(cur, invoice_no="INV-2026-004", customer_id=5, sale_date=d_yesterday, notes="Co-working cafeteria & desk supply", items=[
        {"product_id": 6, "qty": 10, "unit_sale_price": 16.00},
        {"product_id": 7, "qty": 4, "unit_sale_price": 45.00}
    ])

    conn.commit()
    print("Database seeding completed successfully.")

def seed_sale(cur, invoice_no, customer_id, sale_date, notes, items, sold_by="Store Staff"):
    """Helper to simulate sale with Lowest-Cost-First allocation."""
    total_sale = 0.0
    total_cogs = 0.0

    cur.execute(
        "INSERT INTO sales (invoice_no, customer_id, sale_date, total_amount, total_cogs, total_profit, sold_by, notes) VALUES (?, ?, ?, 0, 0, 0, ?, ?)",
        (invoice_no, customer_id, sale_date, sold_by, notes)
    )
    sale_id = cur.lastrowid

    for item in items:
        prod_id = item["product_id"]
        req_qty = item["qty"]
        price = item["unit_sale_price"]
        item_total_sale = req_qty * price

        # Fetch available lots ordered by Lowest Cost First: unit_cost ASC, procurement_date ASC
        cur.execute(
            "SELECT id, unit_cost, remaining_qty FROM inventory_lots WHERE product_id = ? AND remaining_qty > 0 ORDER BY unit_cost ASC, procurement_date ASC",
            (prod_id,)
        )
        lots = cur.fetchall()

        item_cogs = 0.0
        allocated = []
        rem = req_qty
        for lot in lots:
            if rem <= 0:
                break
            take = min(rem, lot["remaining_qty"])
            allocated.append((lot["id"], take, lot["unit_cost"]))
            rem -= take
            item_cogs += take * lot["unit_cost"]

        if rem > 0:
            raise ValueError(f"Insufficient stock for product {prod_id}")

        item_profit = item_total_sale - item_cogs
        total_sale += item_total_sale
        total_cogs += item_cogs

        cur.execute(
            """INSERT INTO sale_items (sale_id, product_id, qty, unit_sale_price, total_sale_price, total_cost, profit, allocation_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'AUTO_LOWEST_COST')""",
            (sale_id, prod_id, req_qty, price, item_total_sale, item_cogs, item_profit)
        )
        sale_item_id = cur.lastrowid

        for lot_id, qty_taken, cost in allocated:
            lot_prof = (price - cost) * qty_taken
            cur.execute(
                "INSERT INTO sale_item_lots (sale_item_id, lot_id, qty, unit_cost, lot_profit) VALUES (?, ?, ?, ?, ?)",
                (sale_item_id, lot_id, qty_taken, cost, lot_prof)
            )
            cur.execute(
                "UPDATE inventory_lots SET remaining_qty = remaining_qty - ?, status = CASE WHEN remaining_qty - ? <= 0 THEN 'depleted' ELSE 'active' END WHERE id = ?",
                (qty_taken, qty_taken, lot_id)
            )

    cur.execute(
        "UPDATE sales SET total_amount = ?, total_cogs = ?, total_profit = ? WHERE id = ?",
        (total_sale, total_cogs, total_sale - total_cogs, sale_id)
    )

if __name__ == "__main__":
    import sys
    if "--clear" in sys.argv or "clear" in sys.argv:
        init_db(seed_if_empty=False)
        clear_all_data()
    elif "--seed" in sys.argv or "seed" in sys.argv:
        init_db(seed_if_empty=False)
        conn = get_connection()
        clear_all_data(conn)
        seed_data(conn)
        cur = conn.cursor()
        if is_postgres():
            cur.execute("INSERT INTO system_meta (key, value) VALUES ('initialized', 'seeded') ON CONFLICT (key) DO UPDATE SET value = 'seeded'")
        else:
            cur.execute("INSERT OR REPLACE INTO system_meta (key, value) VALUES ('initialized', 'seeded')")
        conn.commit()
        conn.close()
        print("Database seeded with sample data successfully.")
    else:
        init_db()
        if is_postgres():
            print("PostgreSQL Database initialized successfully.")
        else:
            print("Database initialized successfully at:", DB_FILE)
