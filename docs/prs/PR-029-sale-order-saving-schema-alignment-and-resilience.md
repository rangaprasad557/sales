# PR-029: Sale Order Editing Schema Alignment, Lot Allocation Resilience & Order Saving Fix

## 1. Overview & Objective
When users edited an existing sale order (such as historical sale #4 or any customer order) from the **Edit Order Drawer** on the `/orders` page, clicking **"Save Changes"** resulted in failure with HTTP 500 error, preventing orders from saving.

This PR identifies and resolves the root causes across both the database persistence layer and the business logic engine:
1. **Query Column Ambiguity Fix**:
   - Resolved `ambiguous column name: qty` error in `server.py` when joining `sale_item_lots` with `sale_items` by qualifying column projections as `sil.lot_id, sil.qty`.
2. **Schema Alignment for `sale_items`**:
   - Replaced invalid column references (`subtotal_amount`, `subtotal_cogs`, `subtotal_profit`) with actual table schema columns (`total_sale_price`, `total_cost`, `profit`, `allocation_type`).
   - Standardized insertion and update queries with pre-computed values, ensuring compatibility across SQLite and PostgreSQL.
3. **Dual-Mode Update Architecture**:
   - **Mode A (In-Place Price & Metadata Updates)**: When line item product IDs and quantities remain unchanged, the system updates `unit_sale_price`, recalculates line item profits, updates `lot_profit` in `sale_item_lots`, and updates the parent sale header without touching `inventory_lots`. This completely eliminates false "Insufficient stock" errors when updating historical orders where warehouse stock is currently depleted.
   - **Mode B (Quantity Alterations & Line Item Modifications)**: Restores previously billed batches to `inventory_lots` (`status = 'active'`), deletes previous lot associations, checks aggregate product stock availability, re-allocates via Lowest-Cost-First (LCF), and deducts new batches.
4. **Adversarial Hardening & Defense-in-Depth**:
   - Enforced non-empty item arrays (rejects empty `"items": []` with HTTP 400).
   - Enforced non-negative selling prices (rejects `unit_sale_price < 0` with HTTP 400).
   - Aggregated product quantities across duplicate line items in incoming payloads prior to availability checking.
   - Added post-allocation shortage checks (`remaining_to_draw > 0.0001` triggers rollback and HTTP 400) to prevent any ghost inventory allocations.
   - Applied explicit decimal rounding (`round(..., 2)`) to `total_amount`, `total_cogs`, and `net_profit` on order headers.

---

## 2. Code Modifications

### `server.py`
- Upgraded `PUT /api/sales/<id>` in `handle_api_put`:
  - Parses `raw_customer_id`, gracefully coercing `None`, `""`, `"null"`, and integers.
  - Implements dual-mode logic: in-place for identical product/quantity pairs vs. lot restoration and LCF re-allocation for structural changes.
  - Validates non-empty item lists and non-negative unit selling prices.
  - Resolves table alias ambiguity using `sil.lot_id, sil.qty`.
  - Aggregates requested quantities into `needed_by_product[p_id]` before querying available stock.
  - Adds defensive post-allocation check: rolls back if `remaining_to_draw > 0.0001`.
  - Rounds `total_amount`, `total_cogs`, and `net_profit` to 2 decimal places prior to SQL updates.

### `test_suite.py`
- Added comprehensive E2E test `test_e2e_sale_update_via_put_api`:
  - **Test A**: In-place metadata and price update (walk-in customer, updated seller, notes, price change) with verification that inventory lots are untouched.
  - **Test B**: Quantity expansion (10 -> 15 units) with stock restoration, re-draw, and margin recalculation.
  - **Test C**: Insufficient stock rejection when requesting 9999 units (HTTP 400).
  - **Test D**: Empty items array rejection (HTTP 400).
  - **Test E**: Negative unit sale price rejection (HTTP 400).
  - **Test F**: Duplicate product line items exceeding aggregate stock (HTTP 400).
  - **Test G**: Non-existent sale ID (HTTP 404) and invalid ID (HTTP 400).

---

## 3. Test Coverage & Verification Evidence
- **Backend Test Suite (`test_suite.py`)**: 47 / 47 passed (100%).
- **Frontend Test Suite (`npx jest`)**: 158 / 158 passed across 10 test suites (100%).
- **Next.js Production Build (`npm run build`)**: Compiled successfully with 0 TypeScript/lint errors across all 14 routes.
- **Historical Order Verification**: Verified in-place update on historical Sale #965 (`INV-2026-0004`) executing cleanly with zero errors.

---

## 4. Multi-Agent Review Verdicts
- **Critic Agent**: APPROVED (0 Major, 0 Blocker). All 4 adversarial remediations implemented and re-verified.
- **Functional Reviewer**: APPROVED (0 Major, 0 Blocker). Schema alignment, column disambiguation, and dual-mode updates confirmed.
- **E2E Integration Reviewer**: APPROVED (0 Major, 0 Blocker). Full test suite pass and production build confirmed.
- **Outcome**: PR-029 fully satisfies all repository rules and quality gates.
