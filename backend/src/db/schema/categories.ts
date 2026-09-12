import { pgTable, serial, varchar, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  parentId: integer('parent_id').references((): any => categories.id, { onDelete: 'set null' }),
  icon: varchar('icon', { length: 64 }).default('folder'),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
