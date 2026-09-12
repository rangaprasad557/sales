# PR-015: Master Data Editing, API Persistence & Cross-Page Category Integration

## 1. Scope & Objective
- **PR Title**: `feat(masters): enable full editing across all master entities, API persistence, and cross-page category dropdown discovery`
- **Scope**:
  - Enable full CRUD and editing capabilities across all four master entities:
    * **Product Catalogue** (`/catalogue`): Add product editing drawer, auto-population of SKU/title/category/unit/minStock, `PUT /api/products/:id`, and `DELETE /api/products/:id`.
    * **Customer Directory** (`/customers`): Connect drawer to `PUT /api/customers/:id` and `POST /api/customers` with `credit_limit` and `notes` persistence.
    * **Supplier Directory** (`/suppliers`): Connect drawer to `PUT /api/suppliers/:id` and `POST /api/suppliers` with procurement `source` and `payment_terms` persistence.
    * **Category Taxonomy** (`/categories`): Connect category tree & inspector to `PUT /api/categories/:id`, `POST /api/categories`, and `DELETE /api/categories/:id`.
  - Fix the critical **cross-page data visibility bug**:
    * When a user creates a category on `/categories`, it is immediately persisted via `POST /api/categories`.
    * The product catalogue page (`/catalogue`) now fetches `/api/categories` dynamically on load and merges all registered categories into the Category dropdown and filter chips.
  - Fix universal API response parsing:
    * Standardized response handling across all frontend modules to support `{ success: true, products: [...] }`, `{ status: "success", data: [...] }`, and raw JSON arrays.
  - Extend Python standalone server (`server.py`) and SQLite database (`db.py`):
    * Added `do_PUT` and `do_DELETE` HTTP request handlers.
    * Added `suppliers` and `categories` SQLite schema tables with migration support.
    * Full CRUD endpoints for `/api/products/:id`, `/api/customers/:id`, `/api/suppliers/:id`, and `/api/categories/:id`.

---

## 2. Architectural & Code Modifications

### Backend & Python Server (`db.py`, `server.py`)
1. **`db.py`** `[MODIFIED]`:
   - Added `suppliers` and `categories` tables to SQLite schema with foreign key relationships.
   - Added `credit_limit` and `notes` to `customers` table with backward-compatible `ALTER TABLE` migrations.
   - Added `source` to `suppliers` table with `ALTER TABLE` migration.
   - Updated `clear_all_data()` to safely reset `suppliers` and `categories` tables.
2. **`server.py`** `[MODIFIED]`:
   - Implemented `do_PUT()` and `do_DELETE()` HTTP methods on `InventorySalesRequestHandler`.
   - Added `handle_api_put()` routing for `/api/products/<id>`, `/api/customers/<id>`, `/api/suppliers/<id>`, and `/api/categories/<id>`.
   - Added `handle_api_delete()` routing for `/api/products/<id>`, `/api/customers/<id>`, `/api/suppliers/<id>`, and `/api/categories/<id>`.
   - Added `GET /api/suppliers` and `GET /api/categories` listing endpoints.
   - Added `POST /api/suppliers` and `POST /api/categories` creation endpoints.
   - Enhanced `customers` PUT/POST to persist `credit_limit` and `notes`.
   - Enhanced `suppliers` PUT/POST to persist `source` and `payment_terms`.

### Frontend (`frontend/app/`)
1. **`frontend/app/catalogue/page.tsx`** `[MODIFIED]`:
   - Added `openEditDrawer` to pre-populate product data into slide-over drawer.
   - Added `handleSubmit` supporting both `PUT /api/products/:id` (edit) and `POST /api/products` (create).
   - Added `handleDelete` calling `DELETE /api/products/:id`.
   - Added `availableCategories` state fetching from `/api/categories`.
   - Merged dynamic categories into Category selector dropdown so newly created categories appear instantly.
   - Added Actions column (`Edit2`, `Trash2`) with accessible focus rings and tooltip titles.
2. **`frontend/app/customers/page.tsx`** `[MODIFIED]`:
   - Updated `handleSubmit` to call `PUT /api/customers/:id` on edit and `POST /api/customers` on create.
   - Added `handleDelete` calling `DELETE /api/customers/:id`.
   - Added delete button in customer table with confirmation dialog.
   - Universal API response parsing for `{ customers: [...] }` and `{ data: [...] }`.
3. **`frontend/app/suppliers/page.tsx`** `[MODIFIED]`:
   - Updated `handleSubmit` to call `PUT /api/suppliers/:id` on edit and `POST /api/suppliers` on create.
   - Added `handleDelete` calling `DELETE /api/suppliers/:id`.
   - Added delete button in supplier table with confirmation dialog.
   - Universal API response parsing for `{ suppliers: [...] }` and `{ data: [...] }`.
4. **`frontend/app/categories/page.tsx`** `[MODIFIED]`:
   - Fixed `fetchCategories` to parse `{ categories: [...] }` response.
   - Added `openEditDrawer` to edit category name, code, parent category, and description.
   - Updated `handleSubmit` to call `PUT /api/categories/:id` on edit and `POST /api/categories` on create.
   - Added `handleDelete` calling `DELETE /api/categories/:id`.
   - Added Edit and Delete buttons in Category Inspector panel.
5. **`frontend/app/procurement/page.tsx`** and **`frontend/app/sales/page.tsx`** `[MODIFIED]`:
   - Fixed response parsing to support `{ procurements: [...] }`, `{ products: [...] }`, and `{ customers: [...] }`.

### Test Suites
1. **`frontend/tests/master_data_editing.test.ts`** `[NEW]`:
   - 12 Jest assertions testing response parsing, cross-page category dropdown derivation, product edit form validation, customer/supplier payload formatting, and WCAG 2.1 AAA contrast.
2. **`test_suite.py`** `[MODIFIED]`:
   - Added `_http_put` and `_http_delete` test helpers.
   - Added `test_e2e_28_master_data_crud_and_editing` (Products CRUD, Customers CRUD, Suppliers CRUD, Categories CRUD, cross-page category product mapping, and 400/404 boundary tests).

---

## 3. Test Scenarios & Automated Verification Matrix

| Test ID | Area | Scenario | Expected Outcome | Result |
|---|---|---|---|---|
| MST-01 | Products | Create Product | `POST /api/products` returns 201 + id | **PASS** |
| MST-02 | Products | Edit Product | `PUT /api/products/:id` updates title, category, minStock | **PASS** |
| MST-03 | Products | Delete Product | `DELETE /api/products/:id` removes record cleanly | **PASS** |
| MST-04 | Customers | Create Customer | `POST /api/customers` persists credit limit and notes | **PASS** |
| MST-05 | Customers | Edit Customer | `PUT /api/customers/:id` updates profile and credit terms | **PASS** |
| MST-06 | Customers | Delete Customer | `DELETE /api/customers/:id` removes customer | **PASS** |
| MST-07 | Suppliers | Create Supplier | `POST /api/suppliers` persists channel and payment terms | **PASS** |
| MST-08 | Suppliers | Edit Supplier | `PUT /api/suppliers/:id` updates vendor contacts and terms | **PASS** |
| MST-09 | Suppliers | Delete Supplier | `DELETE /api/suppliers/:id` removes vendor | **PASS** |
| MST-10 | Categories | Create Category | `POST /api/categories` saves taxonomy taxon | **PASS** |
| MST-11 | Categories | Edit Category | `PUT /api/categories/:id` updates hierarchy & metadata | **PASS** |
| MST-12 | Integration | Cross-Page Dropdown | Created Category appears in Catalogue dropdown list | **PASS** |
| MST-13 | Integration | Categorized Product | Product created with new category retains mapping | **PASS** |
| MST-14 | Negative | Invalid ID (400) | `PUT /api/*/:invalid-id` returns 400 Bad Request | **PASS** |
| MST-15 | Negative | Nonexistent ID (404) | `PUT /api/*/999999` returns 404 Not Found | **PASS** |
| MST-16 | A11y / UI | Action Controls | Edit/Delete have accessible aria-labels and WCAG contrast | **PASS** |
| MST-17 | TypeScript | Type Safety | `npx tsc --noEmit` exits with 0 errors | **PASS** |

### Automated Test Suite Results
- **Frontend Jest Suite**: 8 test suites, **116 / 116 passing (100%)**
- **Backend NestJS Suite**: 7 test suites, **94 / 94 passing (100%)**
- **Python E2E Suite**: **40 / 40 passing (100%)**
- **Total Automated Tests**: **250 / 250 passing (100%)**

---

## 4. Multi-Agent Review Verdicts

- **Functional Reviewer**: 🏆 **APPROVED**
- **E2E Integration Reviewer**: 🏆 **APPROVED**
- **Critic Agent**: 🏆 **APPROVED**
