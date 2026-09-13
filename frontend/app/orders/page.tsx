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
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'date' | 'amount' | 'profit'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedSaleRecord, setSelectedSaleRecord] = useState<CompletedSaleRecord | null>(null);
  const [isReceiptModalOpen, setReceiptModalOpen] = useState(false);
  const [fetchingDetailId, setFetchingDetailId] = useState<number | null>(null);

  const { addNotification } = useUIStore();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sales');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.sales)) {
          setOrders(data.sales);
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

  useEffect(() => {
    fetchOrders();
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
    notes: '',
    items: [] as Array<{
      productId: number;
      productName: string;
      sku: string;
      qty: string;
      unitPrice: string;
    }>,
  });
  const [customers, setCustomers] = useState<Array<{ id: number; name: string }>>([]);
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

  // KPI Calculations
  const totalRevenue = useMemo(() => orders.reduce((acc, o) => acc + (o.total_amount || 0), 0), [orders]);
  const totalCogs = useMemo(() => orders.reduce((acc, o) => acc + (o.total_cogs || 0), 0), [orders]);
  const totalProfit = useMemo(() => orders.reduce((acc, o) => acc + (o.total_profit || 0), 0), [orders]);
  const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  // Search and Sorting Filter
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.invoice_no.toLowerCase().includes(q) ||
          (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
          (o.notes && o.notes.toLowerCase().includes(q)) ||
          o.sale_date.includes(q)
      );
    }

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        comparison = (b.created_at || b.sale_date).localeCompare(a.created_at || a.sale_date);
      } else if (sortField === 'amount') {
        comparison = a.total_amount - b.total_amount;
      } else if (sortField === 'profit') {
        comparison = a.total_profit - b.total_profit;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [orders, searchQuery, sortField, sortOrder]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Receipt className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">Past Orders & Invoices</h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Browse completed sales, inspect multi-batch cost breakdown, and review customer billing history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchOrders}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Refresh order history"
            aria-label="Refresh order history"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary transition-all shadow-sm flex items-center gap-1.5"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>New Sale (POS)</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Orders */}
        <div className="p-5 rounded-3xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Orders</span>
            <Receipt className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground font-mono">{orders.length}</div>
          <p className="text-xs text-muted-foreground mt-1">Completed sales transactions</p>
        </div>

        {/* Gross Revenue */}
        <div className="p-5 rounded-3xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Gross Sales</span>
            <IndianRupee className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground font-mono">
            ₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Total revenue collected</p>
        </div>

        {/* Total COGS */}
        <div className="p-5 rounded-3xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total COGS</span>
            <Layers className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-foreground font-mono">
            ₹{totalCogs.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Acquisition lot costs</p>
        </div>

        {/* Net Profit */}
        <div className="p-5 rounded-3xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Net Profit</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            +₹{totalProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{avgMargin.toFixed(1)}% average margin</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by invoice #, customer..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span className="font-medium">Sort:</span>
          </div>

          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            <option value="date">Date & Time</option>
            <option value="amount">Total Amount</option>
            <option value="profit">Net Profit</option>
          </select>

          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-1.5 rounded-xl border border-border text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary text-xs font-semibold cursor-pointer"
            title={`Toggle order: currently ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
            aria-label="Toggle sort order"
          >
            {sortOrder === 'asc' ? '▲ Asc' : '▼ Desc'}
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-3xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/30 border-b border-border text-xs uppercase text-muted-foreground font-semibold tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Invoice #</th>
                <th className="px-4 py-3.5">Date & Time</th>
                <th className="px-4 py-3.5">Customer</th>
                <th className="px-4 py-3.5 text-center">Items & Units</th>
                <th className="px-4 py-3.5 text-right">Order Total</th>
                <th className="px-4 py-3.5 text-right">COGS</th>
                <th className="px-4 py-3.5 text-right">Net Profit</th>
                <th className="px-6 py-3.5 text-center">Receipt & Breakdown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    <p className="text-xs font-semibold">Loading past orders...</p>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                    <Receipt className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="font-semibold text-foreground">No orders found</p>
                    <p className="text-xs mt-1">
                      {searchQuery
                        ? 'No sales matched your search term.'
                        : 'No orders have been billed yet. Start by finalizing a sale in POS.'}
                    </p>
                    {!searchQuery && (
                      <Link
                        href="/"
                        className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 shadow-sm"
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
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-foreground px-2.5 py-1 rounded-lg bg-muted border border-border">
                            {order.invoice_no}
                          </span>
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="px-4 py-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5 text-foreground font-medium">
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
                      <td className="px-4 py-4">
                        {order.customer_name ? (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                            <Users className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span>{order.customer_name}</span>
                          </div>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground border border-border">
                            Walk-in Customer
                          </span>
                        )}
                      </td>

                      {/* Items & Units */}
                      <td className="px-4 py-4 text-center text-xs">
                        <span className="font-semibold text-foreground">
                          {order.items_count} {order.items_count === 1 ? 'item' : 'items'}
                        </span>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {order.total_qty} units
                        </div>
                      </td>

                      {/* Order Total */}
                      <td className="px-4 py-4 text-right font-mono font-bold text-xs text-foreground">
                        ₹{order.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* COGS */}
                      <td className="px-4 py-4 text-right font-mono text-xs text-muted-foreground">
                        ₹{order.total_cogs.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Net Profit */}
                      <td className="px-4 py-4 text-right text-xs">
                        <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          +₹{order.total_profit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {marginPct.toFixed(1)}% margin
                        </span>
                      </td>

                      {/* Action: View Receipt & Edit */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleViewReceipt(order)}
                            disabled={isFetchingThis}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-primary cursor-pointer disabled:opacity-50 shadow-xs"
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
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                            title={`Edit order ${order.invoice_no}`}
                            aria-label={`Edit order ${order.invoice_no}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
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
          <>
            <button
              type="button"
              onClick={() => {
                setEditDrawerOpen(false);
                setEditingOrder(null);
              }}
              className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveOrder}
              disabled={isSavingOrder}
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary shadow-sm disabled:opacity-50"
            >
              {isSavingOrder ? 'Saving Order...' : 'Save Changes'}
            </button>
          </>
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
    </div>
  );
}
