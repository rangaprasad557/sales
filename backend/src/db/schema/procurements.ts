import { pgTable, serial, varchar, text, integer, numeric, timestamp } from 'drizzle-orm/pg-core';
import { suppliers } from './suppliers';

export const procurements = pgTable('procurements', {
  id: serial('id').primaryKey(),
  invoiceNumber: varchar('invoice_number', { length: 100 }),
  supplierId: integer('supplier_id').references(() => suppliers.id, { onDelete: 'restrict' }),
  source: varchar('source', { length: 50 }).notNull().default('Wholesale Shop'), // Wholesale Shop, Quick Commerce, E-Commerce, Other
  procurementDate: timestamp('procurement_date').defaultNow().notNull(),
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Procurement = typeof procurements.$inferSelect;
export type NewProcurement = typeof procurements.$inferInsert;
