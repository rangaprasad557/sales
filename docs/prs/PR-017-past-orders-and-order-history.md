# PR-017: Past Orders & Order History Interface (`/orders`)

## Executive Summary
This Pull Request delivers the **Past Orders & Order History** interface to resolve the user request:
> *"There is no option view past orders"*

It introduces a dedicated, high-performance `/orders` route, links it seamlessly into the main top navigation, command palette, and POS header toolbar, and provides deep transaction transparency with batch allocation lineage and printable receipts via `InvoiceReceiptModal`.

---

## 1. Problem Identification & User Impact
- Previously, sales transactions were persisted to the database via `POST /api/sales` with multi-batch deductions (`sales`, `sale_items`, `sale_item_lots`).
- Although backend endpoints `GET /api/sales` and `GET /api/sales/<id>` existed, the frontend lacked:
  1. A dedicated page to view, search, and filter past sales transactions.
  2. A navigation link in the main navigation bar.
  3. A command palette item in the `Cmd+K` menu.
  4. A quick-access button from the POS billing interface.
  5. The ability to inspect and reprint past invoice receipts with detailed multi-batch cost breakdown.

---

## 2. Architectural & Feature Deliverables

### 2.1 Dedicated Past Orders Page (`frontend/app/orders/page.tsx`)
- **Route**: Accessible at `/orders`.
- **KPI Summary Cards**:
  - **Total Orders**: Count of completed sales.
  - **Gross Sales (₹)**: Total revenue collected across orders formatted in Indian Rupees.
  - **Total COGS (₹)**: Cost of goods sold computed from actual inventory acquisition lots.
  - **Net Profit (+₹) & Margin %**: Store net earnings and average margin percentage.
- **Search & Multi-Attribute Sorting**:
  - Search bar supporting fuzzy search by invoice number (`INV-...`), customer name, notes, or sale date.
  - Sort dropdown: Date & Time, Total Amount, or Net Profit (with Ascending/Descending toggle).
- **Orders Table**:
  - **Invoice #**: Styled badge with monospace font.
  - **Date & Time**: Date and creation timestamp.
  - **Customer**: Customer name with `Users` icon, or accessible `Walk-in Customer` fallback badge.
  - **Items & Units**: Item count and total unit quantity billed.
  - **Order Total (₹)**: Exact invoice amount paid.
  - **COGS (₹)**: Exact cost of goods sold.
  - **Net Profit (+₹)**: Net profit in emerald with margin percentage.
  - **Receipt & Breakdown Action**: Interactive "View Receipt" button that dynamically queries `GET /api/sales/<id>` and displays the full `InvoiceReceiptModal`.
- **Accessible Empty State**:
  - Displays `Receipt` emblem and "No orders found" message.
  - Provides a direct "Go to POS Billing" button when no orders exist.

### 2.2 Navigation Integration (`frontend/components/Navigation.tsx`)
- Added `{ href: '/orders', label: 'Orders', icon: Receipt }` to `navLinks`.
- Fully integrated with both desktop navigation header and mobile sidebar drawer.

### 2.3 Command Palette Registration (`frontend/components/CommandPalette.tsx`)
- Added `Past Orders & Invoices` item under the Navigation category with `Receipt` icon and instant routing to `/orders`.

### 2.4 POS Header Quick Access (`frontend/app/sales/page.tsx`)
- Added a "Past Orders" button in the POS header toolbar next to the Customer Selector, allowing cashiers to quickly check previous receipts.

---

## 3. Verification & Quality Gate Results
- **Frontend Unit & Accessibility Tests (Jest)**: 126 / 126 passing across 9 suites (100% pass rate).
- **TypeScript Type Checking (`npx tsc --noEmit`)**: Exited with 0 errors.
- **Backend Test Suite (`python test_suite.py`)**: 40 / 40 passing (100% pass rate).
- **Live HTTP Routes**:
  - `GET /orders` -> HTTP 200 OK.
  - `GET /api/sales` -> Returns completed sales JSON.
  - `GET /api/sales/<id>` -> Returns detailed sale with items and allocated lots.
