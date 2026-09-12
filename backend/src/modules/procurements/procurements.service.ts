import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { db } from '../../db/connection';
import { procurements, inventoryLots, suppliers, products, Procurement, InventoryLot } from '../../db/schema';
import { CreateProcurementDto, VALID_SOURCES } from './dto/create-procurement.dto';

@Injectable()
export class ProcurementsService {
  async create(dto: CreateProcurementDto): Promise<{ procurement: Procurement; lots: InventoryLot[] }> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('At least one procurement line item is required');
    }

    if (!VALID_SOURCES.includes(dto.source as any)) {
      throw new BadRequestException(`Invalid procurement source. Must be one of: ${VALID_SOURCES.join(', ')}`);
    }

    if (dto.supplierId) {
      const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, dto.supplierId)).limit(1);
      if (!supplier) {
        throw new BadRequestException(`Supplier with ID ${dto.supplierId} not found`);
      }
    }

    // Validate each item
    let totalAmount = 0;
    for (const item of dto.items) {
      if (!item.quantity || item.quantity <= 0) {
        throw new BadRequestException(`Quantity for product ${item.productId} must be greater than zero`);
      }
      const cost = Number(item.unitCost);
      if (isNaN(cost) || cost < 0) {
        throw new BadRequestException(`Unit cost for product ${item.productId} must be a non-negative number`);
      }

      const [prod] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
      if (!prod) {
        throw new BadRequestException(`Product with ID ${item.productId} not found`);
      }

      totalAmount += cost * item.quantity;
    }

    const invoiceNumber =
      dto.invoiceNumber?.trim() ||
      `PROC-${new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const procurementDate = dto.procurementDate ? new Date(dto.procurementDate) : new Date();

    const [header] = await db
      .insert(procurements)
      .values({
        invoiceNumber,
        supplierId: dto.supplierId || null,
        source: dto.source,
        procurementDate,
        totalAmount: totalAmount.toFixed(2),
        notes: dto.notes?.trim() || null,
      })
      .returning();

    const createdLots: InventoryLot[] = [];
    for (const item of dto.items) {
      const cost = Number(item.unitCost).toFixed(2);
      const batchNumber =
        item.batchNumber?.trim() ||
        `BATCH-${item.productId}-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

      const [lot] = await db
        .insert(inventoryLots)
        .values({
          productId: item.productId,
          procurementId: header.id,
          supplierId: dto.supplierId || null,
          batchNumber,
          source: dto.source,
          procurementDate,
          unitCost: cost,
          initialQty: item.quantity,
          remainingQty: item.quantity,
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
          status: 'ACTIVE',
        })
        .returning();

      createdLots.push(lot);
    }

    return {
      procurement: header,
      lots: createdLots,
    };
  }

  async findAll(limit: number = 50, offset: number = 0): Promise<any[]> {
    const list = await db
      .select({
        procurement: procurements,
        supplierName: suppliers.name,
      })
      .from(procurements)
      .leftJoin(suppliers, eq(procurements.supplierId, suppliers.id))
      .orderBy(desc(procurements.procurementDate))
      .limit(limit)
      .offset(offset);

    return list.map(({ procurement, supplierName }) => ({
      ...procurement,
      supplierName: supplierName || 'Direct / Unspecified',
    }));
  }

  async findById(id: number): Promise<any> {
    const [found] = await db
      .select({
        procurement: procurements,
        supplierName: suppliers.name,
      })
      .from(procurements)
      .leftJoin(suppliers, eq(procurements.supplierId, suppliers.id))
      .where(eq(procurements.id, id))
      .limit(1);

    if (!found) {
      throw new NotFoundException(`Procurement with ID ${id} not found`);
    }

    const lots = await db
      .select({
        lot: inventoryLots,
        productName: products.name,
        productSku: products.sku,
        productUnit: products.unit,
      })
      .from(inventoryLots)
      .leftJoin(products, eq(inventoryLots.productId, products.id))
      .where(eq(inventoryLots.procurementId, id))
      .orderBy(inventoryLots.unitCost);

    return {
      ...found.procurement,
      supplierName: found.supplierName || 'Direct / Unspecified',
      items: lots.map(({ lot, productName, productSku, productUnit }) => ({
        ...lot,
        productName,
        productSku,
        productUnit,
      })),
    };
  }
}
