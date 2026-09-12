'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Calendar,
  IndianRupee,
  Package,
  Layers,
  Store,
  Truck,
  Globe,
  Tag,
  ArrowUpRight,
  Filter,
} from 'lucide-react';

interface AnalyticsSummary {
  totalRevenue: number;
  totalCogs: number;
  totalProfit: number;
  marginPct: number;
  orderCount: number;
  unitsSold: number;
}

interface ProductPerformance {
  name: string;
  sku: string;
  unitsSold: number;
  revenue: number;
  cogs: number;
  profit: number;
  marginPct: number;
}

const SEED_SUMMARY: AnalyticsSummary = {
  totalRevenue: 2840.5,
  totalCogs: 1820.0,
  totalProfit: 1020.5,
  marginPct: 35.9,
  orderCount: 24,
  unitsSold: 320,
};

const SEED_PRODUCTS: ProductPerformance[] = [
  {
    name: 'Royal Basmati Rice 5kg',
    sku: 'RICE-BAS-5KG',
    unitsSold: 140,
    revenue: 1400.0,
    cogs: 880.0,
    profit: 520.0,
    marginPct: 37.1,
  },
  {
    name: 'Aashirvaad Whole Wheat Atta 10kg',
    sku: 'WHEAT-ATTA-10KG',
    unitsSold: 95,
    revenue: 760.0,
    cogs: 522.5,
    profit: 237.5,
    marginPct: 31.25,
  },
  {
    name: 'Pure Mustard Oil Cold Pressed 1L',
    sku: 'OIL-MUST-1L',
    unitsSold: 45,
    revenue: 450.0,
    cogs: 279.0,
    profit: 171.0,
    marginPct: 38.0,
  },
  {
    name: 'Organic Red Lentils 1kg',
    sku: 'DAL-MASOOR-1KG',
    unitsSold: 40,
    revenue: 230.5,
    cogs: 138.5,
    profit: 92.0,
    marginPct: 39.9,
  },
];

const EMPTY_SUMMARY: AnalyticsSummary = {
  totalRevenue: 0,
  totalCogs: 0,
  totalProfit: 0,
  marginPct: 0,
  orderCount: 0,
  unitsSold: 0,
};

export default function AnalyticsPage() {
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [summary, setSummary] = useState<AnalyticsSummary>(EMPTY_SUMMARY);
  const [products, setProducts] = useState<ProductPerformance[]>([]);

  useEffect(() => {
    fetch(`/api/analytics?granularity=${granularity}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.summary) {
          setSummary({
            totalRevenue: parseFloat(data.summary.total_revenue || '0'),
            totalCogs: parseFloat(data.summary.total_cogs || '0'),
            totalProfit: parseFloat(data.summary.total_profit || '0'),
            marginPct: parseFloat(data.summary.margin_pct || '0'),
            orderCount: data.summary.order_count || 0,
            unitsSold: data.summary.units_sold || 0,
          });
        }
        if (data && Array.isArray(data.products)) {
          setProducts(
            data.products.map((p: any) => ({
              name: p.name,
              sku: p.sku,
              unitsSold: parseFloat(p.units_sold || '0'),
              revenue: parseFloat(p.revenue || '0'),
              cogs: parseFloat(p.cogs || '0'),
              profit: parseFloat(p.profit || '0'),
              marginPct: parseFloat(p.margin_pct || '0'),
            }))
          );
        }
      })
      .catch(() => {});
  }, [granularity]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-medium text-xs uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Financial Reporting Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Profit & Sales Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Day-to-year granular financial rollups computed with zero join row multiplication.
          </p>
        </div>

        {/* Granularity Switcher */}
        <div className="flex items-center gap-1 bg-card p-1.5 rounded-2xl border border-border shadow-xs">
          {(['day', 'week', 'month', 'year'] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGranularity(g)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                granularity === g
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Revenue</span>
            <IndianRupee className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground font-mono">
            ₹{summary.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Gross sales turnover</p>
        </div>

        <div className="p-5 rounded-3xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Cost of Goods (COGS)</span>
            <Layers className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-foreground font-mono">
            ₹{summary.totalCogs.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Acquisition lot costs</p>
        </div>

        <div className="p-5 rounded-3xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Net Store Profit</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            +₹{summary.totalProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground mt-1">True net profitability</p>
        </div>

        <div className="p-5 rounded-3xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Gross Margin</span>
            <Tag className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-primary font-mono">
            {summary.marginPct.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground mt-1">Across {summary.unitsSold} units billed</p>
        </div>
      </div>

      {/* Product Profitability Breakdown Table */}
      <div className="rounded-3xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/40 flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            <span>Catalogue Item Profitability</span>
          </h2>
          <span className="text-xs font-medium text-muted-foreground">
            Filtered by {granularity.toUpperCase()} rollup
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/30 border-b border-border text-xs uppercase text-muted-foreground font-semibold tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Product Title</th>
                <th className="px-4 py-3.5 text-center">Units Sold</th>
                <th className="px-4 py-3.5 text-right">Revenue</th>
                <th className="px-4 py-3.5 text-right">COGS</th>
                <th className="px-4 py-3.5 text-right">Net Profit</th>
                <th className="px-6 py-3.5 text-right">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((p, idx) => (
                <tr key={idx} className="hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-3.5">
                    <div className="font-semibold text-foreground">{p.name}</div>
                    <span className="font-mono text-xs text-muted-foreground">{p.sku}</span>
                  </td>
                  <td className="px-4 py-3.5 text-center font-bold">{p.unitsSold}</td>
                  <td className="px-4 py-3.5 text-right font-mono font-semibold">
                    ₹{p.revenue.toFixed(2)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-muted-foreground">
                    ₹{p.cogs.toFixed(2)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    +₹{p.profit.toFixed(2)}
                  </td>
                  <td className="px-6 py-3.5 text-right font-mono font-bold text-primary">
                    {p.marginPct.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
