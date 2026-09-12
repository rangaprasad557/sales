# PR-001: Core Foundation & Database Migrations (Drizzle ORM + PostgreSQL 16)

## PR Title & Metadata
- **PR**: PR-001
- **Branch**: `feature/pr-001-foundation-and-drizzle-schema`
- **Target Branch**: `master`
- **Author**: Antigravity Agent
- **Stage**: 1 of 10
- **Status**: IN PROGRESS / READY FOR REVIEW

---

## 1. Objective & Scope
The objective of PR-001 is to establish the core capability layer and database persistence foundation for the modular monolith:
1. **Monorepo / Modular Structure**: Initialize `backend/` (NestJS modular capability layer) and database schema definitions.
2. **PostgreSQL 16 Engine**: Setup connection pooling, Drizzle ORM as solo migrator owner, and PostgreSQL extensions:
   - `pgvector`: HNSW vector indexing for semantic product discovery.
   - `pg_trgm`: Trigram similarity indexing for typo-tolerant fuzzy product search.
3. **Complete Master & Transactional Schemas**:
   - `users`: Google SSO profiles, roles (`admin`, `salesperson`, `auditor`).
   - `categories`: Hierarchical category tree (parent/child relationships with slug and icon).
   - `suppliers`: Contact details, addresses, procurement sources, and payment terms (`Net 30`).
   - `customers`: Contact details, addresses, and credit limits.
   - `products`: SKUs, barcodes, unit of measure (`pcs`, `kg`, `bag`, `bottle`, etc.), min stock threshold, and `vector(1536)` embedding.
   - `procurements`: Intake header tracking invoice number, supplier, channel source (*Wholesale Shop, Quick Commerce, E-Commerce, Other*), date, and total.
   - `inventory_lots`: Multi-batch inventory lot tracking storing fluctuating unit costs, initial quantities, remaining quantities, dates, and sources.
   - `sales`: Billing invoices recording customer, date, total revenue, total COGS, and net profit.
   - `sale_items`: Billed items with chosen quantity, unit sale price, and allocation type (`AUTO_LOWEST_COST` vs `MANUAL_OVERRIDE`).
   - `sale_item_lots`: Audit-grade batch attribution recording exact lots billed, lot unit costs, and realized profit per lot.
4. **Solo Migrator Owner**:
   - Drizzle Kit configuration (`drizzle.config.ts`).
   - Automated migration runner (`src/db/migrate.ts`) with rollback safety.

---

## 2. Architectural & Code Modifications

### File Structure:
```
backend/
├── package.json
├── tsconfig.json
├── jest.config.js
├── drizzle.config.ts
├── drizzle/
│   └── migrations/
│       └── 0000_dear_rumiko_fujikawa.sql # Generated SQL migrations
├── src/
│   ├── db/
│   │   ├── connection.ts          # Postgres pool & Drizzle client
│   │   ├── migrate.ts             # Solo migrator script
│   │   ├── seed.ts                # Master data seed runner
│   │   └── schema/
│   │       ├── users.ts           # Users & SSO roles
│   │       ├── categories.ts      # Hierarchical categories
│   │       ├── suppliers.ts       # Suppliers & procurement channels
│   │       ├── customers.ts       # Customers & credit limits
│   │       ├── products.ts        # Catalogue with pgvector & pg_trgm
│   │       ├── procurements.ts    # Procurement batch headers
│   │       ├── inventory_lots.ts  # Multi-batch costing lots
│   │       ├── sales.ts           # Sales invoice headers
│   │       ├── sale_items.ts      # Line items & allocation type
│   │       ├── sale_item_lots.ts  # Exact lot breakdown & lot profit
│   │       ├── relations.ts       # Declarative ORM relations
│   │       └── index.ts           # Unified schema export
│   └── main.ts                    # Bootstrap entry point with health check
└── tests/
    └── schema_verification.test.ts # Schema integrity, relations & migration tests
```

---

## 3. Test Scenarios Covered & Execution Results
1. **Schema Syntax & Type Safety**: All table definitions, column types, and foreign key relations compile with zero TypeScript errors (`tsc --noEmit` exit 0).
2. **Foreign Key Integrity**:
   - `categories.parentId` correctly self-references `categories.id` with `onDelete: 'set null'`.
   - `products.categoryId` references `categories.id` with `onDelete: 'set null'`.
   - `inventory_lots.productId` references `products.id` with `onDelete: 'cascade'`.
   - `sale_item_lots.lotId` references `inventory_lots.id` ensuring lot attribution cannot point to non-existent inventory.
3. **Database Constraints & Multi-Batch Costing**:
   - Unique constraints enforced on `products.sku`, `categories.slug`, and `users.email`.
   - Precision and scale configured for monetary and quantity values (`numeric(12, 2)`).
   - Multi-batch tracking fields (`unitCost`, `initialQty`, `remainingQty`, `source`, `status`) verified.
4. **Drizzle Migrations & Solo Migrator**:
   - `0000_dear_rumiko_fujikawa.sql` generated with 10 tables, 8 indices, and 11 foreign keys.
   - Migration runner configured with pgvector and pg_trgm validation.
5. **Execution Results**:
   - **Jest Suite (`tests/schema_verification.test.ts`)**: 12/12 tests PASS (100%).
   - **Regression Suite (`test_suite.py`)**: 25/25 tests PASS (100%).

---

## 4. Multi-Agent Review Verdicts
- **Functional Reviewer**: Pending review
- **E2E Reviewer**: Pending review
- **Critic Agent**: Pending review
