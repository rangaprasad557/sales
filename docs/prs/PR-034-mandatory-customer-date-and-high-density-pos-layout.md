# PR-034: Mandatory Customer & Order Date Selection with High-Density POS Layout

## PR Scope & Objective
Addresses user requests:
1. *"#1 - MAke date and customer manadatory selection in POS sale order creation. Put blank by default."*
2. *"#2 - At max I am able to see one item in order after adding. - refer screenshot , suggestions - Can remove 'Point of Sale Engine POS Billing & Multi-Batch Allocation Catalogue-driven billing screen with automated Lowest-Cost-First multi-lot split & manual override.' , Can remove '$ Past Orders' button in this screen, Customer and Date can be in another card and card can be placed above/before 'Financial Allocation Summary', reduce height of quick search and product picker buttons. 'inancial Allocation Summary' and customer date info grid can be bottom of item grid? Can height of top ibbon can be reduced?"*

This PR delivers:
1. **Mandatory Customer & Order Date Selection (Blank Default & Strict Validation)**:
   - Initial state sets `selectedCustomerId: null` and `saleDate: ''` by default.
   - Customer select dropdown initializes with `-- Select Customer (Required) * --`.
   - Native HTML5 `<input type="date">` initializes blank with required asterisk indicators (`* Required`).
   - `handleCheckout` strictly validates both fields prior to processing. If either is missing:
     - Halts execution with zero network calls.
     - Displays informative toast notification (`addNotification('error', ...)`).
     - Applies high-contrast red validation rings (`border-rose-500 ring-2 ring-rose-500/20`) and inline `AlertTriangle` warning messages.
   - Dynamic error recovery clears error states as soon as the user selects a customer or date.
   - Successful checkout cleanly resets `selectedCustomerId` to `null` and `saleDate` to `''`, preventing stale state carryover.

2. **High-Density Viewport Optimization (Fitting 5 to 7 Line Items Simultaneously)**:
   - **Header & Action Bar Streamlining**: Completely removed the 120px+ promotional description banner (`"Point of Sale Engine POS Billing..."`) and redundant `"$ Past Orders"` button.
   - **Single-Row Action Bar**: Compacted the top bar to `h-9` (36px) featuring a compact "POS Billing" badge with item count pill, a unified `h-9` quick search with autocomplete, and a `h-9` Product Picker modal trigger.
   - **Right Sidebar Card Stacking**: Moved Customer and Order Date into **Card 1**, positioned directly above **Card 2 (Financial Allocation Summary & Complete Sale)**. This keeps key transaction metadata and the final checkout action unified in the cashier's natural vertical eye flow.
   - **Compact 2-Tier Line Item Cards**: Redesigned cart item cards from ~145px down to ~68px–72px per item:
     - *Tier 1 (~38px)*: Product name, unit, SKU, category, inline Qty input (`h-7`), inline Price input (`h-7`), line total, and delete button.
     - *Tier 2 (~26px)*: Lowest-Cost-First (LCF) allocated batch chips, backlog warnings, line profit with margin %, and manual lot override trigger.
   - **Constrained Internal Scroll Container**: Enforced `max-h-[calc(100vh-210px)] overflow-y-auto pr-1` on the items grid, giving 558px–690px of visible scroll area and displaying **5 to 7 line items simultaneously** on standard laptop screens without triggering page-level window scrolling.

3. **Global Navigation & Layout Space Recovery**:
   - Compacted desktop top navigation ribbon (`Navigation.tsx`) from `h-16` (64px) down to `h-12 sm:h-13` (48px–52px).
   - Reduced main vertical layout padding (`layout.tsx`) from `py-6 sm:py-8` down to `py-3.5 sm:py-4`.
   - Preserves complete keyboard navigation: `Enter` in Search adds product and focuses Qty; `Enter` in Qty advances to Price; `Enter` in Price advances to the next item's Qty (`Shift+Enter` reverses).

---

## Architectural & Code Modifications

### 1. POS Billing Page (`frontend/app/sales/page.tsx`)
- **State Initialization**: `selectedCustomerId` defaults to `null`; `saleDate` defaults to `''`; added `customerError` and `dateError` boolean states.
- **Validation**: Enforced non-empty customer and trimmed date checks in `handleCheckout`.
- **Reset**: Added `setSelectedCustomerId(null)`, `setSaleDate('')`, `setCustomerError(false)`, and `setDateError(false)` in the post-checkout completion block.
- **Layout Restructure**:
  - Removed promotional header and Past Orders button.
  - Formatted top action bar into a single `h-9` flex row.
  - Staggered right sidebar into Card 1 (Customer & Date) and Card 2 (Financial Summary).
  - Streamlined cart cards into a compact 2-tier row with internal scrolling container `max-h-[calc(100vh-210px)]`.

### 2. Navigation & Layout Shell (`frontend/components/Navigation.tsx` & `frontend/app/layout.tsx`)
- Compacted global navbar height to `h-12 sm:h-13`.
- Compacted emblem to `w-8 h-8 rounded-lg` with `w-5 h-5` icon.
- Reduced `<main>` vertical padding to `py-3.5 sm:py-4`.

### 3. Automated Test Suite (`frontend/tests/pos_mandatory_fields_and_density.test.ts`)
- Created dedicated test suite with 11 automated assertions verifying default initialization, mandatory validation, visual error states, post-sale reset, layout compact heights, card positioning, and accessibility contracts.

---

## Verification & Test Results

### 1. Frontend Jest Test Suite (`frontend/tests`)
- **Execution**: `npm test -- --runInBand`
- **Result**: **15 / 15 Suites Passed, 213 / 213 Tests Passed (100%)**
- Includes all preexisting suites: `pos_billing_a11y.test.ts`, `auth_guard.test.ts`, `analytics_timeline_and_refresh.test.ts`, `orders_history_a11y.test.ts`, `editable_procurement_grid.test.ts`, `charges_management.test.ts`, `unified_catalogue_and_pos_resilience.test.ts`, etc.

### 2. Python Backend Test Suite (`test_suite.py`)
- **Execution**: `python test_suite.py`
- **Result**: **53 / 53 Passed (100%)**

### 3. Next.js Production Build (`frontend`)
- **Execution**: `npm run build`
- **Result**: All 15 static routes compiled cleanly with 0 TypeScript/ESLint warnings or errors.

---

## Reviewer Verdicts & Quality Gate
- **Functional Reviewer**: APPROVED (Verified mandatory validation, state reset, card ordering, and layout density).
- **Critic Agent**: APPROVED (Verified backend compatibility, race condition prevention, input sanitation, and touch targets).
- **E2E Reviewer**: APPROVED (Verified visual integrity across viewports, WCAG 2.1 AA contrast, keyboard navigation, and invoice printing).
- **Git Push Constraint**: Preserved strictly local per user instruction: *"address do not push"*.
