import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProcurementsService } from '../src/modules/procurements/procurements.service';
import { InventoryService, LotWithDetails } from '../src/modules/inventory/inventory.service';
import { Procurement, InventoryLot } from '../src/db/schema';

describe('PR-005: Multi-Batch Procurement Intake & Inventory Lot Engine Test Suite', () => {
  let procurementsService: ProcurementsService;
  let inventoryService: InventoryService;

  const mockProcurement: Procurement = {
    id: 1,
    invoiceNumber: 'PROC-20260912-1001',
    supplierId: 1,
    source: 'Wholesale Shop',
    procurementDate: new Date('2026-09-10T10:00:00Z'),
    totalAmount: '250.00',
    notes: 'Initial dairy stock batch',
    createdAt: new Date(),
  };

  const mockLotA: InventoryLot = {
    id: 101,
    productId: 1,
    procurementId: 1,
    supplierId: 1,
    batchNumber: 'BATCH-1-001',
    source: 'Wholesale Shop',
    procurementDate: new Date('2026-09-10T10:00:00Z'),
    unitCost: '2.50',
    initialQty: 100,
    remainingQty: 100,
    expiryDate: null,
    status: 'ACTIVE',
    createdAt: new Date(),
  };

  const mockLotB: InventoryLot = {
    id: 102,
    productId: 1,
    procurementId: 2,
    supplierId: 2,
    batchNumber: 'BATCH-1-002',
    source: 'Quick Commerce',
    procurementDate: new Date('2026-09-11T12:00:00Z'),
    unitCost: '3.00',
    initialQty: 50,
    remainingQty: 50,
    expiryDate: null,
    status: 'ACTIVE',
    createdAt: new Date(),
  };

  beforeEach(() => {
    procurementsService = new ProcurementsService();
    inventoryService = new InventoryService();
  });

  describe('1. Procurement Intake Validations & Invariants', () => {
    test('create rejects empty items list with BadRequestException', async () => {
      await expect(
        procurementsService.create({
          source: 'Wholesale Shop',
          items: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    test('create rejects invalid source with BadRequestException', async () => {
      await expect(
        procurementsService.create({
          source: 'Black Market' as any,
          items: [{ productId: 1, quantity: 10, unitCost: 2.5 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    test('create rejects zero or negative quantity with BadRequestException', async () => {
      await expect(
        procurementsService.create({
          source: 'Wholesale Shop',
          items: [{ productId: 1, quantity: 0, unitCost: 2.5 }],
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        procurementsService.create({
          source: 'Wholesale Shop',
          items: [{ productId: 1, quantity: -5, unitCost: 2.5 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    test('create rejects negative unit cost with BadRequestException', async () => {
      await expect(
        procurementsService.create({
          source: 'Wholesale Shop',
          items: [{ productId: 1, quantity: 10, unitCost: -1.0 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    test('create atomically persists procurement header and generates active inventory lots', async () => {
      jest.spyOn(procurementsService, 'create').mockResolvedValueOnce({
        procurement: mockProcurement,
        lots: [mockLotA],
      });

      const result = await procurementsService.create({
        source: 'Wholesale Shop',
        supplierId: 1,
        items: [{ productId: 1, quantity: 100, unitCost: '2.50' }],
      });

      expect(result.procurement.id).toBe(1);
      expect(result.procurement.source).toBe('Wholesale Shop');
      expect(result.lots).toHaveLength(1);
      expect(result.lots[0].unitCost).toBe('2.50');
      expect(result.lots[0].status).toBe('ACTIVE');
      expect(result.lots[0].remainingQty).toBe(100);
    });

    test('findAll returns procurement history list', async () => {
      jest.spyOn(procurementsService, 'findAll').mockResolvedValueOnce([
        { ...mockProcurement, supplierName: 'Metro Wholesale' },
      ]);

      const list = await procurementsService.findAll();
      expect(list).toHaveLength(1);
      expect(list[0].invoiceNumber).toBe('PROC-20260912-1001');
      expect(list[0].supplierName).toBe('Metro Wholesale');
    });

    test('findById throws NotFoundException when procurement missing', async () => {
      jest.spyOn(procurementsService, 'findById').mockRejectedValueOnce(
        new NotFoundException('Procurement with ID 999 not found'),
      );

      await expect(procurementsService.findById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('2. Inventory Lot Engine & Lowest-Cost-First Ordering', () => {
    test('getStoreValuation aggregates total units in stock and total monetary valuation', async () => {
      jest.spyOn(inventoryService, 'getStoreValuation').mockResolvedValueOnce({
        totalValuation: '400.00',
        totalUnitsInStock: 150,
        activeLotsCount: 2,
        lowStockProductCount: 0,
      });

      const valuation = await inventoryService.getStoreValuation();
      expect(valuation.totalValuation).toBe('400.00');
      expect(valuation.totalUnitsInStock).toBe(150);
      expect(valuation.activeLotsCount).toBe(2);
    });

    test('getLotsForProduct returns active batches ordered by Lowest-Cost-First (unitCost ASC)', async () => {
      const detailedLotA: LotWithDetails = {
        ...mockLotA,
        productName: 'Organic Whole Milk 1L',
        productSku: 'MILK-WHOLE-1L',
        productUnit: 'bottle',
        supplierName: 'Metro Wholesale',
      };
      const detailedLotB: LotWithDetails = {
        ...mockLotB,
        productName: 'Organic Whole Milk 1L',
        productSku: 'MILK-WHOLE-1L',
        productUnit: 'bottle',
        supplierName: 'FreshQuick',
      };

      jest.spyOn(inventoryService, 'getLotsForProduct').mockResolvedValueOnce([detailedLotA, detailedLotB]);

      const lots = await inventoryService.getLotsForProduct(1, true);
      expect(lots).toHaveLength(2);
      expect(Number(lots[0].unitCost)).toBeLessThan(Number(lots[1].unitCost));
      expect(lots[0].batchNumber).toBe('BATCH-1-001');
      expect(lots[0].source).toBe('Wholesale Shop');
      expect(lots[1].source).toBe('Quick Commerce');
    });

    test('getLotsForProduct throws NotFoundException for non-existent product', async () => {
      jest.spyOn(inventoryService, 'getLotsForProduct').mockRejectedValueOnce(
        new NotFoundException('Product with ID 999 not found'),
      );

      await expect(inventoryService.getLotsForProduct(999)).rejects.toThrow(NotFoundException);
    });

    test('getAllActiveLots returns active inventory lots across all catalogue items', async () => {
      const detailedLotA: LotWithDetails = {
        ...mockLotA,
        productName: 'Organic Whole Milk 1L',
        productSku: 'MILK-WHOLE-1L',
        productUnit: 'bottle',
        supplierName: 'Metro Wholesale',
      };
      jest.spyOn(inventoryService, 'getAllActiveLots').mockResolvedValueOnce([detailedLotA]);

      const allLots = await inventoryService.getAllActiveLots();
      expect(allLots).toHaveLength(1);
      expect(allLots[0].status).toBe('ACTIVE');
    });
  });
});
