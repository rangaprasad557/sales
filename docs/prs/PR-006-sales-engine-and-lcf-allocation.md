# PR-006: Sales Engine & Lowest-Cost-First Automated Allocation

## PR Title & Metadata
- **PR**: PR-006
- **Branch**: `feature/pr-006-sales-engine-and-lcf-allocation`
- **Target Branch**: `master`
- **Author**: Antigravity Agent
- **Stage**: 6 of 10
- **Status**: IN PROGRESS / READY FOR REVIEW

---

## 1. Objective & Scope
The objective of PR-006 is to implement the core sales engine and multi-batch allocation logic within the NestJS modular monolith (`backend/src/modules/sales/`):
1. **Sales Allocation Engine (`SalesService`)**:
   - Automated **Lowest-Cost-First (Cheapest-First)** greedy inventory allocation: bills from the lowest acquisition cost lot first (`unitCost ASC, procurementDate ASC`) and cleanly splits across multiple lots when the requested quantity spans batches.
   - **Manual Batch Selection Override**: Allows salesperson to explicitly designate lots. Strictly enforces cross-product lot guard (prevents allocating lots belonging to a different product), checks batch availability, and verifies quantity equality.
   - **Simulation Engine (`POST /api/sales/simulate`)**: Dry-run sales allocation preview calculating projected Revenue, COGS, Net Profit, and margin percentage without modifying persistent storage.
   - **Atomic Execution (`POST /api/sales`)**: Executes inside a database transaction (`tx`), decrements remaining lot stock, transitions lots to `DEPLETED` upon exact depletion to 0, creates `sales`, `sale_items`, and records lot lineage in `sale_item_lots`.
   - **Atomic Transaction Rollback**: Automatically aborts and rolls back database state if any item has insufficient stock, if a selected lot is invalid, or if cross-product lot leakage is attempted.
2. **Decoupled REST API Endpoints**:
   - `POST /api/sales/simulate`: Dry-run lot allocation preview with financial projections.
   - `POST /api/sales`: Atomic sale invoice creation with multi-batch inventory deduction.
   - `GET /api/sales`: Paginated sales invoice listing with customer info, revenue, COGS, and net profit.
   - `GET /api/sales/:id`: Detailed sale invoice breakdown with line items and lot allocation lineage.
3. **Automated Testing Suite (`backend/tests/sales_allocation.test.ts`)**:
   - Unit and integration tests verifying Lowest-Cost-First single-lot billing, multi-batch split billing, manual override, cross-product lot rejection, depletion to 0, atomic rollback on insufficient stock, and decimal margin precision.

---

## 2. Architectural & Code Modifications

### File Structure:
```
backend/
└── src/
    ├── modules/
    │   └── sales/
    │       ├── sales.module.ts
    │       ├── sales.service.ts
    │       ├── sales.controller.ts
    │       └── dto/
    │           ├── simulate-sale.dto.ts
    │           └── create-sale.dto.ts
    └── app.module.ts          # Register SalesModule
backend/tests/
└── sales_allocation.test.ts   # Comprehensive test suite covering all allocation scenarios
```

---

## 3. Test Scenarios Covered & Execution Results
1. **Lowest-Cost-First Auto-Allocation**:
   - Bill from single cheapest batch.
   - Clean split across multiple batches when quantity exceeds the cheapest batch.
   - Batch status update to `DEPLETED` upon exact depletion to 0.
2. **Manual Lot Selection Override**:
   - Allocate designated lot with correct cost and profit attribution.
   - Cross-product lot leakage guard: rejects lot belonging to another product with `400 Bad Request`.
   - Rejection when manual allocation quantity does not equal requested item quantity.
3. **Financial Math & Margins**:
   - Exact calculation of Revenue, COGS, Net Profit, and Margin % without row multiplication.
4. **Validation & Atomicity**:
   - Rejection of non-existent product ID (`404 Not Found`).
   - Rejection of insufficient total stock (`400 Bad Request`).
   - Full database rollback on transaction failure.
5. **Automated Test Results**:
   - **Backend Jest Suite**: 6/6 test suites passed, 86/86 tests passed (100%).
   - **Python Test Suite**: 31/31 tests passed (100%).
   - **TypeScript Compilation**: Zero compilation errors (`npm run build` exited with code 0).
   - **Total Automated Tests**: 117 automated tests executed across stacks, 0 failures.

---

## 4. Multi-Agent Review Verdicts
- **Functional Reviewer**: ✅ **APPROVED** (0 Blockers, 0 Majors)
- **E2E Reviewer**: ✅ **APPROVED** (0 Blockers, 0 Majors)
- **Critic Agent**: 🏆 **APPROVED (READY FOR MERGE)** (0 Blockers, 0 Majors)
- **Merged to Master**: Yes

