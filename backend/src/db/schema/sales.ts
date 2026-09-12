import { pgTable, serial, varchar, text, integer, numeric, timestamp, index } from 'drizzle-orm/pg-core';
import { customers } from './customers';
import { users } from './users';

export const sales = pgTable('sales', {
  id: serial('id').primaryKey(),
  invoiceNumber: varchar('invoice_number', { length: 100 }).notNull().unique(),
  customerId: integer('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  salespersonId: integer('salesperson_id').references(() => users.id, { onDelete: 'set null' }),
  saleDate: timestamp('sale_date').defaultNow().notNull(),
  totalRevenue: numeric('total_revenue', { precision: 12, scale: 2 }).notNull().default('0.00'),
  totalCogs: numeric('total_cogs', { precision: 12, scale: 2 }).notNull().default('0.00'),
  netProfit: numeric('net_profit', { precision: 12, scale: 2 }).notNull().default('0.00'),
  paymentMethod: varchar('payment_method', { length: 50 }).notNull().default('CASH'), // CASH, CARD, UPI, CREDIT
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  salesDateIdx: index('sales_date_idx').on(table.saleDate),
  salesCustomerIdx: index('sales_customer_idx').on(table.customerId),
}));

export type Sale = typeof sales.$inferSelect;
export type NewSale = typeof sales.$inferInsert;
