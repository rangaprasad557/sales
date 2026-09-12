import { pgTable, serial, varchar, text, timestamp } from 'drizzle-orm/pg-core';

export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  contactPerson: varchar('contact_person', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  address: text('address'),
  paymentTerms: varchar('payment_terms', { length: 100 }).notNull().default('Immediate'), // 'Immediate' | 'Net 15' | 'Net 30' | 'Net 60'
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Supplier = typeof suppliers.$inferSelect;
export type NewSupplier = typeof suppliers.$inferInsert;
