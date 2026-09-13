# PR-023: First-Class `sold_by` Seller Tracking & Excel Sales Ledger Import

## Scope & Objective
1. **Dedicated Seller Tracking (`sold_by` Column)**:
   - Add a first-class `sold_by` column (`VARCHAR(255)` / `TEXT DEFAULT 'Store Staff'`) to the `sales` table in both PostgreSQL and SQLite.
   - Non-destructive, zero-downtime auto-migrations executed automatically upon initialization (`ALTER TABLE sales ADD COLUMN IF NOT EXISTS sold_by ...`).
   - Automatically bind the logged-in user's name (`currentUser.name`) during POS billing checkout so live transactions are permanently attributed to the active seller.
2. **Order History & Invoice Receipt Display**:
   - Add a dedicated **Sold By** column to the Orders table (`frontend/app/orders/page.tsx`) with accessible metadata badges.
   - Enable search filtering by seller name so operators can quickly search orders by "Surendra" or "Ranga Prasad".
   - Include seller name in the printable **Invoice Receipt** modal.
   - Support seller name display and updating in the Order Edit Drawer.
3. **Excel Sales Ledger Mapping**:
   - In `scripts/import_excel_sales.py`, map the Excel column `Sold By` directly into `sales.sold_by`.
   - Reconcile and report seller breakdown in post-import summaries:
     * `Surendra`: 609 orders (Rs. 3,132,089.02 revenue, Rs. 260,362.33 profit)
     * `Ranga Prasad`: 352 orders (Rs. 1,312,806.00 revenue, Rs. 124,547.77 profit)

---

## Architectural & Code Modifications

### 1. Database Layer (`db.py`)
- **PostgreSQL (`_init_postgres_db`)**:
  - Added `sold_by VARCHAR(255) DEFAULT 'Store Staff'` to `CREATE TABLE IF NOT EXISTS sales`.
  - Added safe auto-migration: `ALTER TABLE sales ADD COLUMN IF NOT EXISTS sold_by VARCHAR(255) DEFAULT 'Store Staff'`.
- **SQLite (`_init_sqlite_db`)**:
  - Added `sold_by TEXT DEFAULT 'Store Staff'` to `CREATE TABLE IF NOT EXISTS sales`.
  - Added safe auto-migration: `ALTER TABLE sales ADD COLUMN sold_by TEXT DEFAULT 'Store Staff'` wrapped in `sqlite3.OperationalError` handling.
- **Seeding (`seed_sale`)**:
  - Updated `seed_sale` signature and `INSERT INTO sales` to include `sold_by`.

### 2. Backend API (`server.py`)
- **`execute_sale`**:
  - Extracts `sold_by = body.get("sold_by", "").strip() or "Store Staff"`.
  - Inserts `sold_by` into `sales`.
  - Returns `sold_by` in the JSON response payload.
- **`PUT /api/sales/:id`**:
  - Reads `sold_by` from body (preserving existing if omitted) and includes it in `UPDATE sales`.
- **`GET /api/sales` and `GET /api/sales/:id`**:
  - Queries `SELECT s.*`, automatically serializing and returning `s.sold_by`.

### 3. Frontend POS Billing (`frontend/app/sales/page.tsx`)
- Reads `currentUser` from `useUIStore()`.
- Automatically attaches `sold_by: currentUser?.name || 'Store Staff'` to `salePayload`.
- Sets `soldBy: currentUser?.name || 'Store Staff'` in `CompletedSaleRecord`.

### 4. Frontend Orders & Invoice Receipt (`frontend/app/orders/page.tsx` & `frontend/components/InvoiceReceiptModal.tsx`)
- Extended `OrderListItem` and `CompletedSaleRecord` interfaces to include `sold_by` / `soldBy`.
- Added **Sold By** column header and row cell in the Orders table with icon and accessible text.
- Enhanced search filter to query `o.sold_by`.
- Added **Sold By** field in the Order Edit drawer.
- Displayed `Sold By` in the Invoice Receipt modal's customer and billing metadata grid.

### 5. Excel Import Script (`scripts/import_excel_sales.py`)
- Maps `o['sold_by']` directly to `sales.sold_by`.
- Ensures schema migrations run prior to ingestion.
- Added seller breakdown query and reporting to the reconciliation output.

---

## Test Verification Output

### 1. Backend Integration Tests (`test_suite.py`)
```bash
python test_suite.py
```
- Ran 43 tests in 1.894s: **100% PASS** (43/43 tests passing).
- Added `test_sold_by_seller_tracking_and_persistence` verifying explicit seller attribution, default fallback, and database round-trip.

### 2. Frontend Test Suite (`npm test -- --ci`)
```bash
npm test -- --ci
```
- Test Suites: **10 passed, 10 total**
- Tests: **136 passed, 136 total**
- Added test cases in `orders_history_a11y.test.ts` verifying seller filtering, receipt mapping, and accessibility invariants.

### 3. TypeScript Compilation
```bash
npx tsc --noEmit
```
- Clean compile with **0 errors**.

### 4. Local Database Excel Import & Reconciliation
```bash
python scripts/import_excel_sales.py
```
```
==================================================================
IMPORT COMPLETED SUCCESSFULLY & RECONCILED WITH DATABASE!
==================================================================
Total Sales Ingested:   961 orders
Total Revenue Recorded:  Rs. 4,444,895.01
Total COGS Recorded:     Rs. 4,059,984.92
Total Profit Recorded:   Rs. 384,910.09
Gross Profit Margin:     8.66%
------------------------------------------------------------------
Breakdown by Seller (sold_by column):
  * Surendra: 609 orders | Sales: Rs. 3,132,089.02 | Profit: Rs. 260,362.33
  * Ranga Prasad: 352 orders | Sales: Rs. 1,312,806.00 | Profit: Rs. 124,547.77
==================================================================
```
