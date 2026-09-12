import { pgTable, serial, varchar, integer, numeric, timestamp, index } from 'drizzle-orm/pg-core';
import { sales } from './sales';
import { products } from './products';
import { inventoryLots } from './inventory_lots';

export const saleItems = pgTable('sale_items', {
  id: serial('id').primaryKey(),
  saleId: integer('sale_id').notNull().references(() => sales.id, { onDelete: 'cascade' }),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),
  quantity: integer('quantity').notNull(),
  unitSalePrice: numeric('unit_sale_price', { precision: 12, scale: 2 }).notNull(),
  subtotalRevenue: numeric('subtotal_revenue', { precision: 12, scale: 2 }).notNull(),
  subtotalCogs: numeric('subtotal_cogs', { precision: 12, scale: 2 }).notNull().default('0.00'),
  subtotalProfit: numeric('subtotal_profit', { precision: 12, scale: 2 }).notNull().default('0.00'),
  allocationType: varchar('allocation_type', { length: 50 }).notNull().default('AUTO_LOWEST_COST'), // 'AUTO_LOWEST_COST' | 'MANUAL_OVERRIDE'
  selectedLotId: integer('selected_lot_id').references(() => inventoryLots.id, { onDelete: 'set null' }), // set only on manual override
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  saleItemsSaleIdx: index('sale_items_sale_idx').on(table.saleId),
  saleItemsProductIdx: index('sale_items_product_idx').on(table.productId),
}));

export type SaleItem = typeof saleItems.$inferSelect;
export type NewSaleItem = typeof saleItems.$inferInsert;
