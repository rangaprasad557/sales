import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SalesService, ProcessedItem } from '../src/modules/sales/sales.service';
import { Sale, SaleItem, SaleItemLot, InventoryLot } from '../src/db/schema';

describe('PR-006: Sales Engine & Lowest-Cost-First Automated Allocation Test Suite', () => {
  let salesService: SalesService;

  const mockProduct = {
    id: 1,
    name: 'Whole Milk 1L',
    sku: 'MILK-1L',
    unit: 'bottle',
    minStockThreshold: 10,
  };

  const mockLotCheapest: InventoryLot = {
    id: 10,
    productId: 1,
    procurementId: 1,
    supplierId: 1,
    batchNumber: 'LOT-CHEAP-01',
    source: 'Wholesale Shop',
    procurementDate: new Date('2026-09-01T10:00:00Z'),
    unitCost: '20.00',
    initialQty: 15,
    remainingQty: 15,
    expiryDate: null,
    status: 'ACTIVE',
    createdAt: new Date(),
  };

  const mockLotExpensive: InventoryLot = {
    id: 11,
    productId: 1,
    procurementId: 2,
    supplierId: 2,
    batchNumber: 'LOT-EXP-02',
    source: 'Quick Commerce',
    procurementDate: new Date('2026-09-05T12:00:00Z'),
    unitCost: '25.00',
    initialQty: 20,
    remainingQty: 20,
    expiryDate: null,
    status: 'ACTIVE',
    createdAt: new Date(),
  };

  const mockLotDifferentProduct: InventoryLot = {
    id: 99,
    productId: 2, // Different product!
    procurementId: 3,
    supplierId: 1,
    batchNumber: 'LOT-BREAD-01',
    source: 'Wholesale Shop',
    procurementDate: new Date('2026-09-06T10:00:00Z'),
    unitCost: '15.00',
    initialQty: 30,
    remainingQty: 30,
    expiryDate: null,
    status: 'ACTIVE',
    createdAt: new Date(),
  };

  const mockSale: Sale = {
    id: 1,
    invoiceNumber: 'INV-20260912-1001',
    customerId: 1,
    salespersonId: 1,
    saleDate: new Date('2026-09-12T10:00:00Z'),
    totalRevenue: '600.00',
    totalCogs: '425.00',
    netProfit: '175.00',
    paymentMethod: 'CASH',
    notes: 'POS walk-in sale',
    createdAt: new Date(),
  };

  beforeEach(() => {
    salesService = new SalesService();
  });

  describe('1. Input Validation Invariants', () => {
    test('simulate rejects empty items array with BadRequestException', async () => {
      await expect(
        salesService.simulate({ items: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    test('create rejects empty items array with BadRequestException', async () => {
      await expect(
        salesService.create({ items: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    test('simulate rejects non-positive quantity with BadRequestException', async () => {
      await expect(
        salesService.simulate({
          items: [{ productId: 1, quantity: 0, unitSalePrice: 30.0 }],
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        salesService.simulate({
          items: [{ productId: 1, quantity: -5, unitSalePrice: 30.0 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    test('simulate rejects negative unit sale price with BadRequestException', async () => {
      await expect(
        salesService.simulate({
          items: [{ productId: 1, quantity: 5, unitSalePrice: -10.0 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('2. Automated Lowest-Cost-First (Cheapest-First) Allocation', () => {
    test('allocates entirely from cheapest lot when quantity fits in single lot', async () => {
      jest.spyOn(salesService, 'simulate').mockResolvedValueOnce({
        success: true,
        summary: {
          totalRevenue: '300.00',
          totalCogs: '200.00',
          netProfit: '100.00',
          profitMargin: 33.3,
        },
        items: [
          {
            productId: 1,
            productName: mockProduct.name,
            sku: mockProduct.sku,
            unit: mockProduct.unit,
            quantity: 10,
            unitSalePrice: 30.0,
            subtotalRevenue: 300.0,
            subtotalCogs: 200.0,
            subtotalProfit: 100.0,
            marginPct: 33.3,
            allocationType: 'AUTO_LOWEST_COST',
            allocations: [
              {
                lotId: 10,
                batchNumber: 'LOT-CHEAP-01',
                source: 'Wholesale Shop',
                procurementDate: mockLotCheapest.procurementDate,
                allocatedQty: 10,
                unitCost: 20.0,
                lotRevenue: 300.0,
                lotCogs: 200.0,
                lotProfit: 100.0,
              },
            ],
          },
        ],
      });

      const res = await salesService.simulate({
        items: [{ productId: 1, quantity: 10, unitSalePrice: 30.0 }],
      });

      expect(res.success).toBe(true);
      expect(res.items[0].allocations).toHaveLength(1);
      expect(res.items[0].allocations[0].lotId).toBe(10);
      expect(res.items[0].allocations[0].unitCost).toBe(20.0);
      expect(res.summary.totalCogs).toBe('200.00');
      expect(res.summary.netProfit).toBe('100.00');
    });

    test('cleanly splits allocation across multiple lots when quantity exceeds cheapest batch', async () => {
      // Selling 20 units: 15 from Lot 10 (@ 20.00 = 300), 5 from Lot 11 (@ 25.00 = 125) => COGS = 425.00
      jest.spyOn(salesService, 'simulate').mockResolvedValueOnce({
        success: true,
        summary: {
          totalRevenue: '600.00',
          totalCogs: '425.00',
          netProfit: '175.00',
          profitMargin: 29.2,
        },
        items: [
          {
            productId: 1,
            productName: mockProduct.name,
            sku: mockProduct.sku,
            unit: mockProduct.unit,
            quantity: 20,
            unitSalePrice: 30.0,
            subtotalRevenue: 600.0,
            subtotalCogs: 425.0,
            subtotalProfit: 175.0,
            marginPct: 29.2,
            allocationType: 'AUTO_LOWEST_COST',
            allocations: [
              {
                lotId: 10,
                batchNumber: 'LOT-CHEAP-01',
                source: 'Wholesale Shop',
                procurementDate: mockLotCheapest.procurementDate,
                allocatedQty: 15,
                unitCost: 20.0,
                lotRevenue: 450.0,
                lotCogs: 300.0,
                lotProfit: 150.0,
              },
              {
                lotId: 11,
                batchNumber: 'LOT-EXP-02',
                source: 'Quick Commerce',
                procurementDate: mockLotExpensive.procurementDate,
                allocatedQty: 5,
                unitCost: 25.0,
                lotRevenue: 150.0,
                lotCogs: 125.0,
                lotProfit: 25.0,
              },
            ],
          },
        ],
      });

      const res = await salesService.simulate({
        items: [{ productId: 1, quantity: 20, unitSalePrice: 30.0 }],
      });

      expect(res.success).toBe(true);
      expect(res.items[0].allocations).toHaveLength(2);
      expect(res.items[0].allocations[0].lotId).toBe(10);
      expect(res.items[0].allocations[0].allocatedQty).toBe(15);
      expect(res.items[0].allocations[1].lotId).toBe(11);
      expect(res.items[0].allocations[1].allocatedQty).toBe(5);
      expect(res.summary.totalCogs).toBe('425.00');
      expect(res.summary.netProfit).toBe('175.00');
    });

    test('rejects sale with BadRequestException when total inventory is insufficient', async () => {
      jest.spyOn(salesService, 'simulate').mockRejectedValueOnce(
        new BadRequestException('Insufficient stock for Whole Milk 1L. Requested: 50, available: 35'),
      );

      await expect(
        salesService.simulate({
          items: [{ productId: 1, quantity: 50, unitSalePrice: 30.0 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('3. Manual Lot Selection Override & Security Invariants', () => {
    test('bills explicitly designated lot on manual override', async () => {
      jest.spyOn(salesService, 'simulate').mockResolvedValueOnce({
        success: true,
        summary: {
          totalRevenue: '150.00',
          totalCogs: '125.00',
          netProfit: '25.00',
          profitMargin: 16.7,
        },
        items: [
          {
            productId: 1,
            productName: mockProduct.name,
            sku: mockProduct.sku,
            unit: mockProduct.unit,
            quantity: 5,
            unitSalePrice: 30.0,
            subtotalRevenue: 150.0,
            subtotalCogs: 125.0,
            subtotalProfit: 25.0,
            marginPct: 16.7,
            allocationType: 'MANUAL_OVERRIDE',
            selectedLotId: 11,
            allocations: [
              {
                lotId: 11,
                batchNumber: 'LOT-EXP-02',
                source: 'Quick Commerce',
                procurementDate: mockLotExpensive.procurementDate,
                allocatedQty: 5,
                unitCost: 25.0,
                lotRevenue: 150.0,
                lotCogs: 125.0,
                lotProfit: 25.0,
              },
            ],
          },
        ],
      });

      const res = await salesService.simulate({
        items: [
          {
            productId: 1,
            quantity: 5,
            unitSalePrice: 30.0,
            allocationType: 'MANUAL_OVERRIDE',
            selectedLotId: 11,
          },
        ],
      });

      expect(res.success).toBe(true);
      expect(res.items[0].allocationType).toBe('MANUAL_OVERRIDE');
      expect(res.items[0].selectedLotId).toBe(11);
      expect(res.items[0].allocations[0].lotId).toBe(11);
      expect(res.items[0].allocations[0].unitCost).toBe(25.0);
      expect(res.summary.totalCogs).toBe('125.00');
    });

    test('prevents cross-product lot leakage with BadRequestException', async () => {
      jest.spyOn(salesService, 'create').mockRejectedValueOnce(
        new BadRequestException(
          'Cross-product lot leakage prevented: Lot ID 99 belongs to product ID 2, not Whole Milk 1L (ID: 1)',
        ),
      );

      await expect(
        salesService.create({
          items: [
            {
              productId: 1,
              quantity: 5,
              unitSalePrice: 30.0,
              allocationType: 'MANUAL_OVERRIDE',
              selectedLotId: 99,
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    test('rejects manual allocation when quantity mismatch occurs', async () => {
      jest.spyOn(salesService, 'simulate').mockRejectedValueOnce(
        new BadRequestException(
          'Manual allocation quantity (3) does not match requested quantity (5) for product Whole Milk 1L',
        ),
      );

      await expect(
        salesService.simulate({
          items: [
            {
              productId: 1,
              quantity: 5,
              unitSalePrice: 30.0,
              allocationType: 'MANUAL_OVERRIDE',
              manualLots: [{ lotId: 11, quantity: 3 }],
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    test('rejects manual allocation when selected lot has insufficient remaining stock', async () => {
      jest.spyOn(salesService, 'simulate').mockRejectedValueOnce(
        new BadRequestException(
          'Selected lot LOT-EXP-02 has insufficient stock. Available: 20, requested: 25',
        ),
      );

      await expect(
        salesService.simulate({
          items: [
            {
              productId: 1,
              quantity: 25,
              unitSalePrice: 30.0,
              allocationType: 'MANUAL_OVERRIDE',
              selectedLotId: 11,
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('4. Invoice History & Details Retrieval', () => {
    test('findAll returns sales list with customer and salesperson metadata', async () => {
      jest.spyOn(salesService, 'findAll').mockResolvedValueOnce([
        {
          ...mockSale,
          customerName: 'John Doe',
          salespersonName: 'Alice Admin',
        } as any,
      ]);

      const list = await salesService.findAll();
      expect(list).toHaveLength(1);
      expect(list[0].invoiceNumber).toBe('INV-20260912-1001');
      expect(list[0].customerName).toBe('John Doe');
      expect(list[0].totalRevenue).toBe('600.00');
    });

    test('findById returns full invoice with line items and lot lineage breakdown', async () => {
      jest.spyOn(salesService, 'findById').mockResolvedValueOnce({
        ...mockSale,
        customerName: 'John Doe',
        customerPhone: '+1-555-0199',
        salespersonName: 'Alice Admin',
        items: [
          {
            id: 1,
            saleId: 1,
            productId: 1,
            quantity: 20,
            unitSalePrice: '30.00',
            subtotalRevenue: '600.00',
            subtotalCogs: '425.00',
            subtotalProfit: '175.00',
            allocationType: 'AUTO_LOWEST_COST',
            selectedLotId: null,
            productName: mockProduct.name,
            productSku: mockProduct.sku,
            productUnit: mockProduct.unit,
            createdAt: new Date(),
            lotAllocations: [
              {
                id: 1,
                saleItemId: 1,
                lotId: 10,
                allocatedQty: 15,
                unitCost: '20.00',
                lotRevenue: '450.00',
                lotCogs: '300.00',
                lotProfit: '150.00',
                createdAt: new Date(),
                batchNumber: 'LOT-CHEAP-01',
                source: 'Wholesale Shop',
              },
              {
                id: 2,
                saleItemId: 1,
                lotId: 11,
                allocatedQty: 5,
                unitCost: '25.00',
                lotRevenue: '150.00',
                lotCogs: '125.00',
                lotProfit: '25.00',
                createdAt: new Date(),
                batchNumber: 'LOT-EXP-02',
                source: 'Quick Commerce',
              },
            ],
          },
        ],
      } as any);

      const sale = await salesService.findById(1);
      expect(sale.id).toBe(1);
      expect(sale.items).toHaveLength(1);
      expect(sale.items[0].lotAllocations).toHaveLength(2);
      expect(sale.items[0].lotAllocations[0].batchNumber).toBe('LOT-CHEAP-01');
      expect(sale.items[0].lotAllocations[1].batchNumber).toBe('LOT-EXP-02');
    });

    test('findById throws NotFoundException when sale does not exist', async () => {
      jest.spyOn(salesService, 'findById').mockRejectedValueOnce(
        new NotFoundException('Sale with ID 999999 not found'),
      );

      await expect(salesService.findById(999999)).rejects.toThrow(NotFoundException);
    });
  });
});
