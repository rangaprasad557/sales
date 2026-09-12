import { Injectable } from '@nestjs/common';
import { eq, and, gte, lte, desc, asc, inArray } from 'drizzle-orm';
import { db } from '../../db/connection';
import {
  sales,
  saleItems,
  products,
  inventoryLots,
} from '../../db/schema';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';

export interface AnalyticsSummary {
  total_orders: number;
  totalOrders: number;
  total_revenue: number;
  totalRevenue: number;
  total_cogs: number;
  totalCogs: number;
  total_profit: number;
  totalProfit: number;
  margin_pct: number;
  marginPct: number;
  total_units_sold: number;
  totalUnitsSold: number;
}

export interface TimelineBucket {
  time_bucket: string;
  timeBucket: string;
  orders_count: number;
  ordersCount: number;
  revenue: number;
  cogs: number;
  profit: number;
  units_sold: number;
  unitsSold: number;
  margin_pct: number;
  marginPct: number;
}

export interface ProductAnalyticsItem {
  product_id: number;
  productId: number;
  product_name: string;
  productName: string;
  sku: string;
  unit: string;
  current_stock: number;
  currentStock: number;
  units_sold: number;
  unitsSold: number;
  revenue: number;
  cogs: number;
  profit: number;
  margin_pct: number;
  marginPct: number;
  avg_sale_price: number;
  avgSalePrice: number;
  avg_cost_price: number;
  avgCostPrice: number;
}

export interface SourceAnalyticsItem {
  source: string;
  procurements_count: number;
  procurementsCount: number;
  total_procured_units: number;
  totalProcuredUnits: number;
  total_procured_cost: number;
  totalProcuredCost: number;
  remaining_units: number;
  remainingUnits: number;
}

@Injectable()
export class AnalyticsService {
  /**
   * Calculate ISO 8601 week string: YYYY-Www
   */
  private getIsoWeek(date: Date): string {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  }

  /**
   * Determine time bucket key based on granularity
   */
  private getTimeBucketKey(date: Date, granularity: string): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    switch (granularity.toLowerCase()) {
      case 'day':
        return `${year}-${month}-${day}`;
      case 'week':
        return this.getIsoWeek(date);
      case 'year':
        return `${year}`;
      case 'month':
      default:
        return `${year}-${month}`;
    }
  }

  async getAnalytics(query: AnalyticsQueryDto) {
    const granularity = (query.granularity || 'month').toLowerCase();
    const fromDateStr = query.from_date || query.fromDate;
    const toDateStr = query.to_date || query.toDate;

    // 1. Fetch matching sales with optional date filtering
    let salesQuery = db.select().from(sales);
    const conditions: any[] = [];

    if (fromDateStr) {
      conditions.push(gte(sales.saleDate, new Date(fromDateStr)));
    }
    if (toDateStr) {
      conditions.push(lte(sales.saleDate, new Date(toDateStr + 'T23:59:59.999Z')));
    }

    const matchingSales = conditions.length > 0
      ? await db.select().from(sales).where(and(...conditions)).orderBy(asc(sales.saleDate))
      : await db.select().from(sales).orderBy(asc(sales.saleDate));

    const saleIds = matchingSales.map((s) => s.id);

    // 2. Fetch sale items belonging to the matching sales
    let matchingSaleItems: any[] = [];
    if (saleIds.length > 0) {
      matchingSaleItems = await db
        .select()
        .from(saleItems)
        .where(inArray(saleItems.saleId, saleIds));
    }

    // Map sale items by saleId
    const itemsBySaleId = new Map<number, any[]>();
    for (const item of matchingSaleItems) {
      const list = itemsBySaleId.get(item.saleId) || [];
      list.push(item);
      itemsBySaleId.set(item.saleId, list);
    }

    // 3. Compute Summary KPIs (Exact sums without row multiplication)
    let totalRevenue = 0;
    let totalCogs = 0;
    let totalProfit = 0;
    let totalUnitsSold = 0;

    for (const item of matchingSaleItems) {
      totalRevenue += Number(item.subtotalRevenue);
      totalCogs += Number(item.subtotalCogs);
      totalProfit += Number(item.subtotalProfit);
      totalUnitsSold += item.quantity;
    }

    const marginPct = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    const summary: AnalyticsSummary = {
      total_orders: matchingSales.length,
      totalOrders: matchingSales.length,
      total_revenue: Number(totalRevenue.toFixed(2)),
      totalRevenue: Number(totalRevenue.toFixed(2)),
      total_cogs: Number(totalCogs.toFixed(2)),
      totalCogs: Number(totalCogs.toFixed(2)),
      total_profit: Number(totalProfit.toFixed(2)),
      totalProfit: Number(totalProfit.toFixed(2)),
      margin_pct: Number(marginPct.toFixed(1)),
      marginPct: Number(marginPct.toFixed(1)),
      total_units_sold: totalUnitsSold,
      totalUnitsSold,
    };

    // 4. Compute Timeline Aggregations
    const bucketMap = new Map<
      string,
      {
        saleIds: Set<number>;
        revenue: number;
        cogs: number;
        profit: number;
        units: number;
      }
    >();

    for (const sale of matchingSales) {
      const bucketKey = this.getTimeBucketKey(new Date(sale.saleDate), granularity);
      const existing = bucketMap.get(bucketKey) || {
        saleIds: new Set<number>(),
        revenue: 0,
        cogs: 0,
        profit: 0,
        units: 0,
      };

      existing.saleIds.add(sale.id);

      const items = itemsBySaleId.get(sale.id) || [];
      for (const item of items) {
        existing.revenue += Number(item.subtotalRevenue);
        existing.cogs += Number(item.subtotalCogs);
        existing.profit += Number(item.subtotalProfit);
        existing.units += item.quantity;
      }

      bucketMap.set(bucketKey, existing);
    }

    const timeline: TimelineBucket[] = Array.from(bucketMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([bucketKey, data]) => {
        const bMargin = data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0;
        return {
          time_bucket: bucketKey,
          timeBucket: bucketKey,
          orders_count: data.saleIds.size,
          ordersCount: data.saleIds.size,
          revenue: Number(data.revenue.toFixed(2)),
          cogs: Number(data.cogs.toFixed(2)),
          profit: Number(data.profit.toFixed(2)),
          units_sold: data.units,
          unitsSold: data.units,
          margin_pct: Number(bMargin.toFixed(1)),
          marginPct: Number(bMargin.toFixed(1)),
        };
      });

    // 5. Product Level Breakdown (filtered by matching sales items)
    const allProducts = await db.select().from(products);
    const allLots = await db.select().from(inventoryLots);

    // Map active stock per product
    const stockMap = new Map<number, number>();
    for (const lot of allLots) {
      if (lot.status === 'ACTIVE' && lot.remainingQty > 0) {
        stockMap.set(lot.productId, (stockMap.get(lot.productId) || 0) + lot.remainingQty);
      }
    }

    // Map performance metrics per product
    const productPerfMap = new Map<
      number,
      { units: number; revenue: number; cogs: number; profit: number }
    >();

    for (const item of matchingSaleItems) {
      const perf = productPerfMap.get(item.productId) || {
        units: 0,
        revenue: 0,
        cogs: 0,
        profit: 0,
      };
      perf.units += item.quantity;
      perf.revenue += Number(item.subtotalRevenue);
      perf.cogs += Number(item.subtotalCogs);
      perf.profit += Number(item.subtotalProfit);
      productPerfMap.set(item.productId, perf);
    }

    const items: ProductAnalyticsItem[] = allProducts.map((p) => {
      const perf = productPerfMap.get(p.id) || { units: 0, revenue: 0, cogs: 0, profit: 0 };
      const pMargin = perf.revenue > 0 ? (perf.profit / perf.revenue) * 100 : 0;
      const avgSale = perf.units > 0 ? perf.revenue / perf.units : 0;
      const avgCost = perf.units > 0 ? perf.cogs / perf.units : 0;
      const currentStock = stockMap.get(p.id) || 0;

      return {
        product_id: p.id,
        productId: p.id,
        product_name: p.name,
        productName: p.name,
        sku: p.sku,
        unit: p.unit,
        current_stock: currentStock,
        currentStock,
        units_sold: perf.units,
        unitsSold: perf.units,
        revenue: Number(perf.revenue.toFixed(2)),
        cogs: Number(perf.cogs.toFixed(2)),
        profit: Number(perf.profit.toFixed(2)),
        margin_pct: Number(pMargin.toFixed(1)),
        marginPct: Number(pMargin.toFixed(1)),
        avg_sale_price: Number(avgSale.toFixed(2)),
        avgSalePrice: Number(avgSale.toFixed(2)),
        avg_cost_price: Number(avgCost.toFixed(2)),
        avgCostPrice: Number(avgCost.toFixed(2)),
      };
    }).sort((a, b) => b.profit - a.profit || b.units_sold - a.units_sold);

    // 6. Procurement Channel Source Breakdown
    const sourceMap = new Map<
      string,
      {
        procurementIds: Set<number>;
        totalUnits: number;
        totalCost: number;
        remainingUnits: number;
      }
    >();

    for (const lot of allLots) {
      const s = lot.source || 'Other';
      const existing = sourceMap.get(s) || {
        procurementIds: new Set<number>(),
        totalUnits: 0,
        totalCost: 0,
        remainingUnits: 0,
      };

      if (lot.procurementId) {
        existing.procurementIds.add(lot.procurementId);
      }
      existing.totalUnits += lot.initialQty;
      existing.totalCost += lot.initialQty * Number(lot.unitCost);
      existing.remainingUnits += lot.remainingQty;
      sourceMap.set(s, existing);
    }

    const sources: SourceAnalyticsItem[] = Array.from(sourceMap.entries()).map(
      ([source, data]) => ({
        source,
        procurements_count: data.procurementIds.size,
        procurementsCount: data.procurementIds.size,
        total_procured_units: data.totalUnits,
        totalProcuredUnits: data.totalUnits,
        total_procured_cost: Number(data.totalCost.toFixed(2)),
        totalProcuredCost: Number(data.totalCost.toFixed(2)),
        remaining_units: data.remainingUnits,
        remainingUnits: data.remainingUnits,
      }),
    ).sort((a, b) => b.total_procured_cost - a.total_procured_cost);

    return {
      success: true,
      granularity,
      summary,
      timeline,
      items,
      sources,
    };
  }
}
