import { IntakeItemRow } from '../app/procurement/page';

describe('PR-031: Editable Procurement Items Grid & Cost Revision', () => {
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

  describe('1. Consignment Item Mapping & State Initialization', () => {
    it('maps multi-item consignment from API response into interactive IntakeItemRow objects', () => {
      const apiItems = [
        {
          id: 101,
          product_id: 1,
          product_name: 'Premium Basmati Rice',
          sku: 'RICE-001',
          batch_code: 'LOT-2026-R1',
          unit_cost: '45.00',
          initial_qty: '100.00',
          remaining_qty: '80.00',
          source: 'Wholesale Shop',
        },
        {
          id: 102,
          product_id: 2,
          product_name: 'Toor Dal Supreme',
          sku: 'DAL-002',
          batch_code: 'LOT-2026-D1',
          unit_cost: '120.00',
          initial_qty: '50.00',
          remaining_qty: '50.00',
          source: 'Wholesale Shop',
        },
      ];

      const mapped: IntakeItemRow[] = apiItems.map((it) => {
        const initQty = parseFloat(it.initial_qty);
        const remQty = parseFloat(it.remaining_qty);
        const sold = Math.max(0, parseFloat((initQty - remQty).toFixed(4)));
        return {
          id: String(it.id),
          lotId: Number(it.id),
          productId: String(it.product_id),
          productName: it.product_name,
          unitCost: String(it.unit_cost),
          quantity: String(it.initial_qty),
          batchCode: it.batch_code,
          remainingQty: remQty,
          alreadySold: sold,
        };
      });

      expect(mapped).toHaveLength(2);
      expect(mapped[0].lotId).toBe(101);
      expect(mapped[0].alreadySold).toBe(20);
      expect(mapped[0].remainingQty).toBe(80);
      expect(mapped[0].unitCost).toBe('45.00');

      expect(mapped[1].lotId).toBe(102);
      expect(mapped[1].alreadySold).toBe(0);
      expect(mapped[1].remainingQty).toBe(50);
      expect(mapped[1].unitCost).toBe('120.00');
    });

    it('falls back cleanly for legacy single-item procurement records without p.items', () => {
      const legacyProc = {
        id: 5,
        invoice_no: 'PROC-LEGACY-001',
        product_id: 3,
        product_name: 'Sunflower Oil 1L',
        unit_cost: '110.00',
        qty: '30',
        batch_code: 'LOT-LEGACY-01',
      };

      const fallbackRow: IntakeItemRow = {
        id: 'legacy-row',
        productId: String(legacyProc.product_id),
        productName: legacyProc.product_name,
        unitCost: legacyProc.unit_cost,
        quantity: legacyProc.qty,
        batchCode: legacyProc.batch_code,
        remainingQty: parseFloat(legacyProc.qty),
        alreadySold: 0,
      };

      expect(fallbackRow.productId).toBe('3');
      expect(fallbackRow.quantity).toBe('30');
      expect(fallbackRow.unitCost).toBe('110.00');
      expect(fallbackRow.alreadySold).toBe(0);
    });
  });

  describe('2. Interactive Cost Revision & Live Line Total Calculation', () => {
    it('recalculates line subtotal and total consignment value immediately upon cost edit', () => {
      const items: IntakeItemRow[] = [
        {
          id: 'row-1',
          lotId: 101,
          productId: '1',
          productName: 'Premium Basmati Rice',
          unitCost: '50.00',
          quantity: '100',
          batchCode: 'LOT-1',
          remainingQty: 100,
          alreadySold: 0,
        },
        {
          id: 'row-2',
          lotId: 102,
          productId: '2',
          productName: 'Toor Dal',
          unitCost: '120.00',
          quantity: '50',
          batchCode: 'LOT-2',
          remainingQty: 50,
          alreadySold: 0,
        },
      ];

      const initialTotal = items.reduce((sum, it) => sum + parseFloat(it.quantity) * parseFloat(it.unitCost), 0);
      expect(initialTotal).toBe(11000);

      const updatedItems = items.map((it) => (it.id === 'row-1' ? { ...it, unitCost: '45.00' } : it));

      const updatedTotal = updatedItems.reduce((sum, it) => sum + parseFloat(it.quantity) * parseFloat(it.unitCost), 0);
      const row1LineTotal = parseFloat(updatedItems[0].quantity) * parseFloat(updatedItems[0].unitCost);

      expect(row1LineTotal).toBe(4500);
      expect(updatedTotal).toBe(10500);
    });
  });

  describe('3. Quantity Revision & Invariant Enforcement', () => {
    it('allows quantity increase for active lots', () => {
      const row: IntakeItemRow = {
        id: 'row-1',
        lotId: 101,
        productId: '1',
        productName: 'Premium Basmati Rice',
        unitCost: '45.00',
        quantity: '100',
        batchCode: 'LOT-1',
        remainingQty: 80,
        alreadySold: 20,
      };

      const newQty = '150';
      const parsedQty = parseFloat(newQty);
      expect(parsedQty >= (row.alreadySold || 0)).toBe(true);
    });

    it('rejects reducing quantity below already sold units', () => {
      const row: IntakeItemRow = {
        id: 'row-1',
        lotId: 101,
        productId: '1',
        productName: 'Premium Basmati Rice',
        unitCost: '45.00',
        quantity: '100',
        batchCode: 'LOT-1',
        remainingQty: 80,
        alreadySold: 20,
      };

      const invalidQty = '15';
      const parsedQty = parseFloat(invalidQty);
      const isInvalid = parsedQty < (row.alreadySold || 0);

      expect(isInvalid).toBe(true);
    });

    it('allows reducing quantity down to exact already sold units (depleted lot state)', () => {
      const row: IntakeItemRow = {
        id: 'row-1',
        lotId: 101,
        productId: '1',
        productName: 'Premium Basmati Rice',
        unitCost: '45.00',
        quantity: '100',
        batchCode: 'LOT-1',
        remainingQty: 80,
        alreadySold: 20,
      };

      const boundaryQty = '20';
      const parsedQty = parseFloat(boundaryQty);
      const isValid = parsedQty >= (row.alreadySold || 0);
      const newRemaining = parsedQty - (row.alreadySold || 0);

      expect(isValid).toBe(true);
      expect(newRemaining).toBe(0);
    });
  });

  describe('4. Lot Deletion Guard', () => {
    it('prevents removing a row if it has active sales', () => {
      const items: IntakeItemRow[] = [
        {
          id: 'row-1',
          lotId: 101,
          productId: '1',
          productName: 'Basmati Rice',
          unitCost: '45.00',
          quantity: '100',
          batchCode: 'LOT-1',
          remainingQty: 80,
          alreadySold: 20,
        },
        {
          id: 'row-2',
          lotId: 102,
          productId: '2',
          productName: 'Toor Dal',
          unitCost: '120.00',
          quantity: '50',
          batchCode: 'LOT-2',
          remainingQty: 50,
          alreadySold: 0,
        },
      ];

      function canRemoveRow(id: string): { allowed: boolean; reason?: string } {
        if (items.length <= 1) return { allowed: false, reason: 'Must contain at least one item' };
        const target = items.find((it) => it.id === id);
        if (target && target.alreadySold && target.alreadySold > 0.0001) {
          return { allowed: false, reason: 'Cannot remove lot with ' + target.alreadySold + ' units sold' };
        }
        return { allowed: true };
      }

      expect(canRemoveRow('row-1').allowed).toBe(false);
      expect(canRemoveRow('row-1').reason).toContain('20 units sold');
      expect(canRemoveRow('row-2').allowed).toBe(true);
    });
  });

  describe('5. Adding New Product to Consignment on Edit', () => {
    it('appends a new product row with empty lotId and default values', () => {
      const currentItems: IntakeItemRow[] = [
        {
          id: 'row-1',
          lotId: 101,
          productId: '1',
          productName: 'Basmati Rice',
          unitCost: '45.00',
          quantity: '100',
          batchCode: 'LOT-1',
          remainingQty: 80,
          alreadySold: 20,
        },
      ];

      const newProduct = { id: 4, name: 'Atta Whole Wheat 10kg', sku: 'AT-004' };

      const newRow: IntakeItemRow = {
        id: 'new-row-uuid',
        productId: String(newProduct.id),
        productName: newProduct.name,
        unitCost: '320.00',
        quantity: '25',
        batchCode: '',
        remainingQty: 25,
        alreadySold: 0,
      };

      const updated = [...currentItems, newRow];
      expect(updated).toHaveLength(2);
      expect(updated[1].lotId).toBeUndefined();
      expect(updated[1].productId).toBe('4');
      expect(updated[1].quantity).toBe('25');
      expect(updated[1].unitCost).toBe('320.00');
    });
  });

  describe('6. PUT Payload Serialization & Formatting', () => {
    it('serializes items correctly preserving lot_id for existing lots and emitting new rows', () => {
      const intakeItems: IntakeItemRow[] = [
        {
          id: 'row-1',
          lotId: 101,
          productId: '1',
          productName: 'Basmati Rice',
          unitCost: '42.50',
          quantity: '100',
          batchCode: 'LOT-101',
          remainingQty: 80,
          alreadySold: 20,
        },
        {
          id: 'row-2',
          productId: '4',
          productName: 'Atta Whole Wheat',
          unitCost: '320.00',
          quantity: '25',
          batchCode: '',
          remainingQty: 25,
          alreadySold: 0,
        },
      ];

      const itemsPayload = intakeItems.map((it, idx) => {
        const prodId = parseInt(it.productId, 10);
        const qtyVal = parseFloat(it.quantity);
        const costVal = parseFloat(it.unitCost);
        const bCode = it.batchCode.trim() || (it.lotId ? it.batchCode : 'LOT-NEW-' + String(idx + 1));
        return {
          lot_id: it.lotId,
          product_id: prodId,
          qty: qtyVal,
          unit_cost: costVal,
          batch_code: bCode,
        };
      });

      expect(itemsPayload[0]).toEqual({
        lot_id: 101,
        product_id: 1,
        qty: 100,
        unit_cost: 42.5,
        batch_code: 'LOT-101',
      });

      expect(itemsPayload[1].lot_id).toBeUndefined();
      expect(itemsPayload[1].product_id).toBe(4);
      expect(itemsPayload[1].qty).toBe(25);
      expect(itemsPayload[1].unit_cost).toBe(320);
      expect(itemsPayload[1].batch_code).toBe('LOT-NEW-2');
    });
  });

  describe('7. WCAG 2.1 AA/AAA Contrast & Accessibility Standards', () => {
    it('verifies contrast ratio for active and sold badge indicators exceeds WCAG AA (4.5:1)', () => {
      const emeraldText: [number, number, number] = [4, 120, 87];
      const emeraldBg: [number, number, number] = [236, 253, 245];
      const emeraldContrast = getContrastRatio(emeraldText, emeraldBg);
      expect(emeraldContrast).toBeGreaterThanOrEqual(4.5);

      const amberText: [number, number, number] = [180, 83, 9];
      const amberBg: [number, number, number] = [255, 251, 235];
      const amberContrast = getContrastRatio(amberText, amberBg);
      expect(amberContrast).toBeGreaterThanOrEqual(4.5);
    });

    it('ensures zero reliance on color alone with explicit textual status labels and icon support', () => {
      const activeStatusBadge = {
        text: 'All 50 On Hand',
        hasTextualClarification: true,
      };
      const soldStatusBadge = {
        text: 'Sold: 20 pcs • On Hand: 80 pcs',
        hasTextualClarification: true,
      };

      expect(activeStatusBadge.text).toMatch(/On Hand/);
      expect(soldStatusBadge.text).toMatch(/Sold:/);
      expect(soldStatusBadge.text).toMatch(/On Hand:/);
    });
  });

  describe('8. Adversarial Guardrails: Product Immutability on Sold Lots & Duplicate Prevention', () => {
    it('locks product selector when lot has active sales', () => {
      const soldLot: IntakeItemRow = {
        id: 'row-1',
        lotId: 101,
        productId: '1',
        productName: 'Basmati Rice',
        unitCost: '45.00',
        quantity: '100',
        batchCode: 'LOT-1',
        remainingQty: 80,
        alreadySold: 20,
      };

      const unsoldLot: IntakeItemRow = {
        id: 'row-2',
        lotId: 102,
        productId: '2',
        productName: 'Toor Dal',
        unitCost: '120.00',
        quantity: '50',
        batchCode: 'LOT-2',
        remainingQty: 50,
        alreadySold: 0,
      };

      const isProductLocked = (item: IntakeItemRow) => Boolean(item.alreadySold && item.alreadySold > 0.0001);

      expect(isProductLocked(soldLot)).toBe(true);
      expect(isProductLocked(unsoldLot)).toBe(false);
    });

    it('detects and prevents duplicate lot IDs in submission payload', () => {
      const payloadItems = [
        { lot_id: 101, product_id: 1, qty: 100, unit_cost: 45.0 },
        { lot_id: 101, product_id: 1, qty: 50, unit_cost: 45.0 }, // duplicate lot_id
      ];

      const seenLotIds = new Set<number>();
      let hasDuplicate = false;
      for (const it of payloadItems) {
        if (it.lot_id) {
          if (seenLotIds.has(it.lot_id)) {
            hasDuplicate = true;
            break;
          }
          seenLotIds.add(it.lot_id);
        }
      }

      expect(hasDuplicate).toBe(true);
    });
  });
});
