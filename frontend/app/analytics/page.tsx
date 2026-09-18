'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Calendar,
  IndianRupee,
  Package,
  Layers,
  Tag,
  WalletCards,
  RefreshCw,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface AnalyticsSummary {
  totalRevenue: number;
  totalCogs: number;
  grossProfit: number;
  totalCharges: number;
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

interface TimelineBucket {
  time_bucket: string;
  orders_count: number;
  revenue: number;
  cogs: number;
  gross_profit: number;
  charges: number;
  net_profit: number;
  profit: number;
  margin_pct: number;
  units_sold: number;
}

const EMPTY_SUMMARY: AnalyticsSummary = {
  totalRevenue: 0,
  totalCogs: 0,
  grossProfit: 0,
  totalCharges: 0,
  totalProfit: 0,
  marginPct: 0,
  orderCount: 0,
  unitsSold: 0,
};

function formatYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatBucket(bucket: string, gran: string): string {
  if (!bucket) return '';
  if (gran === 'month') {
    const [y, m] = bucket.split('-');
    if (y && m) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mIdx = parseInt(m, 10) - 1;
      return `${monthNames[mIdx] || m} ${y}`;
    }
  }
  if (gran === 'day') {
    const parts = bucket.split('-');
    if (parts.length === 3) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mIdx = parseInt(parts[1], 10) - 1;
      return `${parseInt(parts[2], 10)} ${monthNames[mIdx] || parts[1]} ${parts[0]}`;
    }
  }
  if (gran === 'week') {
    return bucket.replace('-W', ' W');
  }
  if (gran === 'year') {
    return `Year ${bucket}`;
  }
  return bucket;
}

export default function AnalyticsPage() {
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [activePreset, setActivePreset] = useState<'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_YEAR' | 'CUSTOM'>('ALL');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<AnalyticsSummary>(EMPTY_SUMMARY);
  const [timeline, setTimeline] = useState<TimelineBucket[]>([]);
  const [products, setProducts] = useState<ProductPerformance[]>([]);

  // Preset date calculator
  const handlePresetSelect = (preset: 'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_YEAR') => {
    setActivePreset(preset);
    setSelectedBucket(null);
    const now = new Date();

    if (preset === 'ALL') {
      setFromDate('');
      setToDate('');
    } else if (preset === 'TODAY') {
      const todayStr = formatYMD(now);
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === 'THIS_WEEK') {
      const day = now.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      setFromDate(formatYMD(monday));
      setToDate(formatYMD(sunday));
    } else if (preset === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setFromDate(formatYMD(firstDay));
      setToDate(formatYMD(lastDay));
    } else if (preset === 'THIS_YEAR') {
      setFromDate(`${now.getFullYear()}-01-01`);
      setToDate(`${now.getFullYear()}-12-31`);
    }
  };

  const handleCustomDateChange = (type: 'from' | 'to', val: string) => {
    setActivePreset('CUSTOM');
    setSelectedBucket(null);
    if (type === 'from') setFromDate(val);
    else setToDate(val);
  };

  // Fetch analytics whenever granularity, fromDate, toDate, or selectedBucket changes
  useEffect(() => {
    let queryFrom = fromDate;
    let queryTo = toDate;

    // If a specific bucket is selected from the timeline, scope to that bucket
    if (selectedBucket) {
      if (granularity === 'day') {
        queryFrom = selectedBucket;
        queryTo = selectedBucket;
      } else if (granularity === 'week') {
        const [yStr, wStr] = selectedBucket.split('-W');
        const year = parseInt(yStr, 10);
        const week = parseInt(wStr, 10);
        if (!isNaN(year) && !isNaN(week)) {
          const firstDay = new Date(year, 0, 1);
          const dow = firstDay.getDay();
          const daysToFirstMon = (8 - (dow === 0 ? 7 : dow)) % 7;
          if (week === 0) {
            queryFrom = `${year}-01-01`;
            queryTo = formatYMD(new Date(year, 0, Math.max(1, daysToFirstMon)));
          } else {
            const targetMonday = new Date(year, 0, 1 + daysToFirstMon + (week - 1) * 7);
            const targetSunday = new Date(year, 0, 1 + daysToFirstMon + (week - 1) * 7 + 6);
            queryFrom = formatYMD(targetMonday);
            queryTo = formatYMD(targetSunday);
          }
        }
      } else if (granularity === 'month') {
        const [y, m] = selectedBucket.split('-');
        const lastDay = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
        queryFrom = `${selectedBucket}-01`;
        queryTo = `${selectedBucket}-${String(lastDay).padStart(2, '0')}`;
      } else if (granularity === 'year') {
        queryFrom = `${selectedBucket}-01-01`;
        queryTo = `${selectedBucket}-12-31`;
      }
    }

    const params = new URLSearchParams();
    params.set('granularity', granularity);
    if (queryFrom) params.set('from_date', queryFrom);
    if (queryTo) params.set('to_date', queryTo);

    setIsLoading(true);
    fetch(`/api/analytics?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.summary) {
          const sum = data.summary;
          const rev = parseFloat(sum.total_revenue ?? sum.revenue ?? 0) || 0;
          const cogs = parseFloat(sum.total_cogs ?? sum.cogs ?? 0) || 0;
          const gross = parseFloat(sum.gross_profit ?? (rev - cogs)) || 0;
          const charges = parseFloat(sum.total_charges ?? sum.charges ?? 0) || 0;
          const net = parseFloat(sum.net_profit ?? sum.total_profit ?? (gross - charges)) || 0;

          setSummary({
            totalRevenue: rev,
            totalCogs: cogs,
            grossProfit: gross,
            totalCharges: charges,
            totalProfit: net,
            marginPct: parseFloat(sum.margin_pct ?? 0) || 0,
            orderCount: parseInt(sum.order_count ?? sum.total_orders ?? 0, 10) || 0,
            unitsSold: parseFloat(sum.units_sold ?? sum.total_units_sold ?? 0) || 0,
          });
        }

        if (data && Array.isArray(data.timeline)) {
          setTimeline(
            data.timeline.map((t: any) => ({
              time_bucket: t.time_bucket,
              orders_count: parseInt(t.orders_count ?? 0, 10) || 0,
              revenue: parseFloat(t.revenue ?? 0) || 0,
              cogs: parseFloat(t.cogs ?? 0) || 0,
              gross_profit: parseFloat(t.gross_profit != null ? t.gross_profit : ((parseFloat(t.revenue) || 0) - (parseFloat(t.cogs) || 0))) || 0,
              charges: parseFloat(t.charges ?? 0) || 0,
              net_profit: parseFloat(t.net_profit ?? t.profit ?? 0) || 0,
              profit: parseFloat(t.profit ?? t.net_profit ?? 0) || 0,
              margin_pct: parseFloat(t.margin_pct ?? 0) || 0,
              units_sold: parseFloat(t.units_sold ?? 0) || 0,
            }))
          );
        }

        const prodList = data?.products || data?.items_breakdown;
        if (Array.isArray(prodList)) {
          setProducts(
            prodList.map((p: any) => ({
              name: p.name || p.product_name || 'Product',
              sku: p.sku || '',
              unitsSold: parseFloat(p.units_sold ?? p.total_units_sold ?? 0) || 0,
              revenue: parseFloat(p.revenue ?? p.total_sale_price ?? 0) || 0,
              cogs: parseFloat(p.cogs ?? p.total_cost ?? 0) || 0,
              profit: parseFloat(p.profit ?? 0) || 0,
              marginPct: parseFloat(p.margin_pct ?? 0) || 0,
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLoading(false);
      });
  }, [granularity, fromDate, toDate, selectedBucket]);

  const handleBucketClick = (bucket: string) => {
    if (selectedBucket === bucket) {
      setSelectedBucket(null);
    } else {
      setSelectedBucket(bucket);
    }
  };

  const activeScopeLabel = useMemo(() => {
    if (selectedBucket) {
      return `Filtered Bucket: ${formatBucket(selectedBucket, granularity)}`;
    }
    if (activePreset === 'TODAY') return 'Today';
    if (activePreset === 'THIS_WEEK') return 'This Week';
    if (activePreset === 'THIS_MONTH') return 'This Month';
    if (activePreset === 'THIS_YEAR') return 'This Year';
    if (fromDate || toDate) {
      return `${fromDate || 'Start'} to ${toDate || 'Present'}`;
    }
    return 'All Time History';
  }, [selectedBucket, activePreset, fromDate, toDate, granularity]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Granularity Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-medium text-xs uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Financial Reporting Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            <span>Profit & Sales Analytics</span>
            {isLoading && (
              <RefreshCw className="w-4 h-4 animate-spin text-primary shrink-0" />
            )}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Day-to-year granular financial rollups computed with zero join row multiplication.
          </p>
        </div>

        {/* Granularity Switcher */}
        <div className="flex items-center gap-1 bg-card p-1.5 rounded-2xl border border-border shadow-xs shrink-0">
          {(['day', 'week', 'month', 'year'] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => {
                setGranularity(g);
                setSelectedBucket(null);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                granularity === g
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Filter & Period Controls Bar */}
      <div className="p-3.5 sm:p-4 rounded-3xl bg-card border border-border shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Quick Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mr-1 shrink-0">
            <Clock className="w-3.5 h-3.5" />
            <span>Period:</span>
          </span>
          {(['ALL', 'THIS_YEAR', 'THIS_MONTH', 'THIS_WEEK', 'TODAY'] as const).map((preset) => {
            const labels = {
              ALL: 'All Time',
              THIS_YEAR: 'This Year',
              THIS_MONTH: 'This Month',
              THIS_WEEK: 'This Week',
              TODAY: 'Today',
            };
            const isSelected = activePreset === preset && !selectedBucket;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => handlePresetSelect(preset)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-primary/10 text-primary border border-primary/20 shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {labels[preset]}
              </button>
            );
          })}
        </div>

        {/* Date Inputs & Active Scope Badge */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Custom Date Inputs */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => handleCustomDateChange('from', e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-border bg-background text-xs font-medium text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              aria-label="From Date"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => handleCustomDateChange('to', e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-border bg-background text-xs font-medium text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              aria-label="To Date"
            />
          </div>

          {/* Active Filter Scope / Reset Pill */}
          {(fromDate || toDate || selectedBucket || activePreset !== 'ALL') && (
            <button
              type="button"
              onClick={() => handlePresetSelect('ALL')}
              className="px-2.5 py-1.5 rounded-xl bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Reset to All Time"
            >
              <span>Reset</span>
              <span className="text-[10px]">✕</span>
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/5 border border-primary/15 text-primary text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate max-w-[180px] font-semibold">{activeScopeLabel}</span>
          </div>
        </div>
      </div>

      {/* KPI Cards (Responsive grid with fluid non-overflowing typography) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3.5 sm:gap-4">
        {/* Total Revenue */}
        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-card border border-border shadow-xs min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider truncate">Total Revenue</span>
            <IndianRupee className="w-4 h-4 text-primary shrink-0" />
          </div>
          <div
            className="text-lg sm:text-xl xl:text-[1.25rem] 2xl:text-2xl font-black text-foreground font-mono tracking-tight truncate tabular-nums"
            title={`₹${summary.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          >
            ₹{summary.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">Gross sales turnover</p>
        </div>

        {/* Cost of Goods */}
        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-card border border-border shadow-xs min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider truncate">Cost of Goods</span>
            <Layers className="w-4 h-4 text-amber-500 shrink-0" />
          </div>
          <div
            className="text-lg sm:text-xl xl:text-[1.25rem] 2xl:text-2xl font-black text-foreground font-mono tracking-tight truncate tabular-nums"
            title={`₹${summary.totalCogs.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          >
            ₹{summary.totalCogs.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">Acquisition lot costs</p>
        </div>

        {/* Gross Profit */}
        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-card border border-border shadow-xs min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider truncate">Gross Profit</span>
            <TrendingUp className="w-4 h-4 text-blue-500 shrink-0" />
          </div>
          <div
            className="text-lg sm:text-xl xl:text-[1.25rem] 2xl:text-2xl font-black text-foreground font-mono tracking-tight truncate tabular-nums"
            title={`₹${summary.grossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          >
            ₹{summary.grossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">Revenue − COGS</p>
        </div>

        {/* Operating Charges */}
        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-card border border-border shadow-xs min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider truncate">Operating Charges</span>
            <WalletCards className="w-4 h-4 text-amber-500 shrink-0" />
          </div>
          <div
            className="text-lg sm:text-xl xl:text-[1.25rem] 2xl:text-2xl font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight truncate tabular-nums"
            title={`-₹${summary.totalCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          >
            -₹{summary.totalCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">Deducted expenses</p>
        </div>

        {/* Net Store Profit */}
        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-card border border-border shadow-xs min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider truncate">Net Store Profit</span>
            <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
          </div>
          <div
            className={`text-lg sm:text-xl xl:text-[1.25rem] 2xl:text-2xl font-black font-mono tracking-tight truncate tabular-nums flex items-baseline ${
              summary.totalProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
            title={`${summary.totalProfit >= 0 ? '+' : ''}₹${summary.totalProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          >
            <span className="mr-0.5">{summary.totalProfit >= 0 ? '+' : ''}</span>
            <span>₹{summary.totalProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">True net profitability</p>
        </div>

        {/* Net Margin */}
        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-card border border-border shadow-xs min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider truncate">Net Margin</span>
            <Tag className="w-4 h-4 text-primary shrink-0" />
          </div>
          <div className="text-lg sm:text-xl xl:text-[1.25rem] 2xl:text-2xl font-black text-primary font-mono tracking-tight truncate tabular-nums">
            {summary.marginPct.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">Across {summary.unitsSold} units</p>
        </div>
      </div>

      {/* Financial Timeline & Performance Ledger */}
      <div className="rounded-3xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <span>Financial Timeline & Performance Ledger</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-primary/15 text-primary">
                  {granularity}
                </span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Click any row to inspect & scope the entire dashboard to that specific time bucket.
              </p>
            </div>
          </div>

          {selectedBucket && (
            <button
              type="button"
              onClick={() => setSelectedBucket(null)}
              className="px-3 py-1.5 rounded-xl border border-primary/30 bg-primary/10 text-primary text-xs font-semibold flex items-center gap-1.5 hover:bg-primary/20 transition-colors cursor-pointer"
            >
              <span>Filtered: {formatBucket(selectedBucket, granularity)}</span>
              <span className="font-bold">✕ Reset</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/30 border-b border-border text-xs uppercase text-muted-foreground font-semibold tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Time Period</th>
                <th className="px-4 py-3.5 text-center">Orders</th>
                <th className="px-4 py-3.5 text-center">Units Sold</th>
                <th className="px-4 py-3.5 text-right">Revenue</th>
                <th className="px-4 py-3.5 text-right">COGS</th>
                <th className="px-4 py-3.5 text-right">Charges</th>
                <th className="px-4 py-3.5 text-right">Net Profit</th>
                <th className="px-6 py-3.5 text-right">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {timeline.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-sm text-muted-foreground">
                    No transactions or charges found for the selected timeframe.
                  </td>
                </tr>
              ) : (
                timeline.map((bucket) => {
                  const isSelected = selectedBucket === bucket.time_bucket;
                  return (
                    <tr
                      key={bucket.time_bucket}
                      onClick={() => handleBucketClick(bucket.time_bucket)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-primary/10 hover:bg-primary/15 font-medium'
                          : 'hover:bg-muted/20'
                      }`}
                    >
                      <td className="px-6 py-3.5 font-semibold text-foreground whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={isSelected ? 'text-primary font-bold' : ''}>
                            {formatBucket(bucket.time_bucket, granularity)}
                          </span>
                          {isSelected && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary text-primary-foreground">
                              ACTIVE
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold text-foreground">
                        {bucket.orders_count}
                      </td>
                      <td className="px-4 py-3.5 text-center text-muted-foreground">
                        {bucket.units_sold}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-semibold text-foreground">
                        ₹{bucket.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-muted-foreground">
                        ₹{bucket.cogs.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-amber-600 dark:text-amber-400">
                        {bucket.charges > 0 ? `-₹${bucket.charges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹0.00'}
                      </td>
                      <td
                        className={`px-4 py-3.5 text-right font-mono font-bold ${
                          bucket.net_profit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {bucket.net_profit >= 0 ? '+' : ''}₹{bucket.net_profit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono font-bold text-primary">
                        {bucket.margin_pct.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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
            Scoped to {activeScopeLabel}
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
                <th className="px-4 py-3.5 text-right">Gross Profit</th>
                <th className="px-6 py-3.5 text-right">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-muted-foreground">
                    No product sales recorded for this period.
                  </td>
                </tr>
              ) : (
                products.map((p, idx) => (
                  <tr key={idx} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-foreground">{p.name}</div>
                      <span className="font-mono text-xs text-muted-foreground">{p.sku}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold">{p.unitsSold}</td>
                    <td className="px-4 py-3.5 text-right font-mono font-semibold">
                      ₹{p.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-muted-foreground">
                      ₹{p.cogs.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      +₹{p.profit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono font-bold text-primary">
                      {p.marginPct.toFixed(1)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
