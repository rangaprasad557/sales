# PR-019: Permanent Auto-Seeding Removal, Zero Data Reset Button & Cloud Run Wipe

## Executive Summary
This Pull Request addresses the user requirement:
> *deployed application i see data clear every data i want to start from zero*

---

## 1. Scope and Architectural Modifications

### 1.1 Permanently Disable Auto-Seeding (db.py, server.py)
- **db.py**: Changed init_db(seed_if_empty=False). Newly created databases now initialize schema tables, indexes, and system metadata (initialized = 'clean') with zero dummy/sample records.
- **server.py**: Updated un_server() to explicitly call db.init_db(seed_if_empty=False). Every server start, container initialization, or Cloud Run instance cold start boots with a completely empty database.
- **Zero-State Retention**: The application never auto-populates dummy records again. Real store data must be entered by authorized personnel via the UI.

### 1.2 Reset Store Data to Zero UI (rontend/components/Navigation.tsx)
- **Trash2 Action Button**: Added a clean, accessible action button in the top navigation bar for authorized users.
- **Confirmation Modal**: Added an accessible modal dialog (ole=dialog, ria-modal=true) prompting the user:
  > *Reset Store Data to Zero? This action will permanently delete all products, categories, suppliers, customers, inventory lots, and past orders so you can start from a completely clean slate.*
- **Action Dispatch**: Connected to POST /api/system/clear-data with instant notification and page reload upon completion.

### 1.3 Live Cloud Run Instance Data Reset
- Invoked POST /api/system/clear-data against the active Google Cloud Run service (https://sales-947562490659.asia-south1.run.app).
- Verified all live endpoints returned 0 records:
  - /api/products -> {success: true, products: []}
  - /api/categories -> {success: true, categories: []}
  - /api/customers -> {success: true, customers: []}
  - /api/sales -> {success: true, sales: []}

---

## 2. Verification & Quality Gate Evidence
- **Backend Test Suite (	est_suite.py)**: 40 / 40 passed (Ran 40 tests in 1.832s, OK).
- **Frontend Jest Tests (
pm test -- --ci)**: 126 / 126 passed across 9 suites (100% pass rate).
- **TypeScript Compilation (
px tsc --noEmit)**: 0 errors.
- **Live Endpoint Verification**: Confirmed live Cloud Run instance is completely at 0 records.
