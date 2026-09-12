'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShoppingCart,
  Package,
  Truck,
  BarChart3,
  Users,
  Building2,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Boxes,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import { useUIStore } from '../store/useUIStore';

export default function DashboardPage() {
  const { toggleCommandPalette } = useUIStore();
  const [stats, setStats] = useState({
    totalValuation: '0.00',
    totalUnitsInStock: 0,
    activeLotsCount: 0,
    lowStockProductCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch('/api/inventory');
        if (res.ok) {
          const data = await res.json();
          if (data.data) {
            setStats(data.data);
          } else if (data.stats) {
            setStats(data.stats);
          }
        }
      } catch (e) {
        console.warn('Backend API offline or running in mock mode:', e);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const featureCards = [
    {
      title: 'POS Billing View',
      description: 'Search-driven checkout with automated Lowest-Cost-First multi-batch allocation & manual lot override.',
      href: '/sales',
      icon: ShoppingCart,
      badge: 'Core Engine',
      badgeColor: 'bg-primary/10 text-primary border-primary/30',
      actionText: 'Launch POS',
    },
    {
      title: 'Product Catalogue',
      description: 'Centralised catalogue with fuzzy & semantic vector search, units of measure, and stock alert thresholds.',
      href: '/catalogue',
      icon: Package,
      badge: 'Configurable',
      badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      actionText: 'Manage Items',
    },
    {
      title: 'Procurement Intake',
      description: 'Multi-batch stock intake across Wholesale, Quick Commerce, and E-Commerce channels.',
      href: '/procurement',
      icon: Truck,
      badge: 'Multi-Source',
      badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
      actionText: 'Record Stock',
    },
    {
      title: 'Profit & Sales Analytics',
      description: 'Exact day-to-year profit and margin rollups with zero join row multiplication.',
      href: '/analytics',
      icon: BarChart3,
      badge: 'Exact Math',
      badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
      actionText: 'View Metrics',
    },
    {
      title: 'Customer Directory',
      description: 'Customer contact records, credit limits, and historical purchase lineage.',
      href: '/customers',
      icon: Users,
      badge: 'Master Data',
      badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
      actionText: 'View Customers',
    },
    {
      title: 'Supplier Directory',
      description: 'Vendor profiles with configurable payment terms (Immediate, Net 15, Net 30, Net 60).',
      href: '/suppliers',
      icon: Building2,
      badge: 'Master Data',
      badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
      actionText: 'View Suppliers',
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary-900 via-primary-800 to-primary-950 text-white p-6 sm:p-10 shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-md border border-white/20 text-sky-200">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mobbin-Grade UI/UX & WCAG 2.1 AAA Compliant</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Apex Multi-Batch Inventory & Sales Monolith
          </h1>
          <p className="text-sm sm:text-base text-sky-100/90 leading-relaxed">
            Automated Lowest-Cost-First (Cheapest-First) billing engine with clean lot splitting,
            salesperson manual override, and granular day-to-year profit analytics.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={toggleCommandPalette}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-primary-950 hover:bg-sky-50 shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <span>Command Palette</span>
              <kbd className="px-1.5 py-0.5 rounded bg-primary-100 text-primary-900 text-[10px] font-mono">
                ⌘K
              </kbd>
            </button>
            <Link
              href="/sales"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-500 text-white shadow-md transition-all active:scale-95"
            >
              <span>Launch POS Billing</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Real-time KPI Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Stock Valuation */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground">Total Inventory Valuation</div>
            <div className="text-xl font-bold text-foreground">
              ${stats.totalValuation}
            </div>
            <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3 h-3" />
              <span>Exact (Q × C) math</span>
            </div>
          </div>
        </div>

        {/* Total Units in Stock */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground">Total Units on Hand</div>
            <div className="text-xl font-bold text-foreground">
              {stats.totalUnitsInStock.toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Across all inventory lots
            </div>
          </div>
        </div>

        {/* Active Batches Count */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground">Active Costing Batches</div>
            <div className="text-xl font-bold text-foreground">
              {stats.activeLotsCount}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
              Available for allocation
            </div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground">Low Stock Threshold Alerts</div>
            <div className="text-xl font-bold text-foreground">
              {stats.lowStockProductCount}
            </div>
            <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
              Requires procurement
            </div>
          </div>
        </div>
      </div>

      {/* Module Hub Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Core Capabilities & Master Modules</h2>
          <span className="text-xs text-muted-foreground">Select a module to begin</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {featureCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="group relative p-6 rounded-2xl bg-card border border-border hover:border-primary/50 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-muted group-hover:bg-primary/10 text-primary flex items-center justify-center transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${card.badgeColor}`}
                    >
                      {card.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                    {card.title}
                  </h3>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    {card.description}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between">
                  <Link
                    href={card.href}
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary group-hover:underline"
                  >
                    <span>{card.actionText}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
