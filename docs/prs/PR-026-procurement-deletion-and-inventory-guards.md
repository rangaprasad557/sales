# PR-026: Procurement Deletion with Inventory Safety Invariants & Table / Drawer Actions

## 1. Overview & Objective
Previously, the system supported creating and updating procurements, but lacked a deletion endpoint and UI controls to remove stock intake records. When a user recorded an accidental intake, entered duplicate test procurements, or needed to cancel an unfulfilled consignment, there was no way to delete the procurement.

This PR introduces comprehensive procurement deletion functionality across the stack while enforcing strict accounting and inventory consistency invariants:
1. **Sales Allocation Invariant Guard**:
   - Deleting a procurement that has already supplied inventory to sales orders would break COGS calculations, sale-to-lot traceability (`sale_item_lots`), and leave sales transactions orphaned or corrupted.
   - The backend strictly enforces a safety check: if any lot belonging to the procurement has been partially or fully sold (`remaining_qty < initial_qty` or presence in `sale_item_lots`), deletion is rejected with a descriptive `400 Bad Request`.
2. **Safe Atomic Deletion for Unconsumed Intakes**:
   - If none of the procurement's lots have been sold, the system atomically deletes all linked `inventory_lots` and the `procurements` record, accurately decrementing current stock levels and store valuation.
3. **Mobbin-Grade Table & Drawer UI**:
   - **Procurements Table**: Added an accessible `Trash2` action button alongside `Edit2` in every row.
   - **Edit Drawer Footer**: Added a dedicated **"Delete Intake"** button on the bottom left (using flexbox `mr-auto`) with confirmation prompt.

---

## 2. Code Modifications

### `server.py`
- Added `delete_procurement(conn, cur, proc_id)` modular business logic function:
  - Validates procurement existence (`404` if missing).
  - Inspects all lots belonging to `procurement_id`.
  - Checks for sales consumption against `sale_item_lots` and `remaining_qty < initial_qty`.
  - Blocks deletion (`400`) if lots have been sold.
  - Atomically deletes `inventory_lots` and `procurements` and commits transaction (`200`).
- Added route handling in `handle_api_delete` for `DELETE /api/procurements/<id>`.

### `frontend/app/procurement/page.tsx`
- Added `handleDelete(proc: Procurement)` handler with confirmation dialog and error/success notifications.
- Added `Trash2` delete action button in table rows (`aria-label="Delete Invoice <invoiceNo>"`).
- Added "Delete Intake" button in the Drawer footer when editing an existing procurement.

### `test_suite.py`
- Added `test_procurement_deletion_safe_and_rejection_guard`:
  - Verified safe deletion of unconsumed multi-item procurement.
  - Verified 404 response for non-existent procurement ID.
  - Verified strict rejection (`400`) when a procurement's lot has been consumed in a sale.

### `frontend/tests/procurement_and_order_dates.test.ts`
- Added Section 8 test cases verifying deletion execution, state removal, rejection handling, and WCAG contrast compliance.

---

## 3. Test Coverage & Verification Evidence
- **Backend Test Suite (`test_suite.py`)**: 44 / 44 passed (100%).
- **Frontend Test Suite (`npm test`)**: 147 / 147 passed (100%).
- **Next.js Production Build**: Clean compile with 0 errors across 14 routes.

---

## 4. Multi-Agent Review Verdicts
- **Critic Agent**: APPROVED (0 Major, 0 Blocker).
- **Functional Reviewer**: APPROVED (0 Major, 0 Blocker).
- **E2E Integration Reviewer**: APPROVED (0 Major, 0 Blocker).
