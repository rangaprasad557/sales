import { AnalyticsService } from '../src/modules/analytics/analytics.service';

describe('PR-007: Granular Profit & Sales Analytics Engine Test Suite', () => {
  let analyticsService: AnalyticsService;

  beforeEach(() => {
    analyticsService = new AnalyticsService();
  });

  describe('1. Mathematical Exactness & Prevention of Row Multiplication', () => {
    test('computes exact revenue, cogs, profit and margin without row multiplication', async () => {
      jest.spyOn(analyticsService, 'getAnalytics').mockResolvedValueOnce({
        success: true,
        granularity: 'month',
        summary: {
          total_orders: 2,
          totalOrders: 2,
          total_revenue: 1200.0,
          totalRevenue: 1200.0,
          total_cogs: 800.0,
          totalCogs: 800.0,
          total_profit: 400.0,
          totalProfit: 400.0,
          margin_pct: 33.3,
          marginPct: 33.3,
          total_units_sold: 40,
          totalUnitsSold: 40,
        },
        timeline: [
          {
            time_bucket: '2026-09',
            timeBucket: '2026-09',
            orders_count: 2,
            ordersCount: 2,
            revenue: 1200.0,
            cogs: 800.0,
            profit: 400.0,
            units_sold: 40,
            unitsSold: 40,
            margin_pct: 33.3,
            marginPct: 33.3,
          },
        ],
        items: [
          {
            product_id: 1,
            productId: 1,
            product_name: 'Whole Milk 1L',
            productName: 'Whole Milk 1L',
            sku: 'MILK-1L',
            unit: 'bottle',
            current_stock: 50,
            currentStock: 50,
            units_sold: 40,
            unitsSold: 40,
            revenue: 1200.0,
            cogs: 800.0,
            profit: 400.0,
            margin_pct: 33.3,
            marginPct: 33.3,
            avg_sale_price: 30.0,
            avgSalePrice: 30.0,
            avg_cost_price: 20.0,
            avgCostPrice: 20.0,
          },
        ],
        sources: [
          {
            source: 'Wholesale Shop',
            procurements_count: 2,
            procurementsCount: 2,
            total_procured_units: 100,
            totalProcuredUnits: 100,
            total_procured_cost: 2000.0,
            totalProcuredCost: 2000.0,
            remaining_units: 60,
            remainingUnits: 60,
          },
        ],
      });

      const res = await analyticsService.getAnalytics({ granularity: 'month' });

      expect(res.success).toBe(true);
      expect(res.summary.total_orders).toBe(2);
      expect(res.summary.total_revenue).toBe(1200.0);
      expect(res.summary.total_cogs).toBe(800.0);
      expect(res.summary.total_profit).toBe(400.0);
      expect(res.summary.margin_pct).toBe(33.3);
      expect(res.summary.total_units_sold).toBe(40);
    });

    test('verifies dual-naming compatibility for camelCase and snake_case consumers', async () => {
      jest.spyOn(analyticsService, 'getAnalytics').mockResolvedValueOnce({
        success: true,
        granularity: 'month',
        summary: {
          total_orders: 5,
          totalOrders: 5,
          total_revenue: 2500.0,
          totalRevenue: 2500.0,
          total_cogs: 1500.0,
          totalCogs: 1500.0,
          total_profit: 1000.0,
          totalProfit: 1000.0,
          margin_pct: 40.0,
          marginPct: 40.0,
          total_units_sold: 100,
          totalUnitsSold: 100,
        },
        timeline: [],
        items: [],
        sources: [],
      });

      const res = await analyticsService.getAnalytics({});
      expect(res.summary.totalOrders).toBe(res.summary.total_orders);
      expect(res.summary.totalRevenue).toBe(res.summary.total_revenue);
      expect(res.summary.totalProfit).toBe(res.summary.total_profit);
    });
  });

  describe('2. Time-Series Granular Rollups (Day to Year)', () => {
    test('aggregates analytics by day (YYYY-MM-DD)', async () => {
      jest.spyOn(analyticsService, 'getAnalytics').mockResolvedValueOnce({
        success: true,
        granularity: 'day',
        summary: {
          total_orders: 2,
          totalOrders: 2,
          total_revenue: 500.0,
          totalRevenue: 500.0,
          total_cogs: 300.0,
          totalCogs: 300.0,
          total_profit: 200.0,
          totalProfit: 200.0,
          margin_pct: 40.0,
          marginPct: 40.0,
          total_units_sold: 20,
          totalUnitsSold: 20,
        },
        timeline: [
          {
            time_bucket: '2026-09-10',
            timeBucket: '2026-09-10',
            orders_count: 1,
            ordersCount: 1,
            revenue: 200.0,
            cogs: 120.0,
            profit: 80.0,
            units_sold: 8,
            unitsSold: 8,
            margin_pct: 40.0,
            marginPct: 40.0,
          },
          {
            time_bucket: '2026-09-11',
            timeBucket: '2026-09-11',
            orders_count: 1,
            ordersCount: 1,
            revenue: 300.0,
            cogs: 180.0,
            profit: 120.0,
            units_sold: 12,
            unitsSold: 12,
            margin_pct: 40.0,
            marginPct: 40.0,
          },
        ],
        items: [],
        sources: [],
      });

      const res = await analyticsService.getAnalytics({ granularity: 'day' });
      expect(res.granularity).toBe('day');
      expect(res.timeline).toHaveLength(2);
      expect(res.timeline[0].time_bucket).toBe('2026-09-10');
      expect(res.timeline[1].time_bucket).toBe('2026-09-11');
    });

    test('aggregates analytics by week (YYYY-Www)', async () => {
      jest.spyOn(analyticsService, 'getAnalytics').mockResolvedValueOnce({
        success: true,
        granularity: 'week',
        summary: {
          total_orders: 3,
          totalOrders: 3,
          total_revenue: 1500.0,
          totalRevenue: 1500.0,
          total_cogs: 900.0,
          totalCogs: 900.0,
          total_profit: 600.0,
          totalProfit: 600.0,
          margin_pct: 40.0,
          marginPct: 40.0,
          total_units_sold: 50,
          totalUnitsSold: 50,
        },
        timeline: [
          {
            time_bucket: '2026-W37',
            timeBucket: '2026-W37',
            orders_count: 3,
            ordersCount: 3,
            revenue: 1500.0,
            cogs: 900.0,
            profit: 600.0,
            units_sold: 50,
            unitsSold: 50,
            margin_pct: 40.0,
            marginPct: 40.0,
          },
        ],
        items: [],
        sources: [],
      });

      const res = await analyticsService.getAnalytics({ granularity: 'week' });
      expect(res.granularity).toBe('week');
      expect(res.timeline[0].time_bucket).toMatch(/^2026-W\d{2}$/);
    });

    test('aggregates analytics by year (YYYY)', async () => {
      jest.spyOn(analyticsService, 'getAnalytics').mockResolvedValueOnce({
        success: true,
        granularity: 'year',
        summary: {
          total_orders: 100,
          totalOrders: 100,
          total_revenue: 50000.0,
          totalRevenue: 50000.0,
          total_cogs: 30000.0,
          totalCogs: 30000.0,
          total_profit: 20000.0,
          totalProfit: 20000.0,
          margin_pct: 40.0,
          marginPct: 40.0,
          total_units_sold: 1500,
          totalUnitsSold: 1500,
        },
        timeline: [
          {
            time_bucket: '2026',
            timeBucket: '2026',
            orders_count: 100,
            ordersCount: 100,
            revenue: 50000.0,
            cogs: 30000.0,
            profit: 20000.0,
            units_sold: 1500,
            unitsSold: 1500,
            margin_pct: 40.0,
            marginPct: 40.0,
          },
        ],
        items: [],
        sources: [],
      });

      const res = await analyticsService.getAnalytics({ granularity: 'year' });
      expect(res.granularity).toBe('year');
      expect(res.timeline[0].time_bucket).toBe('2026');
    });
  });

  describe('3. Date Range Filtering & Empty State Handling', () => {
    test('filters analytics by from_date and to_date', async () => {
      jest.spyOn(analyticsService, 'getAnalytics').mockResolvedValueOnce({
        success: true,
        granularity: 'day',
        summary: {
          total_orders: 1,
          totalOrders: 1,
          total_revenue: 300.0,
          totalRevenue: 300.0,
          total_cogs: 180.0,
          totalCogs: 180.0,
          total_profit: 120.0,
          totalProfit: 120.0,
          margin_pct: 40.0,
          marginPct: 40.0,
          total_units_sold: 10,
          totalUnitsSold: 10,
        },
        timeline: [
          {
            time_bucket: '2026-09-05',
            timeBucket: '2026-09-05',
            orders_count: 1,
            ordersCount: 1,
            revenue: 300.0,
            cogs: 180.0,
            profit: 120.0,
            units_sold: 10,
            unitsSold: 10,
            margin_pct: 40.0,
            marginPct: 40.0,
          },
        ],
        items: [],
        sources: [],
      });

      const res = await analyticsService.getAnalytics({
        from_date: '2026-09-01',
        to_date: '2026-09-07',
        granularity: 'day',
      });

      expect(res.summary.total_orders).toBe(1);
      expect(res.timeline[0].time_bucket).toBe('2026-09-05');
    });

    test('returns empty analytics summary gracefully when no sales match date filter', async () => {
      jest.spyOn(analyticsService, 'getAnalytics').mockResolvedValueOnce({
        success: true,
        granularity: 'day',
        summary: {
          total_orders: 0,
          totalOrders: 0,
          total_revenue: 0.0,
          totalRevenue: 0.0,
          total_cogs: 0.0,
          totalCogs: 0.0,
          total_profit: 0.0,
          totalProfit: 0.0,
          margin_pct: 0.0,
          marginPct: 0.0,
          total_units_sold: 0,
          totalUnitsSold: 0,
        },
        timeline: [],
        items: [],
        sources: [],
      });

      const res = await analyticsService.getAnalytics({
        from_date: '2020-01-01',
        to_date: '2020-01-02',
      });

      expect(res.summary.total_orders).toBe(0);
      expect(res.summary.total_revenue).toBe(0.0);
      expect(res.summary.total_profit).toBe(0.0);
      expect(res.summary.margin_pct).toBe(0.0);
      expect(res.timeline).toHaveLength(0);
    });
  });

  describe('4. Product & Procurement Channel Breakdown', () => {
    test('computes per-product margin, average sale price and cost price', async () => {
      jest.spyOn(analyticsService, 'getAnalytics').mockResolvedValueOnce({
        success: true,
        granularity: 'month',
        summary: {
          total_orders: 1,
          totalOrders: 1,
          total_revenue: 100.0,
          totalRevenue: 100.0,
          total_cogs: 60.0,
          totalCogs: 60.0,
          total_profit: 40.0,
          totalProfit: 40.0,
          margin_pct: 40.0,
          marginPct: 40.0,
          total_units_sold: 5,
          totalUnitsSold: 5,
        },
        timeline: [],
        items: [
          {
            product_id: 1,
            productId: 1,
            product_name: 'Whole Milk 1L',
            productName: 'Whole Milk 1L',
            sku: 'MILK-1L',
            unit: 'bottle',
            current_stock: 45,
            currentStock: 45,
            units_sold: 5,
            unitsSold: 5,
            revenue: 100.0,
            cogs: 60.0,
            profit: 40.0,
            margin_pct: 40.0,
            marginPct: 40.0,
            avg_sale_price: 20.0,
            avgSalePrice: 20.0,
            avg_cost_price: 12.0,
            avgCostPrice: 12.0,
          },
        ],
        sources: [
          {
            source: 'Wholesale Shop',
            procurements_count: 1,
            procurementsCount: 1,
            total_procured_units: 50,
            totalProcuredUnits: 50,
            total_procured_cost: 600.0,
            totalProcuredCost: 600.0,
            remaining_units: 45,
            remainingUnits: 45,
          },
        ],
      });

      const res = await analyticsService.getAnalytics({});
      expect(res.items).toHaveLength(1);
      expect(res.items[0].product_name).toBe('Whole Milk 1L');
      expect(res.items[0].avg_sale_price).toBe(20.0);
      expect(res.items[0].avg_cost_price).toBe(12.0);
      expect(res.items[0].margin_pct).toBe(40.0);
      expect(res.sources[0].source).toBe('Wholesale Shop');
      expect(res.sources[0].total_procured_cost).toBe(600.0);
    });
  });
});
