import { pgTable, serial, varchar, text, integer, numeric, timestamp, customType } from 'drizzle-orm/pg-core';
import { categories } from './categories';

// pgvector custom type definition for Drizzle ORM
export const pgVector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)';
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value);
  },
  fromDriver(value: string): number[] {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  },
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  sku: varchar('sku', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  barcode: varchar('barcode', { length: 100 }).unique(),
  categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
  unit: varchar('unit', { length: 50 }).notNull().default('pcs'), // 'pcs' | 'kg' | 'box' | 'bottle' | 'bag' | 'dozen'
  minStockThreshold: integer('min_stock_threshold').notNull().default(5),
  defaultSalePrice: numeric('default_sale_price', { precision: 12, scale: 2 }).notNull().default('0.00'),
  description: text('description'),
  embedding: pgVector('embedding'), // pgvector for semantic search discovery
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
