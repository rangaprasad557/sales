# PR-020: Persistent Real Store Data Safeguard, Backup/Restore, Procurement & Orders Editing, and Credit Limit Removal

## 1. Overview & Objectives
- **Scope**: Safeguard live store data (22 real products) from erasure during Cloud Run restarts/deployments; introduce 1-click in-app Backup & Restore; allow full editing of past procurements and sales orders; completely eliminate credit limit fields/logic across the application.
- **Related Requirements**:
  1. Safeguard user-entered store catalog (22 cigarette products) across all deployments.
  2. Implement in-app 1-click Backup download (/api/system/backup) and Restore upload (/api/system/restore).
  3. Support editing existing procurements (PUT /api/procurements/:id) and orders (PUT /api/sales/:id) with lowest-cost-first re-allocation and inventory lot restitution.
  4. Remove credit limits completely from Customer forms, tables, search, and POS billing.

---

## 2. Architectural & Code Modifications

### 2.1 Backend & Database Engine (db.py, server.py, Dockerfile)
- **Data Snapshot Bootstrapping (data/store_catalog.json)**:
  - Captured full metadata of all 22 live store products (Advance, Classic Milds, Gold Flake Filter, Wills Navy Cut, etc.).
  - Updated db.load_store_catalog(conn): automatically bootstraps products into clean production databases on startup if empty.
  - Added persistent path resolution db.get_db_path(): automatically selects /data/inventory_sales.db when a persistent volume is mounted at /data.
  - Updated Dockerfile to copy data/ directory into build containers.
- **Backup & Restore REST Endpoints**:
  - GET /api/system/backup: Exports complete relational snapshot (products, categories, suppliers, customers, inventory_lots, procurements, sales, sale_items, sale_item_lots).
  - POST /api/system/restore: Safely restores tables from uploaded backup payload with transaction isolation and auto-increment sequence resynchronization.
- **Procurement Editing**:
  - PUT /api/procurements/:id: Updates consignment details, updates associated inventory_lots quantities and unit costs.
- **Sales Order Editing**:
  - PUT /api/sales/:id: Restores inventory allocations for the original line items, deletes previous line item lots, re-runs Lowest-Cost-First allocation, updates line items and recalculated invoice totals.

### 2.2 Frontend Enhancements & UI/UX
- **Credit Limit Removal**:
  - Removed creditLimit from customers/page.tsx (interface, state, forms, KPI cards, table columns, validation).
  - Removed creditLimit warning banners, customer dropdown text, and summary card in sales/page.tsx.
  - Removed credit limit badge from GlobalSearchBar.tsx.
- **Procurement Editing Drawer (procurement/page.tsx)**:
  - Added Actions column with edit button (Edit2).
  - Added slide-over drawer allowing editing invoice number, date, source, supplier notes, and line items.
- **Sales Order Editing Drawer (orders/page.tsx)**:
  - Added Actions column with edit button (Edit2) next to View Receipt.
  - Added drawer allowing modification of customer assignment, sale date, notes, and ordered quantities/unit prices.
- **In-App Backup & Restore (Navigation.tsx)**:
  - Added Download Store Backup (JSON) and Restore Store from Backup buttons in navigation bar with visual status notifications.

---

## 3. Verification & Test Matrix

- **Backend Automated Tests (test_suite.py)**:
  - Added test_e2e_18_backup_restore_and_editing_procurements_orders.
  - Ran full test suite: 41/41 tests passing (100%).
- **Frontend Automated Tests (npm test -- --ci)**:
  - Updated master_data_editing.test.ts.
  - Ran full Jest suite: 9 test suites passing, 126/126 tests passing (100%).
- **TypeScript Typecheck (npx tsc --noEmit)**:
  - Clean run with 0 errors.

---

## 4. Multi-Agent Review Verdict

- **Functional Reviewer**: APPROVED - Backup/restore endpoints, procurement editing, sales order editing with lot restitution, and credit limit removal all work seamlessly.
- **E2E Reviewer**: APPROVED - Both backend test suite (41/41) and frontend test suite (126/126) pass without failures.
- **Critic Agent**: APPROVED - Clean architecture, proper transactional safety, no regressive side effects, user store data securely persisted.
