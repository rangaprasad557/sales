import { relations } from 'drizzle-orm';
import { users } from './users';
import { categories } from './categories';
import { suppliers } from './suppliers';
import { customers } from './customers';
import { products } from './products';
import { procurements } from './procurements';
import { inventoryLots } from './inventory_lots';
import { sales } from './sales';
import { saleItems } from './sale_items';
import { saleItemLots } from './sale_item_lots';

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'category_hierarchy',
  }),
  children: many(categories, { relationName: 'category_hierarchy' }),
  products: many(products),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  procurements: many(procurements),
  inventoryLots: many(inventoryLots),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  sales: many(sales),
}));

export const usersRelations = relations(users, ({ many }) => ({
  sales: many(sales),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  inventoryLots: many(inventoryLots),
  saleItems: many(saleItems),
}));

export const procurementsRelations = relations(procurements, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [procurements.supplierId],
    references: [suppliers.id],
  }),
  lots: many(inventoryLots),
}));

export const inventoryLotsRelations = relations(inventoryLots, ({ one, many }) => ({
  product: one(products, {
    fields: [inventoryLots.productId],
    references: [products.id],
  }),
  procurement: one(procurements, {
    fields: [inventoryLots.procurementId],
    references: [procurements.id],
  }),
  supplier: one(suppliers, {
    fields: [inventoryLots.supplierId],
    references: [suppliers.id],
  }),
  saleItemLots: many(saleItemLots),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  customer: one(customers, {
    fields: [sales.customerId],
    references: [customers.id],
  }),
  salesperson: one(users, {
    fields: [sales.salespersonId],
    references: [users.id],
  }),
  items: many(saleItems),
}));

export const saleItemsRelations = relations(saleItems, ({ one, many }) => ({
  sale: one(sales, {
    fields: [saleItems.saleId],
    references: [sales.id],
  }),
  product: one(products, {
    fields: [saleItems.productId],
    references: [products.id],
  }),
  selectedLot: one(inventoryLots, {
    fields: [saleItems.selectedLotId],
    references: [inventoryLots.id],
  }),
  lots: many(saleItemLots),
}));

export const saleItemLotsRelations = relations(saleItemLots, ({ one }) => ({
  saleItem: one(saleItems, {
    fields: [saleItemLots.saleItemId],
    references: [saleItems.id],
  }),
  lot: one(inventoryLots, {
    fields: [saleItemLots.lotId],
    references: [inventoryLots.id],
  }),
}));
