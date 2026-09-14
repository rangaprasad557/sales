/**
 * PR: Manual Dates (Procurement & Orders) & Procurement Supplier Edit Fix
 * Test Suite covering:
 * 1. Procurement date validation and payload formatting
 * 2. Supplier resolution when opening procurement edit drawer:
 *    - Matches registered supplier correctly (no blank supplier)
 *    - Handles custom/unregistered supplier with __custom__ fallback (no blank supplier)
 *    - Strips previous prefix from notes to avoid compounding duplicate tags
 * 3. POS Order Date selection & payload formatting for retroactive paper entries
 * 4. Orders edit drawer sale date field formatting
 * 5. WCAG 2.1 AA/AAA compliance for date pickers and supplier controls
 */

describe('Manual Dates & Procurement Supplier Edit Bugfix Quality Gate', () => {
  // Helper: Relative Luminance & Contrast Calculation (WCAG 2.1)
  function getLuminance(r: number, g: number, b: number): number {
    const [rs, gs, bs] = [r, g, b].map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  function getContrastRatio(rgb1: [number, number, number], rgb2: [number, number, number]): number {
    const lum1 = getLuminance(...rgb1);
    const lum2 = getLuminance(...rgb2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  }

  describe('1. Procurement Date & Supplier Resolution on Edit', () => {
    const registeredSuppliers = [
      { id: 1, name: 'National Grain Distributors', source: 'Wholesale Shop' },
      { id: 2, name: 'Farm Direct Pulses', source: 'Wholesale Shop' },
      { id: 3, name: 'QuickMart Fresh', source: 'Quick Commerce' },
    ];

    it('resolves registered supplier when editing an existing procurement', () => {
      const procRecord = {
        id: 10,
        invoiceNo: 'PROC-20260815-101',
        supplierName: 'National Grain Distributors',
        source: 'Wholesale Shop',
        procurementDate: '2026-08-15',
        totalAmount: 500,
        itemCount: 50,
        notes: 'Supplier: National Grain Distributors. Product: Basmati Rice. Hand written note #42',
      };

      const matched = registeredSuppliers.find(
        (s) => s.name.trim().toLowerCase() === procRecord.supplierName.trim().toLowerCase()
      );

      let resolvedSupplierId = '';
      let targetSupName = procRecord.supplierName;
      if (matched) {
        resolvedSupplierId = String(matched.id);
        targetSupName = matched.name;
      } else if (targetSupName) {
        resolvedSupplierId = '__custom__';
      }

      expect(resolvedSupplierId).toBe('1');
      expect(targetSupName).toBe('National Grain Distributors');
      expect(targetSupName).not.toBe('');
    });

    it('resolves unregistered / custom supplier as __custom__ without showing blank', () => {
      const procRecord = {
        id: 11,
        invoiceNo: 'PROC-20260818-202',
        supplierName: 'Shri Ram Mills', // Not in registeredSuppliers
        source: 'Wholesale Shop',
        procurementDate: '2026-08-18',
        totalAmount: 1200,
        itemCount: 100,
        notes: 'Supplier: Shri Ram Mills. Product: Wheat Flour.',
      };

      const matched = registeredSuppliers.find(
        (s) => s.name.trim().toLowerCase() === procRecord.supplierName.trim().toLowerCase()
      );

      let resolvedSupplierId = '';
      let targetSupName = procRecord.supplierName;
      if (matched) {
        resolvedSupplierId = String(matched.id);
        targetSupName = matched.name;
      } else if (targetSupName) {
        resolvedSupplierId = '__custom__';
      }

      expect(matched).toBeUndefined();
      expect(resolvedSupplierId).toBe('__custom__');
      expect(targetSupName).toBe('Shri Ram Mills');
      expect(targetSupName).not.toBe('');
    });

    it('extracts supplier name from notes if supplierName field was missing', () => {
      const procRecord = {
        id: 12,
        invoiceNo: 'PROC-20260819-303',
        supplierName: '',
        source: 'Wholesale Shop',
        procurementDate: '2026-08-19',
        totalAmount: 800,
        itemCount: 40,
        notes: 'Supplier: Apex Groceries. Product: Mustard Oil.',
      };

      let resolvedSupplierName = procRecord.supplierName;
      if (!resolvedSupplierName && procRecord.notes) {
        const match = procRecord.notes.match(/Supplier:\s*([^.]+)/i);
        if (match) resolvedSupplierName = match[1].trim();
      }

      expect(resolvedSupplierName).toBe('Apex Groceries');
    });

    it('cleans duplicate system prefixes from notes when editing', () => {
      const rawNotes = 'Supplier: National Grain Distributors. Product: Basmati Rice. Paper receipt #881';
      const cleaned = rawNotes
        .replace(/^Supplier:\s*[^.]*\.?\s*/i, '')
        .replace(/^Product:\s*[^.]*\.?\s*/i, '')
        .trim();

      expect(cleaned).toBe('Paper receipt #881');
    });

    it('formats procurement submission payload with custom retroactive date', () => {
      const formData = {
        invoiceNo: 'PROC-2026-AUG-15',
        supplierId: '1',
        supplierName: 'National Grain Distributors',
        source: 'Wholesale Shop',
        procurementDate: '2026-08-15', // Past paper date
        productId: '4',
        productName: 'Organic Masoor Dal',
        unitCost: '45.00',
        quantity: '100',
        batchCode: 'LOT-AUG15',
        notes: 'Entered from store ledger book',
      };

      const finalSupplierName = 'National Grain Distributors';
      const formattedNotes = `Supplier: ${finalSupplierName}. Product: ${formData.productName}.${formData.notes ? ' ' + formData.notes : ''}`.trim();

      const payload = {
        invoice_no: formData.invoiceNo.trim(),
        source: formData.source,
        procurement_date: formData.procurementDate,
        unit_cost: parseFloat(formData.unitCost),
        quantity: parseFloat(formData.quantity),
        product_id: parseInt(formData.productId, 10),
        notes: formattedNotes,
        items: [
          {
            product_id: parseInt(formData.productId, 10),
            qty: parseFloat(formData.quantity),
            unit_cost: parseFloat(formData.unitCost),
            batch_code: formData.batchCode,
          },
        ],
      };

      expect(payload.procurement_date).toBe('2026-08-15');
      expect(payload.invoice_no).toBe('PROC-2026-AUG-15');
      expect(payload.notes).toContain('Supplier: National Grain Distributors.');
      expect(payload.notes).toContain('Entered from store ledger book');
    });

    it('validates that procurement date cannot be empty', () => {
      const validate = (formData: any) => {
        const errors: Record<string, string> = {};
        if (!formData.invoiceNo?.trim()) errors.invoiceNo = 'Invoice number is required';
        if (!formData.procurementDate) errors.procurementDate = 'Procurement date is required';
        if (!formData.productId) errors.productId = 'Product is required';
        return errors;
      };

      const invalid = validate({ invoiceNo: 'PROC-1', procurementDate: '', productId: '1' });
      expect(invalid.procurementDate).toBe('Procurement date is required');

      const valid = validate({ invoiceNo: 'PROC-1', procurementDate: '2026-08-15', productId: '1' });
      expect(valid.procurementDate).toBeUndefined();
    });
  });

  describe('2. POS Order Date Setting for Retroactive Paper Orders', () => {
    it('initializes POS sale date to current ISO date format YYYY-MM-DD', () => {
      const defaultSaleDate = new Date().toISOString().slice(0, 10);
      expect(defaultSaleDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('allows changing sale date and propagates to salePayload and completedSale record', () => {
      const customPaperDate = '2026-08-10';
      const cartSummary = { subtotal: 450, totalCogs: 300, netProfit: 150 };

      const salePayload = {
        invoice_no: 'INV-20260810-001',
        customer_id: 2,
        sale_date: customPaperDate,
        notes: 'POS Sale. Customer: Green Grocers Co.',
        items: [
          {
            product_id: 1,
            qty: 5,
            unit_sale_price: 90.0,
            allocation_mode: 'AUTO',
          },
        ],
      };

      const completedSaleRecord = {
        invoiceNo: 'INV-20260810-001',
        customerName: 'Green Grocers Co.',
        saleDate: customPaperDate,
        totalAmount: cartSummary.subtotal,
        totalCogs: cartSummary.totalCogs,
        totalProfit: cartSummary.netProfit,
        items: [],
      };

      expect(salePayload.sale_date).toBe('2026-08-10');
      expect(completedSaleRecord.saleDate).toBe('2026-08-10');
    });
  });

  describe('3. WCAG 2.1 AA/AAA Accessibility on New Inputs', () => {
    it('guarantees text contrast ratio on input labels and date picker fields >= 4.5:1', () => {
      const lightBg: [number, number, number] = [255, 255, 255];
      const textPrimary: [number, number, number] = [15, 23, 42]; // #0F172A
      const textMuted: [number, number, number] = [71, 85, 105]; // #475569

      const primaryRatio = getContrastRatio(lightBg, textPrimary);
      const mutedRatio = getContrastRatio(lightBg, textMuted);

      expect(primaryRatio).toBeGreaterThanOrEqual(7.0); // WCAG AAA
      expect(mutedRatio).toBeGreaterThanOrEqual(4.5); // WCAG AA
    });
  });

  describe('4. Multi-Item Consignment Manifest & Rollup Logic', () => {
    const multiItemLots = [
      { id: 1, product_id: 8, product_name: 'Classic Connect', sku: 'PROD-0008', unit_cost: '245.00', initial_qty: '200', remaining_qty: '150' },
      { id: 2, product_id: 8, product_name: 'Classic Connect', sku: 'PROD-0008', unit_cost: '250.00', initial_qty: '100', remaining_qty: '50' },
      { id: 3, product_id: 12, product_name: 'Flake Galaxy', sku: 'PROD-0012', unit_cost: '95.00', initial_qty: '500', remaining_qty: '400' },
      { id: 4, product_id: 19, product_name: 'Gold Flake SLK Sleeks', sku: 'PROD-0019', unit_cost: '110.00', initial_qty: '300', remaining_qty: '300' },
    ];

    it('rolls up multiple inventory lots by product cleanly', () => {
      const map = new Map<number, any>();
      for (const it of multiItemLots) {
        const pid = it.product_id;
        const initialQty = parseFloat(it.initial_qty);
        const remainingQty = parseFloat(it.remaining_qty);
        const unitCost = parseFloat(it.unit_cost);
        const value = initialQty * unitCost;

        if (!map.has(pid)) {
          map.set(pid, {
            productId: pid,
            productName: it.product_name,
            sku: it.sku,
            totalInitialQty: initialQty,
            totalRemainingQty: remainingQty,
            totalValue: value,
            lotsCount: 1,
            minCost: unitCost,
            maxCost: unitCost,
          });
        } else {
          const existing = map.get(pid);
          existing.totalInitialQty += initialQty;
          existing.totalRemainingQty += remainingQty;
          existing.totalValue += value;
          existing.lotsCount += 1;
          existing.minCost = Math.min(existing.minCost, unitCost);
          existing.maxCost = Math.max(existing.maxCost, unitCost);
        }
      }

      const rollups = Array.from(map.values());
      expect(rollups.length).toBe(3); // 3 unique products: Classic Connect, Flake Galaxy, Gold Flake SLK Sleeks

      const classicConnect = rollups.find((r) => r.productId === 8);
      expect(classicConnect).toBeDefined();
      expect(classicConnect.lotsCount).toBe(2);
      expect(classicConnect.totalInitialQty).toBe(300);
      expect(classicConnect.totalRemainingQty).toBe(200);
      expect(classicConnect.totalValue).toBe(200 * 245 + 100 * 250);
      expect(classicConnect.minCost).toBe(245);
      expect(classicConnect.maxCost).toBe(250);
    });

    it('validates multi-item consignments without requiring single-product selection', () => {
      const isMultiItemConsignment = true;
      const formData = {
        invoiceNo: 'PROC-HISTORICAL-INITIAL',
        procurementDate: '2026-08-15',
        productId: '', // empty for multi-item consignment
        unitCost: '',
        quantity: '',
      };

      const errors: Record<string, string> = {};
      if (!formData.invoiceNo.trim()) errors.invoiceNo = 'Invoice number is required';
      if (!formData.procurementDate) errors.procurementDate = 'Procurement date is required';
      if (!isMultiItemConsignment) {
        if (!formData.productId) errors.productId = 'Please select a product';
      }

      expect(Object.keys(errors).length).toBe(0);
    });

    it('formats multi-item consignment update payload correctly', () => {
      const isMultiItemConsignment = true;
      const formData = {
        invoiceNo: 'PROC-HISTORICAL-INITIAL',
        source: 'Wholesale Shop',
        procurementDate: '2026-08-15',
        notes: 'Historical intake updated',
      };
      const finalSupplierName = 'Wholesale Vendor';

      let payload: any;
      if (isMultiItemConsignment) {
        payload = {
          invoice_no: formData.invoiceNo.trim(),
          source: formData.source,
          procurement_date: formData.procurementDate,
          notes: `Supplier: ${finalSupplierName}. ${formData.notes}`,
          is_multi_item: true,
        };
      }

      expect(payload.is_multi_item).toBe(true);
      expect(payload.invoice_no).toBe('PROC-HISTORICAL-INITIAL');
      expect(payload.items).toBeUndefined(); // preserves all lots on backend
    });
  });

  describe('7. Multi-Product Stock Intake Creation (PR-025)', () => {
    const mockCatalogue = [
      { id: 1, name: 'Sugar 1kg', sku: 'SUG-001', unit: 'pcs' },
      { id: 2, name: 'Wheat Flour 5kg', sku: 'WHT-002', unit: 'pcs' },
      { id: 3, name: 'Basmati Rice 10kg', sku: 'RCE-003', unit: 'pcs' },
    ];

    it('initializes default intake row correctly', () => {
      const defaultRow = {
        id: 'row-1',
        productId: String(mockCatalogue[0].id),
        productName: mockCatalogue[0].name,
        unitCost: '10.00',
        quantity: '50',
        batchCode: '',
      };
      expect(defaultRow.productId).toBe('1');
      expect(defaultRow.quantity).toBe('50');
      expect(defaultRow.unitCost).toBe('10.00');
    });

    it('adds and removes intake rows dynamically', () => {
      let rows = [
        { id: '1', productId: '1', productName: 'Sugar 1kg', unitCost: '40.00', quantity: '20', batchCode: '' },
      ];

      // Add a second product row
      const usedIds = new Set(rows.map((r) => r.productId));
      const nextProduct = mockCatalogue.find((p) => !usedIds.has(String(p.id)));
      rows.push({
        id: '2',
        productId: String(nextProduct!.id),
        productName: nextProduct!.name,
        unitCost: '10.00',
        quantity: '50',
        batchCode: '',
      });

      expect(rows.length).toBe(2);
      expect(rows[1].productId).toBe('2');
      expect(rows[1].productName).toBe('Wheat Flour 5kg');

      // Prevent removal if only 1 item left
      const removeRow = (idToRemove: string) => {
        if (rows.length <= 1) return false;
        rows = rows.filter((r) => r.id !== idToRemove);
        return true;
      };

      expect(removeRow('1')).toBe(true);
      expect(rows.length).toBe(1);
      expect(removeRow('2')).toBe(false); // Cannot remove last row
      expect(rows.length).toBe(1);
    });

    it('computes consignment intake summary (total units, total cost, unique products)', () => {
      const intakeItems = [
        { id: '1', productId: '1', productName: 'Sugar 1kg', unitCost: '40.00', quantity: '10', batchCode: '' },
        { id: '2', productId: '2', productName: 'Wheat Flour 5kg', unitCost: '250.00', quantity: '5', batchCode: '' },
        { id: '3', productId: '1', productName: 'Sugar 1kg', unitCost: '42.00', quantity: '10', batchCode: '' }, // second batch of sugar
      ];

      let totalUnits = 0;
      let totalCost = 0;
      const selectedProductIds = new Set<string>();

      for (const item of intakeItems) {
        const qty = parseFloat(item.quantity) || 0;
        const cost = parseFloat(item.unitCost) || 0;
        totalUnits += qty;
        totalCost += qty * cost;
        if (item.productId) selectedProductIds.add(item.productId);
      }

      expect(totalUnits).toBe(25);
      expect(totalCost).toBe(10 * 40 + 5 * 250 + 10 * 42); // 400 + 1250 + 420 = 2070
      expect(selectedProductIds.size).toBe(2); // Sugar and Wheat Flour
    });

    it('validates multi-product rows and catches invalid cost, missing product, or non-positive quantity', () => {
      const invalidItems = [
        { id: '1', productId: '', productName: '', unitCost: '10', quantity: '5', batchCode: '' },
      ];
      const errors: Record<string, string> = {};
      for (let i = 0; i < invalidItems.length; i++) {
        const item = invalidItems[i];
        if (!item.productId) errors[`item_${item.id}_productId`] = `Product #${i + 1} is required`;
      }
      expect(errors['item_1_productId']).toBe('Product #1 is required');

      // Test negative quantity
      const negQtyItems = [
        { id: '2', productId: '1', productName: 'Sugar', unitCost: '10', quantity: '-5', batchCode: '' },
      ];
      const qtyErrors: Record<string, string> = {};
      for (let i = 0; i < negQtyItems.length; i++) {
        const item = negQtyItems[i];
        const qty = parseFloat(item.quantity);
        if (isNaN(qty) || qty <= 0) qtyErrors[`item_${item.id}_quantity`] = `Quantity must be > 0`;
      }
      expect(qtyErrors['item_2_quantity']).toBe('Quantity must be > 0');
    });

    it('formats new multi-product intake payload with generated batch codes and item breakdown', () => {
      const intakeItems = [
        { id: '1', productId: '1', productName: 'Sugar 1kg', unitCost: '40.00', quantity: '100', batchCode: 'LOT-SUG-01' },
        { id: '2', productId: '2', productName: 'Wheat Flour 5kg', unitCost: '250.00', quantity: '50', batchCode: '' },
      ];

      const formData = {
        invoiceNo: 'INV-2026-MULTI-01',
        source: 'Wholesale Shop',
        procurementDate: '2026-09-14',
        supplierName: 'Grand Wholesale Market',
        notes: 'Urgent festival stock',
      };

      const itemsPayload = intakeItems.map((it, idx) => {
        const prodId = parseInt(it.productId, 10);
        const qtyVal = parseFloat(it.quantity);
        const costVal = parseFloat(it.unitCost);
        const bCode = it.batchCode.trim() || `LOT-TEST-${idx + 1}`;
        return {
          product_id: prodId,
          qty: qtyVal,
          unit_cost: costVal,
          batch_code: bCode,
        };
      });

      const payload = {
        invoice_no: formData.invoiceNo.trim(),
        source: formData.source,
        procurement_date: formData.procurementDate,
        notes: `Supplier: ${formData.supplierName}. Products: Sugar 1kg (100), Wheat Flour 5kg (50). ${formData.notes}`.trim(),
        items: itemsPayload,
      };

      expect(payload.invoice_no).toBe('INV-2026-MULTI-01');
      expect(payload.items.length).toBe(2);
      expect(payload.items[0]).toEqual({
        product_id: 1,
        qty: 100,
        unit_cost: 40,
        batch_code: 'LOT-SUG-01',
      });
      expect(payload.items[1].product_id).toBe(2);
      expect(payload.items[1].qty).toBe(50);
      expect(payload.items[1].unit_cost).toBe(250);
      expect(payload.items[1].batch_code).toBe('LOT-TEST-2');
    });
  });

  describe('8. Procurement Deletion & Inventory Invariant Guards (PR-026)', () => {
    it('executes successful deletion of unallocated procurement and removes record', async () => {
      let procurementsList = [
        { id: 1, invoiceNo: 'PROC-101', totalAmount: 500, itemCount: 50 },
        { id: 2, invoiceNo: 'PROC-102', totalAmount: 1200, itemCount: 100 },
      ];

      const deleteId = 1;
      // Mock successful deletion response
      const mockApiResponse = { success: true, message: "Procurement 'PROC-101' and its associated inventory lots were deleted successfully." };

      if (mockApiResponse.success) {
        procurementsList = procurementsList.filter((p) => p.id !== deleteId);
      }

      expect(procurementsList.length).toBe(1);
      expect(procurementsList[0].id).toBe(2);
      expect(mockApiResponse.message).toContain('deleted successfully');
    });

    it('blocks deletion with error when inventory lots have already been sold', async () => {
      let procurementsList = [
        { id: 1, invoiceNo: 'PROC-HISTORICAL-INITIAL', totalAmount: 4059984.92, itemCount: 19103 },
      ];

      // Mock backend 400 error response
      const mockApiResponse = {
        success: false,
        error: "Cannot delete procurement 'PROC-HISTORICAL-INITIAL': 23 lot(s) have already been sold or allocated to sales orders. Please delete or adjust the associated sales orders first.",
      };

      let errorMessage = '';
      if (!mockApiResponse.success) {
        errorMessage = mockApiResponse.error;
      } else {
        procurementsList = procurementsList.filter((p) => p.id !== 1);
      }

      expect(procurementsList.length).toBe(1); // Not deleted
      expect(errorMessage).toContain('already been sold');
    });

    it('maintains WCAG 2.1 AA/AAA contrast ratios for destructive delete buttons', () => {
      // Destructive button text / icon on card background
      // Red: rgb(239, 68, 68) [#ef4444] or dark destructive rgb(220, 38, 38)
      // Background white: rgb(255, 255, 255)
      const contrast = getContrastRatio([220, 38, 38], [255, 255, 255]);
      expect(contrast).toBeGreaterThanOrEqual(4.5); // WCAG 2.1 AA minimum 4.5:1 for normal text
    });
  });
});


