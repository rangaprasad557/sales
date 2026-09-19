# PR-037: Configurable Catalogue Sell Price

## Scope & Objective

Enable store owners to configure an explicit selling price for each catalogue product. When configured, this price takes priority over the automatic Lowest-Cost-First +30% markup calculation. The pricing hierarchy is:

1. **Priority 1**: Configured `sale_price > 0` from catalogue master
2. **Priority 2**: `round(lowestCost * 1.30, 2)` auto-calculation
3. **Priority 3**: Rs 10.00 fallback (when no inventory exists)

## Architectural & Code Modifications

### Database Schema (db.py)
- Added `sale_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00` to PostgreSQL CREATE TABLE products
- Added `sale_price REAL NOT NULL DEFAULT 0.0` to SQLite CREATE TABLE products
- Added idempotent ALTER TABLE migrations for both engines
- Updated seed_data() with sample sale_price values for 7 seed products
- Updated load_store_catalog() to handle sale_price from JSON backups

### Drizzle ORM Schema (backend/src/db/schema/products.ts)
- Added salePrice column: numeric('sale_price', { precision: 12, scale: 2 })

### Backend API (server.py)
- POST /api/products: Reads sale_price with alias fallback chain
- PUT /api/products/<id>: Same alias chain, updates sale_price column
- GET /api/products: Returns sale_price via existing SELECT p.*

### Catalogue UI (frontend/app/catalogue/page.tsx)
- New Selling Rate table column with Configured/Auto badges
- Product create/edit drawer with currency input and decimal validation

### POS Billing (frontend/app/sales/page.tsx)
- Pricing hierarchy: configured salePrice > lowestCost x 1.3 > Rs 10.00

### Product Picker Modal (frontend/components/ProductPickerModal.tsx)
- Same pricing hierarchy applied to picker default prices

## Test Results

| Suite | Result |
|---|---|
| Python backend (test_suite.py) | 54/54 PASS |
| Frontend Jest (17 suites) | 253/253 PASS |
| Next.js production build | 15/15 routes PASS |

## Review Verdicts

| Reviewer | Model | Verdict |
|---|---|---|
| Functional Reviewer | inherit | APPROVED |
| E2E Reviewer | flash_lite | APPROVED |
| Critic Agent | flash_lite | APPROVED |
