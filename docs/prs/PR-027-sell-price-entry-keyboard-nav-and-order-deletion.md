# PR-027: Sell Price Entry, Cashier Keyboard Navigation, Order Deletion with Stock Restoration & POS Creation Hardening

## 1. Overview & Objective
In high-throughput POS billing and order management environments, cashiers require fluid keyboard navigation and flexible pricing controls. Additionally, store managers need the ability to delete sales orders with transactional inventory restoration, and POS order submission must provide robust error feedback when stock depletion or validation errors occur.

This PR delivers four core capabilities across the stack:
1. **Sell Price Entry & Natural Decimal Typing**:
   - Cashiers can directly edit the Unit Sell Price (₹) for every line item in the POS Billing cart (`frontend/app/sales/page.tsx`).
   - Added a dedicated "Sell Price (₹)" input column in the Catalogue Product Picker grid (`frontend/components/ProductPickerModal.tsx`).
   - Backed by string buffers (`qtyStr`, `priceStr`) to prevent jarring numeric auto-snapping to `0` or losing trailing decimal points during rapid entry.
   - Added `onFocus={(e) => e.target.select()}` for 1-keystroke replacement across all quantity and price inputs.
2. **Cashier Rapid Keyboard Navigation**:
   - `Enter` on Qty advances focus to Sell Price on the same row.
   - `Enter` on Sell Price advances focus to the Qty of the next row (or cycles back to the Quick Search input if on the last row).
   - `Shift+Enter` navigates backwards in reverse order.
   - `Enter` in the Quick Search input instantly adds the top matching item to the cart and focuses the newly added item's Qty input.
   - `Enter` on either Qty or Price in the Product Picker Modal instantly adds the item to the cart.
3. **Transactional Order Deletion & Stock Restoration**:
   - Backend `delete_sale(conn, cur, sale_id)` transactionally queries all allocated inventory lots (`sale_item_lots`), restores `remaining_qty = remaining_qty + qty`, reactivates depleted lots (`status = 'active'`), and cleans up `sale_item_lots`, `sale_items`, and `sales`.
   - Exposed via `DELETE /api/sales/<id>`.
   - Frontend Orders History (`frontend/app/orders/page.tsx`) features an accessible `Trash2` button in each table row, a dedicated "Delete Order" button in the Edit Drawer footer, and an audit confirmation modal highlighting invoice number, items count, units to restore, and revenue impact.
4. **POS Order Creation Hardening & Error Visibility**:
   - Resolved the root cause of "new orders not saving": `handleCheckout` previously called `fetch('/api/sales')` without inspecting `res.ok`. If the backend rejected an order (e.g. insufficient stock from depleted historical lots), the error was swallowed, the cart emptied, and a false success toast was displayed.
   - Now validates `res.ok`, extracts server error messages, displays high-visibility error notifications, preserves cashier cart state on failure, and computes real-time stock shortages with warning badges.

---

## 2. Code Modifications

### `server.py`
- Implemented `delete_sale(conn, cur, sale_id)`:
  - Validates numeric sale ID and checks sale existence (`404` if not found).
  - Fetches all allocated lots from `sale_item_lots` linked to the sale.
  - Updates `inventory_lots` with `remaining_qty = remaining_qty + qty` and `status = 'active'`.
  - Removes `sale_item_lots`, `sale_items`, and `sales` atomically within a transaction (`200`).
- Wired route `DELETE /api/sales/<id>` in `handle_api_delete`.
- Fixed column name mismatch in `PUT /api/sales/<id>` (`qty` instead of `qty_drawn`).
- Added collision check in `execute_sale` ensuring invoice uniqueness before insert.

### `frontend/app/sales/page.tsx`
- Extended `CartItem` interface with `qtyStr?: string` and `priceStr?: string`.
- Added `qtyInputRefs` and `priceInputRefs` to manage programmatic keyboard focus.
- Implemented `handleQtyKeyDown` and `handlePriceKeyDown` for `Enter` and `Shift+Enter` transitions.
- Added `handleSearchKeyDown` on the Quick Search input to add the top product on `Enter`.
- Added stock shortage indicator (`shortQty`) in `computeLCFAllocation` when available lots cannot fulfill the requested quantity.
- Hardened `handleCheckout`: verifies `res.ok`, surfaces backend error toast, prevents receipt modal popup, and keeps cart intact on rejection.

### `frontend/components/ProductPickerModal.tsx`
- Added "Sell Price (₹)" table header and input cell with auto-selection on focus.
- Added `Enter` key handlers on both Qty and Price inputs to immediately add the item to the cart.
- Updated empty state `colSpan={7}`.

### `frontend/app/orders/page.tsx`
- Added `Trash2` action button in the table row actions column with accessible `aria-label`.
- Added "Delete Order" button in the Order Edit Drawer footer.
- Added confirmation dialog modal rendering complete audit details (invoice number, line items count, units restored, total amount).
- Implemented `handleDeleteOrder`: executes `DELETE /api/sales/${order.id}`, removes order from state, reloads inventory, closes drawer, and shows success toast.

### `test_suite.py`
- Added HTTP `DELETE /api/sales/<id>` assertions in `test_e2e_08_sales_simulate_and_execute`.
- Added comprehensive unit and integration test `test_sale_deletion_and_stock_restoration`:
  - Validates full stock restoration to inventory lots.
  - Validates status reset to 'active'`.
  - Validates complete removal of sale and child records.
  - Validates 404 and 400 rejection responses.

### `frontend/tests/orders_history_a11y.test.ts`
- Added Section 7 test suite:
  - Deletion contract and accurate stock restoration message generation.
  - Automatic drawer closure when currently viewed order is deleted.
  - Confirmation dialog audit details integrity.
  - WGAC-compliant styling on destructive delete buttons.

---

## 3. Test Coverage & Verification Evidence
- **Backend Test Suite (`test_suite.py`)**: 45 / 45 passed (100%).
- **Frontend Test Suite (`npx jest`)**: 151 / 151 passed across 10 suites (100%).
- **Next.js Production Build (`npm run build`)**: Compiled successfully with 0 TypeScript/lint errors across all 14 routes.

---

## 4. Multi-Agent Review Verdicts
- **Critic Agent**: APPROVED (0 Major, 0 Blocker).
- **Functional Reviewer**: APPROVED (0 Major, 0 Blocker).
- **E2E Integration Reviewer**: APPROVED (0 Major, 0 Blocker).
- **Outcome**: PR-027 fully satisfies all repository rules and quality gates.
