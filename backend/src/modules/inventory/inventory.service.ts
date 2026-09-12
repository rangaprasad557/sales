import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { db } from '../../db/connection';
import { inventoryLots, products, suppliers, InventoryLot } from '../../db/schema';

export interface LotWithDetails extends InventoryLot {
  productName: string;
  productSku: string;
  productUnit: string;
  supplierName?: string | null;
}

@Injectable()
export class InventoryService {
  async getStoreValuation(): Promise<{
    totalValuation: string;
    totalUnitsInStock: number;
    activeLotsCount: number;
    lowStockProductCount: number;
  }> {
    const activeLots = await db
      .select({
        remainingQty: inventoryLots.remainingQty,
        unitCost: inventoryLots.unitCost,
        productId: inventoryLots.productId,
      })
      .from(inventoryLots)
      .where(eq(inventoryLots.status, 'ACTIVE'));

    let totalValuation = 0;
    let totalUnitsInStock = 0;
    const productStockMap = new Map<number, number>();

    for (const lot of activeLots) {
      totalUnitsInStock += lot.remainingQty;
      totalValuation += lot.remainingQty * Number(lot.unitCost);
      const current = productStockMap.get(lot.productId) || 0;
      productStockMap.set(lot.productId, current + lot.remainingQty);
    }

    const allProducts = await db.select().from(products);
    let lowStockProductCount = 0;
    for (const prod of allProducts) {
      const stock = productStockMap.get(prod.id) || 0;
      if (stock <= prod.minStockThreshold) {
        lowStockProductCount++;
      }
    }

    return {
      totalValuation: totalValuation.toFixed(2),
      totalUnitsInStock,
      activeLotsCount: activeLots.length,
      lowStockProductCount,
    };
  }

  async getLotsForProduct(productId: number, activeOnly: boolean = true): Promise<LotWithDetails[]> {
    const [prod] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!prod) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    let query = db
      .select({
        lot: inventoryLots,
        productName: products.name,
        productSku: products.sku,
        productUnit: products.unit,
        supplierName: suppliers.name,
      })
      .from(inventoryLots)
      .leftJoin(products, eq(inventoryLots.productId, products.id))
      .leftJoin(suppliers, eq(inventoryLots.supplierId, suppliers.id))
      .where(
        activeOnly
          ? and(eq(inventoryLots.productId, productId), eq(inventoryLots.status, 'ACTIVE'))
          : eq(inventoryLots.productId, productId),
      )
      .orderBy(asc(inventoryLots.unitCost), asc(inventoryLots.procurementDate));

    const results = await query;
    return results.map(({ lot, productName, productSku, productUnit, supplierName }) => ({
      ...lot,
      productName: productName || 'Unknown Product',
      productSku: productSku || '',
      productUnit: productUnit || 'pcs',
      supplierName: supplierName || 'Direct / Unspecified',
    }));
  }

  async getAllActiveLots(): Promise<LotWithDetails[]> {
    const results = await db
      .select({
        lot: inventoryLots,
        productName: products.name,
        productSku: products.sku,
        productUnit: products.unit,
        supplierName: suppliers.name,
      })
      .from(inventoryLots)
      .leftJoin(products, eq(inventoryLots.productId, products.id))
      .leftJoin(suppliers, eq(inventoryLots.supplierId, suppliers.id))
      .where(eq(inventoryLots.status, 'ACTIVE'))
      .orderBy(asc(inventoryLots.productId), asc(inventoryLots.unitCost));

    return results.map(({ lot, productName, productSku, productUnit, supplierName }) => ({
      ...lot,
      productName: productName || 'Unknown Product',
      productSku: productSku || '',
      productUnit: productUnit || 'pcs',
      supplierName: supplierName || 'Direct / Unspecified',
    }));
  }
}
