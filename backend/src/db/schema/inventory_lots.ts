import { pgTable, serial, varchar, integer, numeric, timestamp, index } from 'drizzle-orm/pg-core';
import { products } from './products';
import { procurements } from './procurements';
import { suppliers } from './suppliers';

export const inventoryLots = pgTable('inventory_lots', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  procurementId: integer('procurement_id').references(() => procurements.id, { onDelete: 'set null' }),
  supplierId: integer('supplier_id').references(() => suppliers.id, { onDelete: 'set null' }),
  batchNumber: varchar('batch_number', { length: 100 }),
  source: varchar('source', { length: 50 }).notNull().default('Wholesale Shop'), // Wholesale Shop, Quick Commerce, E-Commerce, Other
  procurementDate: timestamp('procurement_date').defaultNow().notNull(),
  unitCost: numeric('unit_cost', { precision: 12, scale: 2 }).notNull(),
  initialQty: integer('initial_qty').notNull(),
  remainingQty: integer('remaining_qty').notNull(),
  expiryDate: timestamp('expiry_date'),
  status: varchar('status', { length: 20 }).notNull().default('ACTIVE'), // ACTIVE, DEPLETED, EXPIRED
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  lotProductCostIdx: index('lot_product_cost_idx').on(table.productId, table.unitCost, table.status),
  lotRemainingQtyIdx: index('lot_remaining_qty_idx').on(table.remainingQty),
}));

export type InventoryLot = typeof inventoryLots.$inferSelect;
export type NewInventoryLot = typeof inventoryLots.$inferInsert;
