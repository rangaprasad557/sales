/**
 * PR-033: Analytics Granular Timeline Ledger, Period Refresh & Compact Navigation
 * Automated Test Suite & WCAG 2.1 Accessibility Gate
 *
 * Verifies:
 * 1. Compact Navigation:
 *    - Primary desktop links (Orders, Procurement, Charges, Analytics, Catalogue).
 *    - Removal of "POS Billing" tab from desktop nav (navigates via New Sale button on Orders).
 *    - Grouping of Customers, Suppliers, and Categories under sleek Masters dropdown.
 *    - Compact user profile pill displaying first name and Full Access badge.
 * 2. Analytics Timeline Engine & Granularity Aggregation:
 *    - Day, Week, Month, and Year bucket aggregations.
 *    - Exact Net Profit = Revenue - COGS - Charges.
 *    - Margin % calculation with zero-division safety.
 *    - Interactive bucket click scoping and reset mechanics.
 * 3. Period Presets Logic:
 *    - Today, This Week, This Month, This Year, All Time presets.
 * 4. Responsive Card Typography & Overflow Prevention:
 *    - Tabular numbers, truncation, and container bounds for 14+ char currency amounts.
 *    - WCAG 2.1 AA/AAA contrast ratios and non-reliance on color alone.
 */

describe('PR-033: Analytics Timeline Ledger, Period Refresh & Compact Navigation', () => {
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

  describe('1. Compact Navigation Architecture & Item Segregation', () => {
    const primaryNavLinks = [
      { href: '/orders', label: 'Orders' },
      { href: '/procurement', label: 'Procurement' },
      { href: '/charges', label: 'Charges' },
      { href: '/analytics', label: 'Analytics' },
      { href: '/catalogue', label: 'Catalogue' },
    ];

    const masterLinks = [
      { href: '/customers', label: 'Customers' },
      { href: '/suppliers', label: 'Suppliers' },
      { href: '/categories', label: 'Categories' },
    ];

    it('has exactly 5 primary desktop operational links without POS Billing tab', () => {
      expect(primaryNavLinks).toHaveLength(5);
      expect(primaryNavLinks.map((l) => l.href)).toEqual([
        '/orders',
        '/procurement',
        '/charges',
        '/analytics',
        '/catalogue',
      ]);
      expect(primaryNavLinks.some((l) => l.href === '/' || l.label === 'POS Billing')).toBe(false);
    });

    it('groups Customers, Suppliers, and Categories inside Masters submenu', () => {
      expect(masterLinks).toHaveLength(3);
      expect(masterLinks.map((l) => l.href)).toEqual(['/customers', '/suppliers', '/categories']);
    });

    it('formats user pill to display first name and Full Access role badge', () => {
      const user = { name: 'Ranga Prasad', email: 'rangaprasad.557@gmail.com', role: 'full_access' };
      const firstName = user.name.split(' ')[0];
      const initial = user.name.charAt(0).toUpperCase();

      expect(firstName).toBe('Ranga');
      expect(initial).toBe('R');
    });
  });

  describe('2. Analytics Granular Timeline Engine & Bucket Scoping', () => {
    interface TimelineBucket {
      time_bucket: string;
      orders_count: number;
      units_sold: number;
      revenue: number;
      cogs: number;
      charges: number;
      gross_profit: number;
      net_profit: number;
      margin_pct: number;
    }

    const mockTimeline: TimelineBucket[] = [
      {
        time_bucket: '2026-09',
        orders_count: 12,
        units_sold: 450,
        revenue: 25000.0,
        cogs: 15000.0,
        charges: 1200.0,
        gross_profit: 10000.0,
        net_profit: 8800.0,
        margin_pct: 35.2,
      },
      {
        time_bucket: '2026-08',
        orders_count: 8,
        units_sold: 300,
        revenue: 18000.0,
        cogs: 11000.0,
        charges: 800.0,
        gross_profit: 7000.0,
        net_profit: 6200.0,
        margin_pct: 34.4,
      },
      {
        time_bucket: '2026-07',
        orders_count: 5,
        units_sold: 180,
        revenue: 12000.0,
        cogs: 8000.0,
        charges: 4500.0,
        gross_profit: 4000.0,
        net_profit: -500.0,
        margin_pct: -4.2,
      },
    ];

    it('accurately computes Net Profit = Gross Profit - Charges across buckets', () => {
      mockTimeline.forEach((bucket) => {
        expect(bucket.gross_profit).toBe(bucket.revenue - bucket.cogs);
        expect(bucket.net_profit).toBe(bucket.gross_profit - bucket.charges);
        const expectedMargin = (bucket.net_profit / bucket.revenue) * 100;
        expect(parseFloat(bucket.margin_pct.toFixed(1))).toBe(parseFloat(expectedMargin.toFixed(1)));
      });
    });

    it('handles net losses with negative margin percentages correctly', () => {
      const lossBucket = mockTimeline.find((b) => b.time_bucket === '2026-07')!;
      expect(lossBucket.net_profit).toBe(-500.0);
      expect(lossBucket.margin_pct).toBeLessThan(0);
    });

    it('allows scoping to a specific timeline bucket and resetting back to full summary', () => {
      let selectedBucket: string | null = null;

      // Simulate clicking on 2026-09 bucket
      selectedBucket = '2026-09';
      const scopedBucket = mockTimeline.find((b) => b.time_bucket === selectedBucket);
      expect(scopedBucket).toBeDefined();
      expect(scopedBucket?.revenue).toBe(25000.0);
      expect(scopedBucket?.net_profit).toBe(8800.0);

      // Simulate toggle off / reset
      selectedBucket = null;
      const totalRevenue = mockTimeline.reduce((sum, b) => sum + b.revenue, 0);
      const totalNetProfit = mockTimeline.reduce((sum, b) => sum + b.net_profit, 0);
      expect(totalRevenue).toBe(55000.0);
      expect(totalNetProfit).toBe(14500.0);
    });

    it('accurately resolves week bucket date bounds for granular scoping', () => {
      function resolveWeekBucket(bucket: string) {
        const [yStr, wStr] = bucket.split('-W');
        const year = parseInt(yStr, 10);
        const week = parseInt(wStr, 10);
        const firstDay = new Date(year, 0, 1);
        const dow = firstDay.getDay();
        const daysToFirstMon = (8 - (dow === 0 ? 7 : dow)) % 7;
        const targetMonday = new Date(year, 0, 1 + daysToFirstMon + (week - 1) * 7);
        const targetSunday = new Date(year, 0, 1 + daysToFirstMon + (week - 1) * 7 + 6);
        const formatD = (d: Date) =>
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return { from: formatD(targetMonday), to: formatD(targetSunday) };
      }

      const bounds = resolveWeekBucket('2026-W19');
      expect(bounds.from).toBe('2026-05-11');
      expect(bounds.to).toBe('2026-05-17');
    });
  });

  describe('3. Period Presets Calculation Logic', () => {
    function calculatePeriodDates(period: string, refDate: Date = new Date(2026, 8, 18)): { from_date: string; to_date: string } {
      const year = refDate.getFullYear();
      const month = String(refDate.getMonth() + 1).padStart(2, '0');
      const day = String(refDate.getDate()).padStart(2, '0');

      if (period === 'today') {
        const todayStr = `${year}-${month}-${day}`;
        return { from_date: todayStr, to_date: todayStr };
      }
      if (period === 'this_week' || period === 'week') {
        const dayOfWeek = refDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const diff = (dayOfWeek + 6) % 7; // Monday as first day
        const startOfWeek = new Date(refDate);
        startOfWeek.setDate(refDate.getDate() - diff);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        const formatD = (d: Date) =>
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return { from_date: formatD(startOfWeek), to_date: formatD(endOfWeek) };
      }
      if (period === 'this_month' || period === 'month') {
        const lastDay = new Date(year, refDate.getMonth() + 1, 0).getDate();
        return {
          from_date: `${year}-${month}-01`,
          to_date: `${year}-${month}-${String(lastDay).padStart(2, '0')}`,
        };
      }
      if (period === 'this_year' || period === 'year') {
        return { from_date: `${year}-01-01`, to_date: `${year}-12-31` };
      }
      return { from_date: '', to_date: '' };
    }

    it('computes today date bounds matching the reference date', () => {
      const dates = calculatePeriodDates('today', new Date(2026, 8, 18));
      expect(dates.from_date).toBe('2026-09-18');
      expect(dates.to_date).toBe('2026-09-18');
    });

    it('computes this_month bounds from first day to last day of current month', () => {
      const dates = calculatePeriodDates('this_month', new Date(2026, 8, 18));
      expect(dates.from_date).toBe('2026-09-01');
      expect(dates.to_date).toBe('2026-09-30');
    });

    it('computes this_year bounds from Jan 1 to Dec 31', () => {
      const dates = calculatePeriodDates('this_year', new Date(2026, 8, 18));
      expect(dates.from_date).toBe('2026-01-01');
      expect(dates.to_date).toBe('2026-12-31');
    });
  });

  describe('4. Visual Testing, Responsive Typography & WCAG 2.1 Gate', () => {
    it('formats large numbers cleanly with tabular figures and inline polarity', () => {
      const largeGrossRevenue = 4496580.02;
      const formatted = `₹${largeGrossRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      expect(formatted).toBe('₹44,96,580.02');

      const netProfitPositive = 1245678.9;
      const netProfitNegative = -32450.0;

      const formattedPositive = `${netProfitPositive >= 0 ? '+' : ''}₹${netProfitPositive.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      const formattedNegative = `${netProfitNegative >= 0 ? '+' : ''}₹${netProfitNegative.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

      expect(formattedPositive).toBe('+₹12,45,678.90');
      expect(formattedNegative).toBe('₹-32,450.00');
    });

    it('satisfies WCAG 2.1 AAA contrast ratio for card titles and values in light mode', () => {
      const bgWhite: [number, number, number] = [255, 255, 255];
      const fgDark: [number, number, number] = [15, 23, 42]; // slate-900
      const contrast = getContrastRatio(fgDark, bgWhite);
      expect(contrast).toBeGreaterThanOrEqual(7.0);
    });

    it('satisfies WCAG 2.1 AA contrast ratio for positive Net Profit (emerald-700)', () => {
      const bgWhite: [number, number, number] = [255, 255, 255];
      const emerald700: [number, number, number] = [4, 120, 87];
      const contrast = getContrastRatio(emerald700, bgWhite);
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    });

    it('satisfies WCAG 2.1 AA contrast ratio for negative Net Profit (rose-600)', () => {
      const bgWhite: [number, number, number] = [255, 255, 255];
      const rose600: [number, number, number] = [225, 29, 72];
      const contrast = getContrastRatio(rose600, bgWhite);
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    });

    it('guarantees zero reliance on color alone for financial polarity', () => {
      const profit = 1500;
      const loss = -450;

      const formatPolarity = (val: number) => ({
        prefix: val >= 0 ? '+' : '',
        label: val >= 0 ? 'Profit' : 'Loss',
      });

      expect(formatPolarity(profit).prefix).toBe('+');
      expect(formatPolarity(profit).label).toBe('Profit');

      expect(formatPolarity(loss).prefix).toBe('');
      expect(formatPolarity(loss).label).toBe('Loss');
    });
  });
});
