# Developer Onboarding & Extension Guide

> **Target Audience**: Any developer joining the project with zero prior knowledge of this codebase or stack.

---

## 1. Prerequisites

You only need **Python 3.7+** installed on your system.
- **No Node.js / npm install required**: The React UI runs via CDN and browser-side transpilation.
- **No pip packages required**: The backend uses Python's built-in standard library (`http.server`, `sqlite3`, `json`, `urllib.parse`).

To verify your Python setup:
```bash
python --version
```
Any version $\ge 3.7$ is supported.

---

## 2. Launching the Application Locally

### Method A: One-Click (Windows)
Double-click `start.bat` in the project root folder. It will:
1. Initialize the SQLite database and seed realistic sample data (if not already present).
2. Launch your default web browser to `http://localhost:8000`.
3. Start the HTTP server.

### Method B: Command Line (Any OS)
```bash
# 1. Initialize database and sample records
python db.py

# 2. Start web and API server on port 8000
python server.py 8000
```
Then navigate to `http://localhost:8000` in Google Chrome, Edge, Firefox, or Safari.

---

## 3. How the Codebase is Organized

```
├── db.py                 # SQLite database definitions, migrations, and seed logic
├── server.py             # HTTP server, routing, REST endpoints & pure business logic
├── test_suite.py         # Automated unit & integration tests
├── index.html            # Single page app shell (Tailwind, Chart.js, React 18, Lucide)
├── static/
│   └── app.jsx           # React application code (components, state, POS, modals)
├── start.bat             # Windows launcher script
├── start.sh              # Unix/macOS launcher script
```

---

## 4. Key Workflows & Code Locations

### A. Procurement & Batch Creation
- **File**: `server.py` $\rightarrow$ `execute_procurement(conn, cur, body)`
- **How it works**: Takes an array of products, quantities, unit procurement costs, source (`Wholesale Shop`, `Quick Commerce`, `E-Commerce`), and date. Inserts a parent `procurements` row and child `inventory_lots` rows.

### B. Lowest-Cost-First (Cheapest-First) Allocation
- **File**: `server.py` $\rightarrow$ `simulate_sale(cur, body)` and `execute_sale(conn, cur, body)`
- **How it works**: Queries `inventory_lots` ordered by `unit_cost ASC, procurement_date ASC`. Exhausts cheaper lots first, splits across batches if required, and records the exact lots billed in `sale_item_lots`.

### C. Manual Lot Selection Override
- **File**: `server.py` $\rightarrow$ `execute_sale` (under `if mode == "MANUAL"`)
- **How it works**: Accepts specific `[{lot_id, qty}]` from the client, validates that quantities sum to the requested sale quantity and that each lot has sufficient stock, and records the sale.

### D. Granular Day-to-Year Analytics
- **File**: `server.py` $\rightarrow$ `handle_analytics_get(cur, query)`
- **How it works**: Uses SQLite `strftime` to group transactions by `day` (`%Y-%m-%d`), `week` (`%Y-W%W`), `month` (`%Y-%m`), or `year` (`%Y`), computing exact Revenue, COGS, Net Profit, and margin % per item and timeline bucket.

---

## 5. How to Run the Automated Test Suite

Run the test suite using Python's built-in `unittest`:
```bash
python test_suite.py
```
This suite runs 25 tests covering:
1. Seed data generation & integrity.
2. Multi-source procurement batches.
3. Automated Lowest-Cost-First allocation.
4. Multi-lot split billing.
5. Manual lot selection override & cross-product lot leakage prevention.
6. Out-of-stock validation & depletion to zero.
7. Granular analytics calculations (Day, Week, Month, Year).
8. Live HTTP REST API routes, MIME types, and CORS preflight.
9. Lexical integrity and duplicate identifier guards.
10. Accessible light-blue palette, WCAG 2.1 AA/AAA color-blind badges & modal (`test_e2e_12`).
11. Database clean slate wiping & no-reseed invariant (`test_e2e_13`).

---

## 6. Mandatory Quality Gate Rules

Every code change must adhere to the 4-step quality gate defined in `GEMINI.md` and `AGENTS.md`:
1. **Functional Review**: Business logic verification (Lowest-Cost-First, multi-batch, analytics).
2. **E2E Test Suite**: Run `python test_suite.py` with 100% pass rate.
3. **Critic Agent Review**: Independent adversarial audit by `critic_agent`.
4. **Documentation**: Record results in `AGENT_LOG.md`.

---

## 7. How to Extend the Application

### Adding a New Field to Products (e.g. `barcode` or `tax_rate`)
1. **Update Schema**: Open `db.py` and add the column to `CREATE TABLE IF NOT EXISTS products`.
2. **Update API**: Open `server.py` $\rightarrow$ `handle_api_post` for `/api/products` to read the new field.
3. **Update Frontend**: Open `static/app.jsx` $\rightarrow$ `ProductModal` to add the new input field.

### Adding a New Procurement Source
- In `static/app.jsx` $\rightarrow$ `ProcurementView`, add your new source to the `<select>` options.
- In `static/app.jsx` $\rightarrow$ `SourceBadge`, add custom Tailwind badge styling for that source.

---

## 7. Troubleshooting

- **Port 8000 already in use**:
  Run on a different port:
  ```bash
  python server.py 8080
  ```
- **Reset Database to Clean State (Start Fresh)**:
  Run:
  ```bash
  python clear_db.py
  # or
  python db.py --clear
  ```
  This cleanly purges all products, customers, lots, procurements, and sales, resets auto-increment IDs to 1, and marks the database as clean so server restarts will not re-populate demo data.

- **Re-Seed Demo Sample Data**:
  Run:
  ```bash
  python db.py --seed
  ```
