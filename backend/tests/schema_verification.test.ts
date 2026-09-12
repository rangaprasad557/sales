import { getTableColumns } from 'drizzle-orm';
import {
  users,
  categories,
  suppliers,
  customers,
  products,
  procurements,
  inventoryLots,
  sales,
  saleItems,
  saleItemLots,
  categoriesRelations,
  productsRelations,
  suppliersRelations,
  customersRelations,
  usersRelations,
  procurementsRelations,
  inventoryLotsRelations,
  salesRelations,
  saleItemsRelations,
  saleItemLotsRelations,
} from '../src/db/schema';

describe('PR-001 Schema & Drizzle ORM Architecture Verification', () => {
  describe('Master Entities Schema Definitions', () => {
    test('users table has all required columns and constraints', () => {
      const cols = getTableColumns(users);
      expect(cols.id).toBeDefined();
      expect(cols.email).toBeDefined();
      expect(cols.name).toBeDefined();
      expect(cols.googleId).toBeDefined();
      expect(cols.role).toBeDefined();
      expect(cols.createdAt).toBeDefined();
    });

    test('categories table supports hierarchical parent/child tree', () => {
      const cols = getTableColumns(categories);
      expect(cols.id).toBeDefined();
      expect(cols.name).toBeDefined();
      expect(cols.slug).toBeDefined();
      expect(cols.parentId).toBeDefined();
      expect(cols.icon).toBeDefined();
      expect(cols.description).toBeDefined();
      expect(categoriesRelations).toBeDefined();
    });

    test('suppliers table supports procurement channels and payment terms', () => {
      const cols = getTableColumns(suppliers);
      expect(cols.id).toBeDefined();
      expect(cols.name).toBeDefined();
      expect(cols.paymentTerms).toBeDefined();
      expect(cols.contactPerson).toBeDefined();
      expect(cols.phone).toBeDefined();
      expect(cols.email).toBeDefined();
    });

    test('customers table supports credit limit and contact info', () => {
      const cols = getTableColumns(customers);
      expect(cols.id).toBeDefined();
      expect(cols.name).toBeDefined();
      expect(cols.creditLimit).toBeDefined();
      expect(cols.phone).toBeDefined();
    });

    test('products table supports SKU, barcode, UoM, and pgvector embedding', () => {
      const cols = getTableColumns(products);
      expect(cols.id).toBeDefined();
      expect(cols.sku).toBeDefined();
      expect(cols.name).toBeDefined();
      expect(cols.barcode).toBeDefined();
      expect(cols.categoryId).toBeDefined();
      expect(cols.unit).toBeDefined();
      expect(cols.minStockThreshold).toBeDefined();
      expect(cols.defaultSalePrice).toBeDefined();
      expect(cols.embedding).toBeDefined();
    });
  });

  describe('Inventory Lots & Multi-Batch Costing Schema Definitions', () => {
    test('inventory_lots table tracks fluctuating costs, source channels, and remaining quantities', () => {
      const cols = getTableColumns(inventoryLots);
      expect(cols.id).toBeDefined();
      expect(cols.productId).toBeDefined();
      expect(cols.procurementId).toBeDefined();
      expect(cols.supplierId).toBeDefined();
      expect(cols.batchNumber).toBeDefined();
      expect(cols.source).toBeDefined();
      expect(cols.procurementDate).toBeDefined();
      expect(cols.unitCost).toBeDefined();
      expect(cols.initialQty).toBeDefined();
      expect(cols.remainingQty).toBeDefined();
      expect(cols.status).toBeDefined();
    });

    test('procurements table records channel source and totals', () => {
      const cols = getTableColumns(procurements);
      expect(cols.id).toBeDefined();
      expect(cols.invoiceNumber).toBeDefined();
      expect(cols.supplierId).toBeDefined();
      expect(cols.source).toBeDefined();
      expect(cols.procurementDate).toBeDefined();
      expect(cols.totalAmount).toBeDefined();
    });
  });

  describe('Sales & Lot Allocation Attribution Schema Definitions', () => {
    test('sales table records financial totals (Revenue, COGS, Net Profit)', () => {
      const cols = getTableColumns(sales);
      expect(cols.id).toBeDefined();
      expect(cols.invoiceNumber).toBeDefined();
      expect(cols.customerId).toBeDefined();
      expect(cols.salespersonId).toBeDefined();
      expect(cols.saleDate).toBeDefined();
      expect(cols.totalRevenue).toBeDefined();
      expect(cols.totalCogs).toBeDefined();
      expect(cols.netProfit).toBeDefined();
      expect(cols.paymentMethod).toBeDefined();
    });

    test('sale_items table supports AUTO_LOWEST_COST and MANUAL_OVERRIDE', () => {
      const cols = getTableColumns(saleItems);
      expect(cols.id).toBeDefined();
      expect(cols.saleId).toBeDefined();
      expect(cols.productId).toBeDefined();
      expect(cols.quantity).toBeDefined();
      expect(cols.unitSalePrice).toBeDefined();
      expect(cols.subtotalRevenue).toBeDefined();
      expect(cols.subtotalCogs).toBeDefined();
      expect(cols.subtotalProfit).toBeDefined();
      expect(cols.allocationType).toBeDefined();
      expect(cols.selectedLotId).toBeDefined();
    });

    test('sale_item_lots table provides granular batch attribution and exact lot profit tracking', () => {
      const cols = getTableColumns(saleItemLots);
      expect(cols.id).toBeDefined();
      expect(cols.saleItemId).toBeDefined();
      expect(cols.lotId).toBeDefined();
      expect(cols.allocatedQty).toBeDefined();
      expect(cols.unitCost).toBeDefined();
      expect(cols.lotRevenue).toBeDefined();
      expect(cols.lotCogs).toBeDefined();
      expect(cols.lotProfit).toBeDefined();
    });
  });

  describe('Drizzle Relations Completeness', () => {
    test('all entity relations are defined and exportable', () => {
      expect(categoriesRelations).toBeDefined();
      expect(productsRelations).toBeDefined();
      expect(suppliersRelations).toBeDefined();
      expect(customersRelations).toBeDefined();
      expect(usersRelations).toBeDefined();
      expect(procurementsRelations).toBeDefined();
      expect(inventoryLotsRelations).toBeDefined();
      expect(salesRelations).toBeDefined();
      expect(saleItemsRelations).toBeDefined();
      expect(saleItemLotsRelations).toBeDefined();
    });
  });

  describe('Drizzle Migrations & Solo Migrator Verification', () => {
    test('migration SQL file was successfully generated and contains all 10 entity definitions', () => {
      const fs = require('fs');
      const path = require('path');
      const migrationsDir = path.join(__dirname, '../drizzle/migrations');
      expect(fs.existsSync(migrationsDir)).toBe(true);

      const files = fs.readdirSync(migrationsDir).filter((f: string) => f.endsWith('.sql'));
      expect(files.length).toBeGreaterThanOrEqual(1);

      const migrationSql = fs.readFileSync(path.join(migrationsDir, files[0]), 'utf-8');
      const expectedTables = [
        'users',
        'categories',
        'suppliers',
        'customers',
        'products',
        'procurements',
        'inventory_lots',
        'sales',
        'sale_items',
        'sale_item_lots',
      ];

      for (const table of expectedTables) {
        expect(migrationSql).toContain(`CREATE TABLE IF NOT EXISTS "${table}"`);
      }

      // Verify essential indexes
      expect(migrationSql).toContain('CREATE INDEX IF NOT EXISTS "lot_product_cost_idx"');
      expect(migrationSql).toContain('CREATE INDEX IF NOT EXISTS "lot_remaining_qty_idx"');
      expect(migrationSql).toContain('CREATE INDEX IF NOT EXISTS "sales_date_idx"');

      // Verify foreign key constraints
      expect(migrationSql).toContain('ALTER TABLE "inventory_lots" ADD CONSTRAINT');
      expect(migrationSql).toContain('ALTER TABLE "sale_items" ADD CONSTRAINT');
      expect(migrationSql).toContain('ALTER TABLE "sale_item_lots" ADD CONSTRAINT');
    });
  });
});
