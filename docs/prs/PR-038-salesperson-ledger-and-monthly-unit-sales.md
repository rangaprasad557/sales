# PR-038: Salesperson Ledger & Monthly Unit Sales by Catalogue

## Scope & Objective

Deliver two high-impact capabilities:
1. **Monthly Unit Sales by Catalogue**: Provide a monthly unit sales cross-tab pivot table on the Analytics page, showing exact quantities sold per product per month and period totals.
2. **Salesperson Ledger & Cash Accountability Register**: A dedicated operational module (/ledger) replacing Surendra's Excel tracking sheet (5,010 rows). Accounts for every rupee received from sales, expenditures on expenses/bills, settlements with the owner (Rangaprasad), and real-time running balances (Cash, Online, Dues, Net position).

## Architectural & Code Modifications

### 1. Monthly Unit Sales by Catalogue (PR-038A)
- **Backend Analytics Engine (nalytics.service.ts & server.py)**:
  - Computes product_monthly_sales grouping sale items by (productId, YYYY-MM).
  - Computes row totals and period months array.
- **Analytics Page UI (rontend/app/analytics/page.tsx)**:
  - Added 'Monthly Unit Sales by Catalogue' card with Grid3X3 icon.
  - Cross-tab pivot table with products as rows, months as columns, and period totals.
  - Zero cells displayed as '-' for visual clarity.
- **Frontend Test (rontend/tests/monthly_unit_sales.test.ts)**:
  - Full test coverage for data mapping, formatting, and empty states.

### 2. Salesperson Ledger (PR-038B)
- **Database Schema (db.py)**:
  - Added salesperson_ledger table to PostgreSQL and SQLite schemas with indices on entry_date, salesperson, and entry_type.
  - Added sequence sync for PostgreSQL.
- **Drizzle ORM (ackend/src/db/schema/salesperson_ledger.ts)**:
  - Added schema and exported in schema/index.ts.
- **Backend REST API (server.py)**:
  - GET /api/ledger: list entries with pagination, search, salesperson, date range, and entry_type filters.
  - GET /api/ledger/summary: real-time totals for cash, online, due, sales, expenses, and net position.
  - POST /api/ledger: validate and insert entries with auto-calculation.
  - PUT /api/ledger/<id>: update existing entry.
  - DELETE /api/ledger/<id>: delete entry.
- **Frontend Ledger Page (rontend/app/ledger/page.tsx)**:
  - 4 Balance cards: Cash held (+/-), Online collected (+/-), Dues pending, Net accountability position.
  - Filter bar: Salesperson selector, Date presets (Today, Week, Month, Year, All Time), search.
  - Filter tabs by entry type (Sale, Purchase, Expense, Paid to Owner, Bill Paid, Due Received, Adjustment).
  - Responsive transaction table with color-coded badges and actions.
  - Slide-over drawer to record/edit transactions with quick split buttons ('All Cash', 'All Online', 'All Due').
- **Navigation (rontend/components/Navigation.tsx)**:
  - Added 'Ledger' with Wallet icon to desktop and mobile navigation.
- **Excel Migration (scripts/migrate_surendra_ledger.py)**:
  - Extracted and classified 4,503 rows from Surendra's Excel sheet.
  - Fuzzy-matched product names to catalogue standards.
  - 100% verified match with Excel Row 1 balances:
    - Cash: Rs. 29,935.00 (Excel: Rs. 29,935.00)
    - Online: -Rs. 94,227.32 (Excel: -Rs. 94,227.32)
    - Net Position: -Rs. 64,292.32 (Excel: -Rs. 64,292.32)
- **Automated Tests**:
  - 	est_suite.py: Added 	est_e2e_55_salesperson_ledger_crud_and_balances (55/55 passed).
  - rontend/tests/salesperson_ledger.test.ts: Added unit/integration tests (267/267 passed across 19 suites).

## Test Results

| Suite | Result |
|---|---|
| Python backend (test_suite.py) | 55/55 PASS (100%) |
| Frontend Jest (19 suites) | 267/267 PASS (100%) |
| Next.js production build | 16/16 routes PASS (100%) |
| Data migration verification | 4,503 rows, balances 100% exact match with Excel |
