import { pgTable, serial, integer, numeric, timestamp, index } from 'drizzle-orm/pg-core';
import { saleItems } from './sale_items';
import { inventoryLots } from './inventory_lots';

export const saleItemLots = pgTable('sale_item_lots', {
  id: serial('id').primaryKey(),
  saleItemId: integer('sale_item_id').notNull().references(() => saleItems.id, { onDelete: 'cascade' }),
  lotId: integer('lot_id').notNull().references(() => inventoryLots.id, { onDelete: 'restrict' }),
  allocatedQty: integer('allocated_qty').notNull(),
  unitCost: numeric('unit_cost', { precision: 12, scale: 2 }).notNull(),
  lotRevenue: numeric('lot_revenue', { precision: 12, scale: 2 }).notNull(),
  lotCogs: numeric('lot_cogs', { precision: 12, scale: 2 }).notNull(),
  lotProfit: numeric('lot_profit', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  silSaleItemIdx: index('sil_sale_item_idx').on(table.saleItemId),
  silLotIdx: index('sil_lot_idx').on(table.lotId),
}));

export type SaleItemLot = typeof saleItemLots.$inferSelect;
export type NewSaleItemLot = typeof saleItemLots.$inferInsert;
