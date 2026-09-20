import { pgTable, serial, varchar, date, numeric, text, timestamp, index } from 'drizzle-orm/pg-core';

export const salespersonLedger = pgTable(
  'salesperson_ledger',
  {
    id: serial('id').primaryKey(),
    salesperson: varchar('salesperson', { length: 100 }).notNull().default('Surendra'),
    entryDate: date('entry_date').notNull(),
    entryType: varchar('entry_type', { length: 50 }).notNull().default('SALE'),
    counterparty: varchar('counterparty', { length: 255 }),
    itemDescription: varchar('item_description', { length: 255 }).notNull(),
    quantity: numeric('quantity', { precision: 12, scale: 2 }).default('0.00'),
    unitRate: numeric('unit_rate', { precision: 12, scale: 2 }).default('0.00'),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
    cashAmount: numeric('cash_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
    onlineAmount: numeric('online_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
    dueAmount: numeric('due_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    ledgerDateIdx: index('idx_ledger_date').on(table.entryDate, table.id),
    ledgerSalespersonIdx: index('idx_ledger_salesperson').on(table.salesperson),
    ledgerTypeIdx: index('idx_ledger_type').on(table.entryType),
  })
);

export type SalespersonLedgerEntry = typeof salespersonLedger.$inferSelect;
export type NewSalespersonLedgerEntry = typeof salespersonLedger.$inferInsert;
