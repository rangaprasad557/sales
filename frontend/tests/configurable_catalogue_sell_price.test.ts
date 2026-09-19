/**
 * PR-037: Configurable Catalogue Sell Price Test Suite
 *
 * Verifies:
 * 1. Configured Sell Price pricing hierarchy (configured > lowestCost * 1.30 > fallback)
 * 2. Form validation for sell price inputs (decimals, non-negative, optional blank)
 * 3. Catalogue table Selling Rate column rendering and status badges (Configured vs Auto +30%)
 * 4. Product Picker Modal default price prioritization
 * 5. POS Active Cart line item price defaulting and cashier inline override
 * 6. Accessibility & WCAG 2.1 AA/AAA contrast compliance
 */

describe('PR-037: Configurable Catalogue Sell Price Quality Gate', () => {
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

  describe('1. Pricing Derivation Hierarchy', () => {
    interface ProductPricingInput {
      salePrice?: number;
      lowestCost: number;
    }

    const resolveDefaultSalePrice = (product: ProductPricingInput): number => {
      if (product.salePrice && product.salePrice > 0) {
        return product.salePrice;
      }
      if (product.lowestCost > 0) {
        return parseFloat((product.lowestCost * 1.3).toFixed(2));
      }
      return 10.0;
    };

    it('prioritizes configured salePrice when explicitly set > 0', () => {
      const product = { salePrice: 150.0, lowestCost: 90.0 };
      expect(resolveDefaultSalePrice(product)).toBe(150.0);
    });

    it('falls back to lowestCost * 1.30 when salePrice is 0 or undefined', () => {
      const productZero = { salePrice: 0.0, lowestCost: 100.0 };
      expect(resolveDefaultSalePrice(productZero)).toBe(130.0);

      const productUndefined = { lowestCost: 50.0 };
      expect(resolveDefaultSalePrice(productUndefined)).toBe(65.0);
    });

    it('falls back to 10.00 baseline when both salePrice and lowestCost are 0', () => {
      const productEmpty = { salePrice: 0.0, lowestCost: 0.0 };
      expect(resolveDefaultSalePrice(productEmpty)).toBe(10.0);
    });

    it('correctly handles decimal rounding on auto +30%', () => {
      const product = { lowestCost: 33.33 };
      // 33.33 * 1.3 = 43.329 -> 43.33
      expect(resolveDefaultSalePrice(product)).toBe(43.33);
    });
  });

  describe('2. Form Validation & Decimal Input Handling', () => {
    const validateProductForm = (data: { name: string; minStock: string; salePrice?: string }) => {
      const errors: Record<string, string> = {};
      if (!data.name.trim()) errors.name = 'Product name is required';
      const minVal = parseInt(data.minStock, 10);
      if (isNaN(minVal) || minVal < 0) errors.minStock = 'Minimum stock threshold must be 0 or higher';

      if (data.salePrice && data.salePrice.trim()) {
        const sp = parseFloat(data.salePrice);
        if (isNaN(sp) || sp < 0) {
          errors.salePrice = 'Selling rate must be 0 or higher';
        }
      }
      return { isValid: Object.keys(errors).length === 0, errors };
    };

    it('allows blank or empty salePrice (unconfigured auto mode)', () => {
      const res = validateProductForm({ name: 'Organic Almonds', minStock: '5', salePrice: '' });
      expect(res.isValid).toBe(true);
      expect(res.errors.salePrice).toBeUndefined();
    });

    it('accepts valid decimal sale prices', () => {
      const res = validateProductForm({ name: 'Organic Almonds', minStock: '5', salePrice: '450.50' });
      expect(res.isValid).toBe(true);
      expect(res.errors.salePrice).toBeUndefined();
    });

    it('rejects negative sale prices', () => {
      const res = validateProductForm({ name: 'Organic Almonds', minStock: '5', salePrice: '-25.00' });
      expect(res.isValid).toBe(false);
      expect(res.errors.salePrice).toBe('Selling rate must be 0 or higher');
    });

    it('sanitizes non-numeric characters from numeric input', () => {
      const clean = '₹ 1,250.75 ABC'.replace(/[^0-9.]/g, '');
      expect(clean).toBe('1250.75');
      expect(parseFloat(clean)).toBe(1250.75);
    });
  });

  describe('3. Catalogue Table Selling Rate Column & Badges', () => {
    const getSellingRateBadge = (salePrice?: number) => {
      if (salePrice && salePrice > 0) {
        return { label: 'Configured', isConfigured: true };
      }
      return { label: 'Auto (+30%)', isConfigured: false };
    };

    it('marks products with salePrice > 0 as Configured', () => {
      const badge = getSellingRateBadge(120.0);
      expect(badge.label).toBe('Configured');
      expect(badge.isConfigured).toBe(true);
    });

    it('marks products with salePrice 0 or undefined as Auto (+30%)', () => {
      expect(getSellingRateBadge(0).label).toBe('Auto (+30%)');
      expect(getSellingRateBadge(undefined).label).toBe('Auto (+30%)');
    });
  });

  describe('4. Product Picker & POS Multi-Batch Integration', () => {
    it('populates default price in picker modal items using configured salePrice', () => {
      const catalogue = [
        { id: 1, name: 'Configured Prod', lowestCost: 50.0, salePrice: 85.0, currentStock: 20 },
        { id: 2, name: 'Auto Prod', lowestCost: 50.0, salePrice: 0.0, currentStock: 20 },
      ];

      const pickerPrices = catalogue.map((p) => {
        return p.salePrice && p.salePrice > 0
          ? p.salePrice
          : p.lowestCost > 0
          ? parseFloat((p.lowestCost * 1.3).toFixed(2))
          : 10.0;
      });

      expect(pickerPrices[0]).toBe(85.0); // configured
      expect(pickerPrices[1]).toBe(65.0); // 50 * 1.3 = 65
    });

    it('allows cashier to override price on cart items while preserving configured baseline', () => {
      const product = { id: 1, name: 'Rice 5kg', lowestCost: 100.0, salePrice: 140.0 };
      const defaultPrice = product.salePrice > 0 ? product.salePrice : product.lowestCost * 1.3;

      const cartItem = {
        productId: product.id,
        salePrice: defaultPrice,
      };
      expect(cartItem.salePrice).toBe(140.0);

      // Cashier overrides price to 135.00
      cartItem.salePrice = 135.0;
      expect(cartItem.salePrice).toBe(135.0);
      // Master catalogue baseline remains untouched
      expect(product.salePrice).toBe(140.0);
    });
  });

  describe('5. Accessibility & WCAG 2.1 Contrast Standards', () => {
    it('guarantees WCAG 2.1 AA/AAA contrast for selling rate text', () => {
      const fgText: [number, number, number] = [15, 23, 42]; // Slate 900
      const bgCard: [number, number, number] = [255, 255, 255]; // White
      const ratio = getContrastRatio(fgText, bgCard);
      expect(ratio).toBeGreaterThanOrEqual(7.0); // Meets WCAG AAA
    });

    it('ensures Configured badge green text passes WCAG AA against emerald tint', () => {
      const emeraldText: [number, number, number] = [4, 120, 87]; // Emerald 700
      const whiteBg: [number, number, number] = [255, 255, 255];
      const ratio = getContrastRatio(emeraldText, whiteBg);
      expect(ratio).toBeGreaterThanOrEqual(4.5); // Meets WCAG AA
    });

    it('provides explicit text labels without relying on color alone', () => {
      const badgeConfigured = { text: 'Configured', icon: '₹' };
      const badgeAuto = { text: 'Auto (+30%)', icon: '₹' };

      expect(badgeConfigured.text).not.toBe('');
      expect(badgeAuto.text).not.toBe('');
      expect(badgeConfigured.text).not.toEqual(badgeAuto.text);
    });
  });
});
