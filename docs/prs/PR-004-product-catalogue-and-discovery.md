# PR-004: Product Catalogue with pgvector & Trigram Fuzzy Discovery

## PR Title & Metadata
- **PR**: PR-004
- **Branch**: `feature/pr-004-product-catalogue-and-discovery`
- **Target Branch**: `master`
- **Author**: Antigravity Agent
- **Stage**: 4 of 10
- **Status**: IN PROGRESS / READY FOR REVIEW

---

## 1. Objective & Scope
The objective of PR-004 is to deliver the core Product Catalogue capability layer, featuring high-speed fuzzy search, semantic vector discovery, and real-time inventory aggregation:
1. **Product Catalogue Management (`backend/src/modules/products/`)**:
   - Full CRUD: Create, Read (paginated/filtered), Update, Delete.
   - Master product attributes: unique SKU, barcode, category relation, configurable unit of measure (`pcs`, `kg`, `box`, `bottle`, `bag`, `dozen`), minimum stock alert threshold, default sale price (`numeric(12, 2)`), and description.
2. **Fuzzy Product Search (`pg_trgm` / trigram similarity)**:
   - High-speed typo-tolerant matching against product `name`, `sku`, and `description`.
   - Powers the search-driven POS billing bar and Advanced Product Picker Grid.
3. **Semantic Discovery (`pgvector`)**:
   - Stores and searches high-dimensional vector embeddings (`vector(1536)`).
   - Natural language product query endpoint (`POST /api/products/semantic-search`).
4. **Real-time Stock Aggregation**:
   - Dynamically aggregates remaining inventory quantities across all active lots to return `currentStock`, `stockStatus` (`In Stock`, `Low Stock`, `Out of Stock`), and `lowestAvailableCost` without redundant row locks.
5. **Decoupled REST API Contracts**:
   - `GET /api/products`: List products with optional category, low-stock filter, and search.
   - `GET /api/products/:id`: Get product with active batches.
   - `POST /api/products`: Create product.
   - `PUT /api/products/:id`: Update product.
   - `DELETE /api/products/:id`: Delete product.
   - `GET /api/products/search`: High-speed fuzzy search endpoint.
   - `POST /api/products/semantic-search`: Semantic vector query endpoint.

---

## 2. Architectural & Code Modifications

### File Structure:
```
backend/
└── src/
    ├── modules/
    │   └── products/
    │       ├── products.module.ts
    │       ├── products.service.ts
    │       ├── products.controller.ts
    │       └── dto/
    │           ├── create-product.dto.ts
    │           └── search-product.dto.ts
    └── app.module.ts              # Register ProductsModule
tests/
└── products_discovery.test.ts     # Unit and integration tests
```

---

## 3. Test Scenarios Covered & Execution Results
1. **Product CRUD & Validation**:
   - Mandatory name and SKU validation (`BadRequestException`).
   - SKU uniqueness validation and conflict rejection (`ConflictException`).
   - Normalization of SKU to uppercase.
   - Price, threshold, and category associations.
2. **Real-time Stock Level & Status Computation**:
   - Dynamic aggregation of remaining quantities across all active batches.
   - Dynamic status derivation: `Out of Stock` (0), `Low Stock` ($\le \text{minStockThreshold}$), `In Stock`.
   - Lowest available acquisition cost computation.
3. **Fuzzy Search & Advanced Filtering**:
   - Typo-tolerant substring searching matching name, SKU, or description.
   - Filtering by category and `lowStockOnly`.
4. **Semantic Discovery**:
   - Vector embedding parsing and natural language query ordering.
5. **Execution Results**:
   - **Jest Test Suites (`tests/*.test.ts`)**: 61/61 tests PASS across 4 test suites (100%).
   - **Python Regression Suite (`test_suite.py`)**: 28/28 tests PASS (100%).
   - **Total Tests**: 89 automated tests across stacks, 0 failures.

---

## 4. Multi-Agent Review Verdicts
- **Functional Reviewer**: Pending review
- **E2E Reviewer**: Pending review
- **Critic Agent**: Pending review
