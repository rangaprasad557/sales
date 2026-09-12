import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { eq, and, gt, desc, asc, inArray } from 'drizzle-orm';
import { db } from '../../db/connection';
import {
  sales,
  saleItems,
  saleItemLots,
  inventoryLots,
  products,
  customers,
  users,
  Sale,
} from '../../db/schema';
import { SimulateSaleDto, SaleItemInputDto } from './dto/simulate-sale.dto';
import { CreateSaleDto } from './dto/create-sale.dto';

export interface AllocationSplit {
  lotId: number;
  batchNumber: string | null;
  source: string;
  procurementDate: Date;
  allocatedQty: number;
  unitCost: number;
  lotRevenue: number;
  lotCogs: number;
  lotProfit: number;
}

export interface ProcessedItem {
  productId: number;
  productName: string;
  sku: string;
  unit: string;
  quantity: number;
  unitSalePrice: number;
  subtotalRevenue: number;
  subtotalCogs: number;
  subtotalProfit: number;
  marginPct: number;
  allocationType: string;
  selectedLotId?: number | null;
  allocations: AllocationSplit[];
}

export interface SaleSummary {
  totalRevenue: string;
  totalCogs: string;
  netProfit: string;
  profitMargin: number;
}

@Injectable()
export class SalesService {
  /**
   * Helper to normalize input item fields from either camelCase or snake_case
   */
  private normalizeItem(item: SaleItemInputDto) {
    const productId = item.productId ?? item.product_id;
    const quantity = item.quantity ?? item.qty;
    const unitSalePrice = item.unitSalePrice ?? item.unit_sale_price;
    const allocationType = (
      item.allocationType ??
      item.allocation_mode ??
      'AUTO_LOWEST_COST'
    ).toUpperCase();
    const selectedLotId = item.selectedLotId ?? item.selected_lot_id;
    const manualLots = item.manualLots ?? item.manual_lots;

    return {
      productId,
      quantity,
      unitSalePrice,
      allocationType,
      selectedLotId,
      manualLots,
    };
  }

  /**
   * Core allocation resolution algorithm (shared between simulation and execution)
   */
  private async resolveItemAllocations(
    normalizedItem: ReturnType<typeof this.normalizeItem>,
    txOrDb: any,
  ): Promise<ProcessedItem> {
    const {
      productId,
      quantity,
      unitSalePrice,
      allocationType,
      selectedLotId,
      manualLots,
    } = normalizedItem;

    if (!productId || productId <= 0) {
      throw new BadRequestException('A valid productId is required for each line item');
    }
    if (quantity === undefined || quantity <= 0) {
      throw new BadRequestException(`Quantity must be greater than 0 for product ID ${productId}`);
    }
    if (unitSalePrice === undefined || unitSalePrice < 0) {
      throw new BadRequestException(`Unit sale price cannot be negative for product ID ${productId}`);
    }

    const [product] = await txOrDb
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const allocations: AllocationSplit[] = [];
    let itemCogs = 0;
    const isManual =
      allocationType === 'MANUAL' ||
      allocationType === 'MANUAL_OVERRIDE' ||
      Boolean(selectedLotId) ||
      (manualLots && manualLots.length > 0);

    const finalAllocationType = isManual ? 'MANUAL_OVERRIDE' : 'AUTO_LOWEST_COST';

    if (isManual) {
      // Manual lot override
      let manualAllocList: Array<{ lotId: number; quantity: number }> = [];

      if (manualLots && manualLots.length > 0) {
        manualAllocList = manualLots.map((m) => ({
          lotId: (m.lotId ?? m.lot_id)!,
          quantity: (m.quantity ?? m.qty)!,
        }));
      } else if (selectedLotId) {
        manualAllocList = [{ lotId: selectedLotId, quantity }];
      } else {
        throw new BadRequestException(
          `Manual allocation requested for ${product.name} but no lot specified`,
        );
      }

      const totalAllocated = manualAllocList.reduce((acc, cur) => acc + (cur.quantity || 0), 0);
      if (Math.abs(totalAllocated - quantity) > 0.0001) {
        throw new BadRequestException(
          `Manual allocation quantity (${totalAllocated}) does not match requested quantity (${quantity}) for product ${product.name}`,
        );
      }

      for (const m of manualAllocList) {
        if (!m.lotId) {
          throw new BadRequestException(`Invalid lot ID in manual allocation for ${product.name}`);
        }
        if (m.quantity <= 0) continue;

        const [lot] = await txOrDb
          .select()
          .from(inventoryLots)
          .where(eq(inventoryLots.id, m.lotId))
          .limit(1);

        if (!lot) {
          throw new BadRequestException(`Lot with ID ${m.lotId} does not exist`);
        }

        // Cross-product lot guard
        if (lot.productId !== productId) {
          throw new BadRequestException(
            `Cross-product lot leakage prevented: Lot ID ${lot.id} belongs to product ID ${lot.productId}, not ${product.name} (ID: ${productId})`,
          );
        }

        if (lot.remainingQty < m.quantity) {
          throw new BadRequestException(
            `Selected lot ${lot.batchNumber || lot.id} has insufficient stock. Available: ${lot.remainingQty}, requested: ${m.quantity}`,
          );
        }

        const lotRev = m.quantity * unitSalePrice;
        const lotCost = m.quantity * Number(lot.unitCost);
        const lotProf = lotRev - lotCost;

        itemCogs += lotCost;
        allocations.push({
          lotId: lot.id,
          batchNumber: lot.batchNumber,
          source: lot.source,
          procurementDate: lot.procurementDate,
          allocatedQty: m.quantity,
          unitCost: Number(lot.unitCost),
          lotRevenue: lotRev,
          lotCogs: lotCost,
          lotProfit: lotProf,
        });
      }
    } else {
      // Automated Lowest-Cost-First (Cheapest-First)
      const availableLots = await txOrDb
        .select()
        .from(inventoryLots)
        .where(
          and(
            eq(inventoryLots.productId, productId),
            eq(inventoryLots.status, 'ACTIVE'),
            gt(inventoryLots.remainingQty, 0),
          ),
        )
        .orderBy(asc(inventoryLots.unitCost), asc(inventoryLots.procurementDate));

      const totalAvailable = availableLots.reduce((acc: number, l: any) => acc + l.remainingQty, 0);
      if (totalAvailable < quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${product.name}. Requested: ${quantity}, available: ${totalAvailable}`,
        );
      }

      let remainingToAllocate = quantity;
      for (const lot of availableLots) {
        if (remainingToAllocate <= 0) break;

        const take = Math.min(remainingToAllocate, lot.remainingQty);
        const lotRev = take * unitSalePrice;
        const lotCost = take * Number(lot.unitCost);
        const lotProf = lotRev - lotCost;

        itemCogs += lotCost;
        allocations.push({
          lotId: lot.id,
          batchNumber: lot.batchNumber,
          source: lot.source,
          procurementDate: lot.procurementDate,
          allocatedQty: take,
          unitCost: Number(lot.unitCost),
          lotRevenue: lotRev,
          lotCogs: lotCost,
          lotProfit: lotProf,
        });

        remainingToAllocate -= take;
      }

      if (remainingToAllocate > 0.0001) {
        throw new BadRequestException(
          `Failed to allocate full quantity for ${product.name}. Short by ${remainingToAllocate}`,
        );
      }
    }

    const subtotalRevenue = quantity * unitSalePrice;
    const subtotalProfit = subtotalRevenue - itemCogs;
    const marginPct = subtotalRevenue > 0 ? (subtotalProfit / subtotalRevenue) * 100 : 0;

    return {
      productId,
      productName: product.name,
      sku: product.sku,
      unit: product.unit,
      quantity,
      unitSalePrice,
      subtotalRevenue,
      subtotalCogs: itemCogs,
      subtotalProfit,
      marginPct: Number(marginPct.toFixed(1)),
      allocationType: finalAllocationType,
      selectedLotId: isManual ? (selectedLotId ?? allocations[0]?.lotId ?? null) : null,
      allocations,
    };
  }

  /**
   * Simulate sale allocation without mutating database state
   */
  async simulate(dto: SimulateSaleDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('At least one item is required for simulation');
    }

    const processedItems: ProcessedItem[] = [];
    let overallSale = 0;
    let overallCogs = 0;

    for (const rawItem of dto.items) {
      const normalized = this.normalizeItem(rawItem);
      const processed = await this.resolveItemAllocations(normalized, db);
      processedItems.push(processed);

      overallSale += processed.subtotalRevenue;
      overallCogs += processed.subtotalCogs;
    }

    const overallProfit = overallSale - overallCogs;
    const overallMargin = overallSale > 0 ? (overallProfit / overallSale) * 100 : 0;

    return {
      success: true,
      summary: {
        totalRevenue: overallSale.toFixed(2),
        totalCogs: overallCogs.toFixed(2),
        netProfit: overallProfit.toFixed(2),
        profitMargin: Number(overallMargin.toFixed(1)),
      },
      items: processedItems,
    };
  }

  /**
   * Atomically executes a sale, decrements inventory lots, updates lot status,
   * creates sale header, sale_items, and records sale_item_lots lineage.
   */
  async create(dto: CreateSaleDto, salespersonId?: number) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('At least one item is required to execute a sale');
    }

    const customerId = dto.customerId ?? dto.customer_id ?? null;
    if (customerId) {
      const [cust] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
      if (!cust) {
        throw new NotFoundException(`Customer with ID ${customerId} not found`);
      }
    }

    // Execute within an atomic transaction
    return await db.transaction(async (tx) => {
      const processedItems: ProcessedItem[] = [];
      let totalRevenue = 0;
      let totalCogs = 0;

      // 1. Resolve and validate all allocations within the transaction
      for (const rawItem of dto.items) {
        const normalized = this.normalizeItem(rawItem);
        const processed = await this.resolveItemAllocations(normalized, tx);
        processedItems.push(processed);

        totalRevenue += processed.subtotalRevenue;
        totalCogs += processed.subtotalCogs;
      }

      const netProfit = totalRevenue - totalCogs;

      // 2. Decrement inventory lots
      for (const item of processedItems) {
        for (const alloc of item.allocations) {
          const [lot] = await tx
            .select()
            .from(inventoryLots)
            .where(eq(inventoryLots.id, alloc.lotId))
            .limit(1);

          if (!lot || lot.remainingQty < alloc.allocatedQty) {
            throw new BadRequestException(
              `Insufficient stock on lot ID ${alloc.lotId} during transaction commit`,
            );
          }

          const newRemaining = lot.remainingQty - alloc.allocatedQty;
          const newStatus = newRemaining === 0 ? 'DEPLETED' : 'ACTIVE';

          await tx
            .update(inventoryLots)
            .set({
              remainingQty: newRemaining,
              status: newStatus,
            })
            .where(eq(inventoryLots.id, lot.id));
        }
      }

      // 3. Generate unique invoice number
      const invoiceNumber =
        dto.invoiceNumber ||
        dto.invoice_no ||
        `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const saleDateStr = dto.saleDate || dto.sale_date;
      const saleDate = saleDateStr ? new Date(saleDateStr) : new Date();

      // 4. Insert sales header
      const [newSale] = await tx
        .insert(sales)
        .values({
          invoiceNumber,
          customerId,
          salespersonId: salespersonId || null,
          saleDate,
          totalRevenue: totalRevenue.toFixed(2),
          totalCogs: totalCogs.toFixed(2),
          netProfit: netProfit.toFixed(2),
          paymentMethod: dto.paymentMethod || dto.payment_method || 'CASH',
          notes: dto.notes || null,
        })
        .returning();

      // 5. Insert sale_items and sale_item_lots
      for (const item of processedItems) {
        const [newItem] = await tx
          .insert(saleItems)
          .values({
            saleId: newSale.id,
            productId: item.productId,
            quantity: item.quantity,
            unitSalePrice: item.unitSalePrice.toFixed(2),
            subtotalRevenue: item.subtotalRevenue.toFixed(2),
            subtotalCogs: item.subtotalCogs.toFixed(2),
            subtotalProfit: item.subtotalProfit.toFixed(2),
            allocationType: item.allocationType,
            selectedLotId: item.selectedLotId || null,
          })
          .returning();

        for (const alloc of item.allocations) {
          await tx.insert(saleItemLots).values({
            saleItemId: newItem.id,
            lotId: alloc.lotId,
            allocatedQty: alloc.allocatedQty,
            unitCost: alloc.unitCost.toFixed(2),
            lotRevenue: alloc.lotRevenue.toFixed(2),
            lotCogs: alloc.lotCogs.toFixed(2),
            lotProfit: alloc.lotProfit.toFixed(2),
          });
        }
      }

      return {
        success: true,
        sale: {
          ...newSale,
          items: processedItems,
        },
        message: 'Sale successfully recorded and inventory lots updated',
      };
    });
  }

  /**
   * Get paginated sales history
   */
  async findAll(limit: number = 50, offset: number = 0) {
    const records = await db
      .select({
        sale: sales,
        customerName: customers.name,
        salespersonName: users.name,
      })
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .leftJoin(users, eq(sales.salespersonId, users.id))
      .orderBy(desc(sales.createdAt))
      .limit(limit)
      .offset(offset);

    return records.map(({ sale, customerName, salespersonName }) => ({
      ...sale,
      customerName: customerName || 'Walk-in Customer',
      salespersonName: salespersonName || 'Store Staff',
    }));
  }

  /**
   * Get single sale detail by ID with complete lot lineage
   */
  async findById(id: number) {
    const [saleRecord] = await db
      .select({
        sale: sales,
        customerName: customers.name,
        customerPhone: customers.phone,
        salespersonName: users.name,
      })
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .leftJoin(users, eq(sales.salespersonId, users.id))
      .where(eq(sales.id, id))
      .limit(1);

    if (!saleRecord) {
      throw new NotFoundException(`Sale with ID ${id} not found`);
    }

    const items = await db
      .select({
        item: saleItems,
        productName: products.name,
        productSku: products.sku,
        productUnit: products.unit,
      })
      .from(saleItems)
      .leftJoin(products, eq(saleItems.productId, products.id))
      .where(eq(saleItems.saleId, id));

    const enrichedItems = await Promise.all(
      items.map(async ({ item, productName, productSku, productUnit }) => {
        const lotAllocations = await db
          .select({
            lotAllocation: saleItemLots,
            batchNumber: inventoryLots.batchNumber,
            source: inventoryLots.source,
          })
          .from(saleItemLots)
          .leftJoin(inventoryLots, eq(saleItemLots.lotId, inventoryLots.id))
          .where(eq(saleItemLots.saleItemId, item.id));

        return {
          ...item,
          productName: productName || 'Unknown Product',
          productSku: productSku || '',
          productUnit: productUnit || 'pcs',
          lotAllocations: lotAllocations.map(({ lotAllocation, batchNumber, source }) => ({
            ...lotAllocation,
            batchNumber,
            source,
          })),
        };
      }),
    );

    return {
      ...saleRecord.sale,
      customerName: saleRecord.customerName || 'Walk-in Customer',
      customerPhone: saleRecord.customerPhone || null,
      salespersonName: saleRecord.salespersonName || 'Store Staff',
      items: enrichedItems,
    };
  }
}
