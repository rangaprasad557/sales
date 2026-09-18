import { pgTable, serial, date, numeric, text, timestamp, index } from 'drizzle-orm/pg-core';

export const charges = pgTable(
  'charges',
  {
    id: serial('id').primaryKey(),
    chargeDate: date('charge_date').notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    chargeDateIdx: index('idx_charges_date').on(table.chargeDate, table.id),
  })
);

export type Charge = typeof charges.$inferSelect;
export type NewCharge = typeof charges.$inferInsert;
