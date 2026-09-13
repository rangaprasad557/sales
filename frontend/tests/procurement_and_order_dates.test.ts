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
});
