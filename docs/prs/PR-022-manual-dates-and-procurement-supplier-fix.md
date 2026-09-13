# PR-022: Manual Retroactive Dates (Procurement & POS Billing) & Procurement Supplier Edit Fix

## Scope & Objective
1. **Manual Retroactive Dates**:
   - Allow store operators to enter custom past dates for both **Stock Procurements** and **POS Sales Orders** (crucial when transactions are initially noted on paper and recorded into the software later).
   - Provide clean, accessible HTML5 `<input type="date">` pickers in:
     * Procurement intake/edit drawer
     * POS Billing top toolbar & checkout summary sidebar
     * Order history edit drawer
2. **Procurement Supplier Edit Fix**:
   - Fix the bug where editing an existing procurement left the **Supplier** field blank.
   - Accurately resolve registered suppliers by name matching or fallback to custom/unregistered supplier mode (`__custom__`).
   - Clean repeated `Supplier: ... Product: ...` prefix accumulations from user-editable notes.
   - Backend `server.py` now extracts and returns `procurement.supplier_name` in both `GET /api/procurements` and `GET /api/procurements/:id`.

---

## Architectural & Code Modifications

### 1. Backend (`server.py`)
- Added `extract_supplier_name(notes)` helper with case-insensitive regular expression parsing.
- Updated `GET /api/procurements` and `GET /api/procurements/:id` to automatically attach `supplier_name`.
- Verified that `execute_procurement` and `execute_sale` persist the custom `procurement_date` and `sale_date` accurately into PostgreSQL / SQLite.

### 2. Frontend Procurement Page (`frontend/app/procurement/page.tsx`)
- Placed **Procurement Invoice #** and **Procurement Date** into a responsive 2-column grid with validation.
- Enhanced `openEditDrawer` to refresh suppliers, match against registered suppliers, and set `supplierId = '__custom__'` with `supplierName` preserved for one-off suppliers so the field is never blank.
- Added support for selecting `+ Custom / Unregistered Supplier` in the dropdown, dynamically revealing the text input with the pre-filled supplier name.
- Stripped previous `Supplier: ... Product: ...` prefixes from `notes` when opening the edit drawer, avoiding runaway duplicate tags across edits.

### 3. Frontend POS Billing (`frontend/app/sales/page.tsx`)
- Added `saleDate` state initialized to current date (`YYYY-MM-DD`).
- Added `<input type="date">` picker with calendar icon in:
  1. Top header actions next to Customer selector and Past Orders button.
  2. Financial Allocation Summary card on the right panel.
- Passed `sale_date: saleDate` into `salePayload`, `record.saleDate`, and receipt modal.

### 4. Frontend Orders Management (`frontend/app/orders/page.tsx`)
- Upgraded the sale date input in the order edit drawer to `type="date"`.

---

## Test Verification Output

### 1. Backend Integration Tests (`test_suite.py`)
```bash
python test_suite.py
```
- Ran 42 tests in 2.003s: **100% PASS** (42/42 tests passing).
- Verified `test_e2e_07_procurements_api` persists retroactive `procurement_date` and extracts `supplier_name`.
- Verified `test_e2e_08_sales_simulate_and_execute` persists retroactive `sale_date`.

### 2. Frontend Test Suite (`npm test -- --ci`)
```bash
npm test -- --ci
```
- Test Suites: **10 passed, 10 total**
- Tests: **135 passed, 135 total**
- Zero failures, zero warnings.

### 3. TypeScript Compilation & Production Build
```bash
npx tsc --noEmit
npm run build
```
- TypeScript check: **0 errors**.
- Next.js production build: **14/14 static and dynamic routes compiled successfully**.

---

## Multi-Agent Review Quality Gate
- **Functional Reviewer**: APPROVED (Retroactive dates persist across procurement and sales workflows; supplier edit field is never blank).
- **E2E Reviewer**: APPROVED (Both SQLite local test suite and PostgreSQL production persistence schemas accommodate custom dates).
- **Critic Agent**: APPROVED (WCAG 2.1 AA/AAA contrast ratios >= 4.5:1 on labels and date pickers; zero visual overlap or clipping).
