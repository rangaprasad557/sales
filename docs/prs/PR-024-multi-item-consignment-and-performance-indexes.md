# PR-024: Multi-Item Consignment Manifest Support & High-Performance Database Indexes

## 1. Overview & Objective
This PR addresses two critical requirements:
1. **Multi-Item Consignment Support in Procurement**:
   - When viewing/editing a procurement containing multiple catalogue products and inventory lots (such as PROC-HISTORICAL-INITIAL containing 143 lots across 23 products imported from the sales records), the edit drawer previously displayed only p.items[0] (Classic Connect).
   - The edit drawer now features a full **Multi-Item Consignment Manifest** experience:
     - Expanded width (xl / max-w-4xl) for high visual density and clarity.
     - Consignment overview cards: Total Capital Invested (Rs), Total Initial Qty (pcs), Remaining Stock (pcs), Channel.
     - Dual-view tabs:
       - **Catalogue Products Rollup**: Groups lots by product displaying SKU, lot count, unit cost range, initial quantity, remaining stock, and total valuation.
       - **All Batches / Lots**: Itemized list of all 143 lots with batch codes, acquisition costs, initial vs. remaining quantities, and active/depleted status pills.
     - Live search filter: Real-time fuzzy filtering of products and batch codes.
     - Header edit support: Allows updating Invoice #, Supplier, Procurement Channel, Procurement Date, and Notes while safely preserving all 143 lots.
2. **Database Performance Indexing**:
   - Resolves application slowness when querying historical sales orders, lot lookups, and analytics.
   - Added 17 composite and foreign-key performance indexes across PostgreSQL and SQLite schemas (idx_lots_product_cost, idx_lots_procurement_id, idx_sales_date, idx_sale_items_sale_id, etc.).
   - Applied directly to the production Neon PostgreSQL database, dropping query execution time from multi-second sequential table scans down to ~360ms.

---

## 2. Code & Architectural Modifications

### db.py
- Added 17 performance indexes to both _init_postgres_db and _init_sqlite_db.

### server.py
- Updated PUT /api/procurements/:id to recognize is_multi_item consignments and preserve lots while synchronizing date/source.

### frontend/app/procurement/page.tsx
- Added consignmentItems state, rollups, tabs, and rich manifest table in the Drawer.

---

## 3. Test Coverage & Verification
- Jest: 139/139 passed.
- Backend: 43/43 passed.
- Next.js production build: 14 routes compiled successfully.

---

## 4. Multi-Agent Review Verdict
- Functional Reviewer: APPROVED
- E2E Reviewer: APPROVED
- Critic Agent: APPROVED
