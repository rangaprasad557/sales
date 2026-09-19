'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Receipt,
  Search,
  IndianRupee,
  Layers,
  TrendingUp,
  Users,
  User,
  RefreshCw,
  Eye,
  ShoppingCart,
  Clock,
  ArrowUpDown,
  Filter,
  Calendar,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  RotateCcw,
} from 'lucide-react';
import { Drawer } from '../../components/Drawer';
import { InvoiceReceiptModal, CompletedSaleRecord } from '../../components/InvoiceReceiptModal';
import { useUIStore } from '../../store/useUIStore';

export interface OrderListItem {
  id: number;
  invoice_no: string;
  customer_id: number | null;
  customer_name: string | null;
  sale_date: string;
  sold_by?: string;
  total_amount: number;
  total_cogs: number;
  total_profit: number;
  notes: string;
  created_at: string;
  items_count: number;
  total_qty: number;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [customers, setCustomers] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('ALL');
  const [selectedSoldBy, setSelectedSoldBy] = useState<string>('ALL');
  const [datePreset, setDatePreset] = useState<
    'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST_7' | 'LAST_30' | 'THIS_MONTH' | 'CUSTOM'
  >('ALL');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [sortField, setSortField] = useState<'date' | 'amount' | 'profit'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedSaleRecord, setSelectedSaleRecord] = useState<CompletedSaleRecord | null>(null);
  const [isReceiptModalOpen, setReceiptModalOpen] = useState(false);
  const [fetchingDetailId, setFetchingDetailId] = useState<number | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<OrderListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { addNotification } = useUIStore();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sales');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.sales)) {
          const parsed = data.sales.map((s: any) => ({
            ...s,
            total_amount: parseFloat(s.total_amount) || 0,
            total_cogs: parseFloat(s.total_cogs) || 0,
            total_profit: parseFloat(s.total_profit) || 0,
          }));
          setOrders(parsed);
        } else {
          setOrders([]);
        }
      } else {
        addNotification('error', 'Failed to load past orders from server.');
      }
    } catch (err) {
      addNotification('error', 'Network error connecting to orders endpoint.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.customers)) {
          setCustomers(data.customers);
        }
      }
    } catch {
      // Non-blocking fallback
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchCustomers();
  }, []);

  const handleViewReceipt = async (order: OrderListItem) => {
    setFetchingDetailId(order.id);
    try {
      const res = await fetch(`/api/sales/${order.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.sale) {
          const s = data.sale;
          const modalRecord: CompletedSaleRecord = {
            invoiceNo: s.invoice_no,
            customerName: s.customer_name || 'Walk-in Customer',
            saleDate: s.sale_date || s.created_at?.split(' ')[0] || '',
            soldBy: s.sold_by || 'Store Staff',
            totalAmount: s.total_amount,
            totalCogs: s.total_cogs,
            totalProfit: s.total_profit,
            items: (s.items || []).map((it: any) => ({
              name: it.product_name || 'Item',
              sku: it.sku || 'SKU',
              qty: it.qty,
              unit: it.unit || 'pcs',
              unitPrice: it.unit_sale_price,
              totalPrice: it.total_sale_price,
              totalCost: it.total_cost,
              profit: it.profit,
              lotsUsed: (it.allocated_lots || []).map((lot: any) => ({
                batchCode: lot.batch_code,
                qty: lot.qty,
                unitCost: lot.unit_cost,
              })),
            })),
          };
          setSelectedSaleRecord(modalRecord);
          setReceiptModalOpen(true);
        } else {
          addNotification('error', 'Could not retrieve full order details.');
        }
      } else {
        addNotification('error', 'Failed to fetch order details.');
      }
    } catch (e) {
      addNotification('error', 'Network error fetching order details.');
    } finally {
      setFetchingDetailId(null);
    }
  };

  const [isEditDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({
    customerId: '',
    saleDate: '',
    soldBy: '',
    notes: '',
    items: [] as Array<{
      productId: number;
      productName: string;
      sku: string;
      qty: string;
      unitPrice: string;
    }>,
  });
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const handleEditOrder = async (order: OrderListItem) => {
    setFetchingDetailId(order.id);
    try {
      if (customers.length === 0) {
        const cRes = await fetch('/api/customers');
        if (cRes.ok) {
          const cData = await cRes.json();
          setCustomers(cData.customers || []);
        }
      }

      const res = await fetch(`/api/sales/${order.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.sale) {
          const s = data.sale;
          setEditingOrder(s);
          setEditFormData({
            customerId: s.customer_id ? String(s.customer_id) : '',
            saleDate: s.sale_date || s.created_at?.split(' ')[0] || new Date().toISOString().slice(0, 10),
            soldBy: s.sold_by || 'Store Staff',
            notes: s.notes || '',
            items: (s.items || []).map((it: any) => ({
              productId: it.product_id,
              productName: it.product_name || 'Product',
              sku: it.sku || '',
              qty: String(it.qty),
              unitPrice: String(it.unit_sale_price),
            })),
          });
          setEditDrawerOpen(true);
        } else {
          addNotification('error', 'Could not load order details for editing.');
        }
      } else {
        addNotification('error', 'Failed to retrieve order.');
      }
    } catch {
      addNotification('error', 'Network error retrieving order.');
    } finally {
      setFetchingDetailId(null);
    }
  };

  const handleSaveOrder = async () => {
    if (!editingOrder) return;
    setIsSavingOrder(true);
    try {
      const payload = {
        customer_id: editFormData.customerId ? parseInt(editFormData.customerId, 10) : null,
        sale_date: editFormData.saleDate,
        sold_by: editFormData.soldBy.trim() || 'Store Staff',
        notes: editFormData.notes.trim(),
        items: editFormData.items.map((it) => ({
          product_id: it.productId,
          qty: parseFloat(it.qty) || 1,
          unit_sale_price: parseFloat(it.unitPrice) || 0,
        })),
      };

      const res = await fetch(`/api/sales/${editingOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Update failed' }));
        throw new Error(err.error || 'Failed to update order');
      }

      addNotification('success', `Order ${editingOrder.invoice_no} updated successfully!`);
      setEditDrawerOpen(false);
      setEditingOrder(null);
      fetchOrders();
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to update order');
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleDeleteOrder = async (order: OrderListItem) => {
    if (!order) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/sales/${order.id}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        addNotification(
          'success',
          `Order ${order.invoice_no} deleted and ${order.total_qty} units restored to inventory.`
        );
        setOrderToDelete(null);
        if (editingOrder?.id === order.id) {
          setEditDrawerOpen(false);
          setEditingOrder(null);
        }
        fetchOrders();
      } else {
        addNotification('error', data.error || 'Failed to delete sale order.');
      }
    } catch (e: any) {
      addNotification('error', `Error deleting order: ${e.message || 'Unknown network error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Distinct Sellers extracted dynamically from orders
  const distinctSellers = useMemo(() => {
    const sellersMap = new Map<string, number>();
    orders.forEach((o) => {
      const s = o.sold_by?.trim() || 'Store Staff';
      sellersMap.set(s, (sellersMap.get(s) || 0) + 1);
    });
    return Array.from(sellersMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [orders]);

  // Customer options with counts
  const customerOptions = useMemo(() => {
    const counts = new Map<number | 'walk-in', number>();
    orders.forEach((o) => {
      if (o.customer_id) {
        counts.set(o.customer_id, (counts.get(o.customer_id) || 0) + 1);
      } else {
        counts.set('walk-in', (counts.get('walk-in') || 0) + 1);
      }
    });
    return {
      walkInCount: counts.get('walk-in') || 0,
      list: customers
        .map((c) => ({
          ...c,
          count: counts.get(c.id) || 0,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [customers, orders]);

  const handlePresetChange = (preset: string) => {
    setDatePreset(preset as any);
    const now = new Date();
    const formatYMD = (d: Date) => d.toISOString().slice(0, 10);

    if (preset === 'ALL') {
      setFromDate('');
      setToDate('');
    } else if (preset === 'TODAY') {
      const today = formatYMD(now);
      setFromDate(today);
      setToDate(today);
    } else if (preset === 'YESTERDAY') {
      const y = new Date(now.getTime() - 86400000);
      const yStr = formatYMD(y);
      setFromDate(yStr);
      setToDate(yStr);
    } else if (preset === 'LAST_7') {
      const start = new Date(now.getTime() - 7 * 86400000);
      setFromDate(formatYMD(start));
      setToDate(formatYMD(now));
    } else if (preset === 'LAST_30') {
      const start = new Date(now.getTime() - 30 * 86400000);
      setFromDate(formatYMD(start));
      setToDate(formatYMD(now));
    } else if (preset === 'THIS_MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setFromDate(formatYMD(start));
      setToDate(formatYMD(now));
    }
  };

  const handleResetFilters = () => {
    setSelectedCustomerId('ALL');
    setSelectedSoldBy('ALL');
    setDatePreset('ALL');
    setFromDate('');
    setToDate('');
    setSearchQuery('');
  };

  const hasActiveFilters =
    selectedCustomerId !== 'ALL' ||
    selectedSoldBy !== 'ALL' ||
    Boolean(fromDate) ||
    Boolean(toDate) ||
    Boolean(searchQuery.trim());

  // Search, Multi-Criteria Filter, and Sorting Engine
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // 1. Customer Filter
    if (selectedCustomerId !== 'ALL') {
      if (selectedCustomerId === 'WALK_IN') {
        result = result.filter((o) => !o.customer_id);
      } else {
        const cid = parseInt(selectedCustomerId, 10);
        result = result.filter((o) => o.customer_id === cid);
      }
    }

    // 2. Sold By Filter
    if (selectedSoldBy !== 'ALL') {
      const targetSeller = selectedSoldBy.toLowerCase();
      result = result.filter((o) => {
        const s = (o.sold_by?.trim() || 'Store Staff').toLowerCase();
        return s === targetSeller;
      });
    }

    // 3. Date Range Filter
    if (fromDate) {
      result = result.filter((o) => {
        const d = o.sale_date || o.created_at?.split(' ')[0] || '';
        return d >= fromDate;
      });
    }
    if (toDate) {
      result = result.filter((o) => {
        const d = o.sale_date || o.created_at?.split(' ')[0] || '';
        return d <= toDate;
      });
    }

    // 4. Free-text Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.invoice_no.toLowerCase().includes(q) ||
          (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
          (o.sold_by && o.sold_by.toLowerCase().includes(q)) ||
          (o.notes && o.notes.toLowerCase().includes(q)) ||
          o.sale_date.includes(q)
      );
    }

    // 5. Sorting
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        comparison = (b.created_at || b.sale_date).localeCompare(a.created_at || a.sale_date);
      } else if (sortField === 'amount') {
        comparison = (parseFloat(a.total_amount as any) || 0) - (parseFloat(b.total_amount as any) || 0);
      } else if (sortField === 'profit') {
        comparison = (parseFloat(a.total_profit as any) || 0) - (parseFloat(b.total_profit as any) || 0);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [orders, selectedCustomerId, selectedSoldBy, fromDate, toDate, searchQuery, sortField, sortOrder]);

  // Reactive KPI Calculations computed dynamically on filteredOrders
  const totalRevenue = useMemo(
    () => filteredOrders.reduce((acc, o) => acc + (parseFloat(o.total_amount as any) || 0), 0),
    [filteredOrders]
  );
  const totalCogs = useMemo(
    () => filteredOrders.reduce((acc, o) => acc + (parseFloat(o.total_cogs as any) || 0), 0),
    [filteredOrders]
  );
  const totalProfit = useMemo(
    () => filteredOrders.reduce((acc, o) => acc + (parseFloat(o.total_profit as any) || 0), 0),
    [filteredOrders]
  );
  const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  return (
    <div className="space-y-3.5 sm:space-y-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Receipt className="w-4 h-4" />
            </div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground">Past Orders & Invoices</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Browse completed sales, inspect multi-batch cost breakdown, and review customer billing history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchOrders}
            disabled={loading}
            className="h-8.5 px-3 py-1.5 rounded-xl border border-border text-xs font-bold text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
            title="Refresh order history"
            aria-label="Refresh order history"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            href="/"
            className="h-8.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary transition-all shadow-xs flex items-center gap-1.5"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>New Sale (POS)</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Total Orders */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-card border border-border shadow-xs min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Orders</span>
            <Receipt className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="text-base sm:text-lg xl:text-xl font-black text-foreground font-mono tracking-tight truncate tabular-nums">
            {filteredOrders.length}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {hasActiveFilters
              ? `Filtered from ${orders.length} total orders`
              : 'Completed sales transactions'}
          </p>
        </div>

        {/* Gross Revenue */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-card border border-border shadow-xs min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Gross Sales</span>
            <IndianRupee className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="text-base sm:text-lg xl:text-xl font-black text-foreground font-mono tracking-tight truncate tabular-nums" title={`₹${totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}>
            ₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">Total revenue collected</p>
        </div>

        {/* Total COGS */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-card border border-border shadow-xs min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total COGS</span>
            <Layers className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-base sm:text-lg xl:text-xl font-black text-foreground font-mono tracking-tight truncate tabular-nums" title={`₹${totalCogs.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}>
            ₹{totalCogs.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">Acquisition lot costs</p>
        </div>

        {/* Net Profit */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-card border border-border shadow-xs min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Net Profit</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className={`text-base sm:text-lg xl:text-xl font-black font-mono tracking-tight truncate tabular-nums flex items-baseline ${totalProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`} title={`${totalProfit >= 0 ? '+' : ''}₹${totalProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}>
            <span className="mr-0.5">{totalProfit >= 0 ? '+' : ''}</span>
            <span>₹{totalProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{avgMargin.toFixed(1)}% average margin</p>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="space-y-2.5 p-2.5 sm:p-3 rounded-2xl bg-card border border-border shadow-xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
          {/* Free-text Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoice #, customer, notes..."
              className="w-full h-8.5 pl-9 pr-8 py-1.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Clear search text"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Controls Bar */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Customer Filter */}
            <div className="flex items-center gap-1.5 h-8.5 px-2.5 rounded-xl border border-border bg-background text-xs">
              <Users className="w-3.5 h-3.5 text-primary shrink-0" />
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                aria-label="Filter orders by customer"
                className="bg-transparent text-foreground text-xs focus:outline-none cursor-pointer max-w-[160px] truncate"
              >
                <option value="ALL">All Customers ({orders.length})</option>
                {customerOptions.walkInCount > 0 && (
                  <option value="WALK_IN">Walk-in Customers ({customerOptions.walkInCount})</option>
                )}
                {customerOptions.list.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name} ({c.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Sold By Filter */}
            <div className="flex items-center gap-1.5 h-8.5 px-2.5 rounded-xl border border-border bg-background text-xs">
              <User className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <select
                value={selectedSoldBy}
                onChange={(e) => setSelectedSoldBy(e.target.value)}
                aria-label="Filter orders by sold by"
                className="bg-transparent text-foreground text-xs focus:outline-none cursor-pointer max-w-[140px] truncate"
              >
                <option value="ALL">All Sellers ({orders.length})</option>
                {distinctSellers.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name} ({s.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Preset Filter */}
            <div className="flex items-center gap-1.5 h-8.5 px-2.5 rounded-xl border border-border bg-background text-xs">
              <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <select
                value={datePreset}
                onChange={(e) => handlePresetChange(e.target.value)}
                aria-label="Filter orders by date preset"
                className="bg-transparent text-foreground text-xs focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Dates</option>
                <option value="TODAY">Today</option>
                <option value="YESTERDAY">Yesterday</option>
                <option value="LAST_7">Last 7 Days</option>
                <option value="LAST_30">Last 30 Days</option>
                <option value="THIS_MONTH">This Month</option>
                <option value="CUSTOM">Custom Range</option>
              </select>
            </div>

            {/* Sort Field & Order */}
            <div className="flex items-center gap-1.5 pl-0.5">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <ArrowUpDown className="w-3.5 h-3.5" />
              </div>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as any)}
                aria-label="Sort orders field"
                className="h-8.5 px-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="date">Date & Time</option>
                <option value="amount">Total Amount</option>
                <option value="profit">Net Profit</option>
              </select>
              <button
                type="button"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="h-8.5 w-8.5 rounded-xl border border-border text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary text-xs font-semibold cursor-pointer flex items-center justify-center"
                title={`Toggle order: currently ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
                aria-label="Toggle sort order"
              >
                {sortOrder === 'asc' ? '▲' : '▼'}
              </button>
            </div>
          </div>
        </div>

        {/* Custom Date Range Row (when Custom is active or dates are set) */}
        {(datePreset === 'CUSTOM' || fromDate || toDate) && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50 text-xs">
            <span className="text-muted-foreground font-medium flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span>Custom Date Range:</span>
            </span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground text-[11px]">From</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setDatePreset('CUSTOM');
                  }}
                  aria-label="From date"
                  className="px-2.5 py-1 text-xs rounded-lg border border-border bg-background text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground text-[11px]">To</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setDatePreset('CUSTOM');
                  }}
                  aria-label="To date"
                  className="px-2.5 py-1 text-xs rounded-lg border border-border bg-background text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        )}

        {/* Active Filter Chips & Clear All */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/50 text-xs">
            <span className="text-muted-foreground font-semibold flex items-center gap-1 text-[11px] uppercase tracking-wider">
              <Filter className="w-3 h-3 text-primary" />
              <span>Active Filters:</span>
            </span>

            {selectedCustomerId !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20 font-medium text-xs">
                <span>
                  Customer:{' '}
                  {selectedCustomerId === 'WALK_IN'
                    ? 'Walk-in'
                    : customers.find((c) => String(c.id) === selectedCustomerId)?.name ||
                      `ID #${selectedCustomerId}`}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCustomerId('ALL')}
                  className="hover:bg-primary/20 rounded p-0.5 cursor-pointer"
                  aria-label="Clear customer filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedSoldBy !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-medium text-xs">
                <span>Sold by: {selectedSoldBy}</span>
                <button
                  type="button"
                  onClick={() => setSelectedSoldBy('ALL')}
                  className="hover:bg-blue-500/20 rounded p-0.5 cursor-pointer"
                  aria-label="Clear sold by filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {(fromDate || toDate) && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium text-xs">
                <span>
                  Date: {fromDate || 'Any'} → {toDate || 'Present'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDatePreset('ALL');
                    setFromDate('');
                    setToDate('');
                  }}
                  className="hover:bg-amber-500/20 rounded p-0.5 cursor-pointer"
                  aria-label="Clear date filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {searchQuery.trim() && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-muted text-foreground border border-border font-medium text-xs">
                <span>Search: "{searchQuery}"</span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="hover:bg-foreground/10 rounded p-0.5 cursor-pointer"
                  aria-label="Clear search filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted font-semibold transition-colors cursor-pointer ml-auto text-xs"
              aria-label="Reset all filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset All Filters</span>
            </button>
          </div>
        )}

        {/* Counter Summary */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
          <span>
            Showing <strong className="text-foreground font-mono">{filteredOrders.length}</strong> of{' '}
            <strong className="text-foreground font-mono">{orders.length}</strong> orders
            {hasActiveFilters ? ' (Filtered)' : ''}
          </span>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-muted/30 border-b border-border text-[11px] uppercase text-muted-foreground font-semibold tracking-wider">
              <tr>
                <th className="px-3.5 py-2">Invoice #</th>
                <th className="px-3 py-2">Date & Time</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Sold By</th>
                <th className="px-3 py-2 text-center">Items & Units</th>
                <th className="px-3 py-2 text-right">Order Total</th>
                <th className="px-3 py-2 text-right">COGS</th>
                <th className="px-3 py-2 text-right">Net Profit</th>
                <th className="px-3.5 py-2 text-center">Receipt & Breakdown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1.5 text-primary" />
                    <p className="text-xs font-semibold">Loading past orders...</p>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                    <Receipt className="w-6 h-6 mx-auto mb-1.5 text-muted-foreground/50" />
                    <p className="font-semibold text-foreground">No orders found</p>
                    <p className="text-xs mt-0.5">
                      {hasActiveFilters
                        ? 'No sales matched your active filters. Try adjusting customer, date, or seller.'
                        : 'No orders have been billed yet. Start by finalizing a sale in POS.'}
                    </p>
                    {hasActiveFilters ? (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="inline-flex items-center gap-1.5 mt-3 h-8.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 shadow-sm cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset All Filters</span>
                      </button>
                    ) : (
                      <Link
                        href="/"
                        className="inline-flex items-center gap-1.5 mt-3 h-8.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 shadow-sm"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Go to POS Billing</span>
                      </Link>
                    )}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const marginPct =
                    order.total_amount > 0 ? (order.total_profit / order.total_amount) * 100 : 0;
                  const isFetchingThis = fetchingDetailId === order.id;

                  return (
                    <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                      {/* Invoice No */}
                      <td className="px-3.5 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-foreground px-2 py-0.5 rounded-lg bg-muted border border-border">
                            {order.invoice_no}
                          </span>
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1 text-foreground font-medium">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{order.sale_date}</span>
                        </div>
                        {order.created_at && (
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5 font-mono">
                            <Clock className="w-3 h-3" />
                            <span>{order.created_at.split(' ')[1] || order.created_at}</span>
                          </div>
                        )}
                      </td>

                      {/* Customer */}
                      <td className="px-3 py-2.5">
                        {order.customer_name ? (
                          <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                            <Users className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span>{order.customer_name}</span>
                          </div>
                        ) : (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground border border-border">
                            Walk-in Customer
                          </span>
                        )}
                      </td>

                      {/* Sold By */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1 text-xs text-foreground">
                          <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="font-medium text-foreground">
                            {order.sold_by || 'Store Staff'}
                          </span>
                        </div>
                      </td>

                      {/* Items & Units */}
                      <td className="px-3 py-2.5 text-center text-xs">
                        <span className="font-semibold text-foreground">
                          {order.items_count} {order.items_count === 1 ? 'item' : 'items'}
                        </span>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {order.total_qty} units
                        </div>
                      </td>

                      {/* Order Total */}
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-xs text-foreground">
                        ₹{order.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* COGS */}
                      <td className="px-3 py-2.5 text-right font-mono text-xs text-muted-foreground">
                        ₹{order.total_cogs.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Net Profit */}
                      <td className="px-3 py-2.5 text-right text-xs">
                        <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          +₹{order.total_profit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {marginPct.toFixed(1)}% margin
                        </span>
                      </td>

                      {/* Action: View Receipt & Edit */}
                      <td className="px-3.5 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleViewReceipt(order)}
                            disabled={isFetchingThis}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-primary cursor-pointer disabled:opacity-50 shadow-xs"
                            title="View printable invoice receipt and batch allocations"
                            aria-label={`View receipt for ${order.invoice_no}`}
                          >
                            {isFetchingThis ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                            <span>Receipt</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditOrder(order)}
                            disabled={isFetchingThis}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                            title={`Edit order ${order.invoice_no}`}
                            aria-label={`Edit order ${order.invoice_no}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setOrderToDelete(order)}
                            disabled={isFetchingThis || isDeleting}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-destructive/20 text-destructive hover:bg-destructive/10 text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-destructive cursor-pointer disabled:opacity-50"
                            title={`Delete order ${order.invoice_no} and restore inventory`}
                            aria-label={`Delete order ${order.invoice_no}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Receipt Modal with Batch Breakdown */}
      {selectedSaleRecord && (
        <InvoiceReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => {
            setReceiptModalOpen(false);
            setSelectedSaleRecord(null);
          }}
          sale={selectedSaleRecord}
        />
      )}

      {/* Edit Order Drawer */}
      <Drawer
        isOpen={isEditDrawerOpen}
        onClose={() => {
          setEditDrawerOpen(false);
          setEditingOrder(null);
        }}
        title={`Edit Order: ${editingOrder?.invoice_no || ''}`}
        description="Modify customer assignment, sale date, notes, and line item quantities."
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={() => {
                if (editingOrder) {
                  setOrderToDelete(editingOrder);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-destructive hover:bg-destructive/10 border border-destructive/20 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-destructive cursor-pointer transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Order</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditDrawerOpen(false);
                  setEditingOrder(null);
                }}
                className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveOrder}
                disabled={isSavingOrder}
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isSavingOrder ? 'Saving Order...' : 'Save Changes'}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
              Customer Assignment
            </label>
            <select
              value={editFormData.customerId}
              onChange={(e) => setEditFormData({ ...editFormData, customerId: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              <option value="">Walk-in Customer (Unassigned)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
              Sale Date
            </label>
            <input
              type="date"
              value={editFormData.saleDate}
              onChange={(e) => setEditFormData({ ...editFormData, saleDate: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
              Sold By (Seller Name)
            </label>
            <input
              type="text"
              value={editFormData.soldBy}
              onChange={(e) => setEditFormData({ ...editFormData, soldBy: e.target.value })}
              placeholder="e.g. Surendra, Ranga Prasad, Store Staff"
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
              Order Notes
            </label>
            <textarea
              rows={2}
              value={editFormData.notes}
              onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
              placeholder="Optional notes or instructions..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
              Order Items
            </label>
            <div className="space-y-3">
              {editFormData.items.map((it, idx) => {
                const subtotal = (parseFloat(it.qty) || 0) * (parseFloat(it.unitPrice) || 0);
                return (
                  <div key={idx} className="p-3.5 rounded-2xl border border-border bg-muted/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">{it.productName}</span>
                      <span className="font-mono text-xs font-bold text-primary">₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] text-muted-foreground uppercase font-semibold mb-0.5">
                          Quantity
                        </label>
                        <input
                          type="text"
                          value={it.qty}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9.]/g, '');
                            const updated = [...editFormData.items];
                            updated[idx].qty = val;
                            setEditFormData({ ...editFormData, items: updated });
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-muted-foreground uppercase font-semibold mb-0.5">
                          Unit Price (₹)
                        </label>
                        <input
                          type="text"
                          value={it.unitPrice}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9.]/g, '');
                            const updated = [...editFormData.items];
                            updated[idx].unitPrice = val;
                            setEditFormData({ ...editFormData, items: updated });
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Drawer>

      {/* Confirmation Modal for Order Deletion & Stock Restoration */}
      {orderToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-order-title"
        >
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <div className="w-10 h-10 rounded-2xl bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 id="delete-order-title" className="text-base font-bold text-foreground">
                  Delete Sale Order?
                </h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  {orderToDelete.invoice_no}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border text-xs space-y-1.5 text-muted-foreground">
              <p className="font-semibold text-foreground">
                This action cannot be undone:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Order invoice <span className="font-mono font-bold text-foreground">{orderToDelete.invoice_no}</span> will be permanently removed.</li>
                <li>All drawn inventory (<span className="font-bold text-foreground">{orderToDelete.total_qty} units</span> across {orderToDelete.items_count} items) will be restored to active inventory lots.</li>
                <li>Historical store revenue of <span className="font-bold text-foreground">₹{orderToDelete.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> will be deducted.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteOrder(orderToDelete)}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-bold hover:bg-destructive/90 focus-visible:ring-2 focus-visible:ring-destructive cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {isDeleting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>{isDeleting ? 'Restoring & Deleting...' : 'Confirm Delete & Restore'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
