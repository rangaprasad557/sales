'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  Store,
  Globe,
  Tag,
  DollarSign,
  Calendar,
  Layers,
  Building2,
  Package,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Drawer } from '../../components/Drawer';
import { useUIStore } from '../../store/useUIStore';

interface ProcurementRecord {
  id: number;
  invoiceNo: string;
  supplierName: string;
  source: string;
  procurementDate: string;
  totalAmount: number;
  itemCount: number;
  notes?: string;
}

const SOURCES = ['Wholesale Shop', 'Quick Commerce', 'E-Commerce', 'Other'];

const SEED_PROCUREMENTS: ProcurementRecord[] = [
  {
    id: 1,
    invoiceNo: 'PROC-20260901-001',
    supplierName: 'National Grain Distributors',
    source: 'Wholesale Shop',
    procurementDate: '2026-09-01',
    totalAmount: 171.0,
    itemCount: 45,
    notes: 'Bulk purchase of Basmati Rice @ $3.80/kg.',
  },
  {
    id: 2,
    invoiceNo: 'PROC-20260903-002',
    supplierName: 'Golden Harvest Milling',
    source: 'Wholesale Shop',
    procurementDate: '2026-09-03',
    totalAmount: 176.0,
    itemCount: 80,
    notes: 'Whole Wheat Atta 10kg intake @ $2.20/kg.',
  },
  {
    id: 3,
    invoiceNo: 'PROC-20260908-003',
    supplierName: 'BlinkSupply Rapid Delivery',
    source: 'Quick Commerce',
    procurementDate: '2026-09-08',
    totalAmount: 420.0,
    itemCount: 100,
    notes: 'Express replenishment of Basmati Rice @ $4.20/kg.',
  },
];

export default function ProcurementPage() {
  const [procurements, setProcurements] = useState<ProcurementRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState('ALL');
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const { addNotification } = useUIStore();

  // Form State
  const [formData, setFormData] = useState({
    invoiceNo: '',
    supplierName: 'National Grain Distributors',
    source: 'Wholesale Shop',
    procurementDate: new Date().toISOString().slice(0, 10),
    productName: 'Royal Basmati Rice 5kg',
    unitCost: '3.80',
    quantity: '50',
    batchCode: '',
    notes: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/procurements')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        const list = data.procurements || data.data || (Array.isArray(data) ? data : []);
        setProcurements(
          list.map((p: any) => ({
            id: p.id,
            invoiceNo: p.invoice_no || p.invoiceNo,
            supplierName: p.supplier_name || p.supplierName || 'Primary Supplier',
            source: p.source || 'Wholesale Shop',
            procurementDate: p.procurement_date || p.procurementDate,
            totalAmount: parseFloat(p.total_amount || p.totalAmount || '0'),
            itemCount: p.items ? p.items.length : 1,
            notes: p.notes,
          }))
        );
      })
      .catch(() => {});
  }, []);

  const openCreateDrawer = () => {
    const inv = `PROC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    const batch = `LOT-${Math.floor(1000 + Math.random() * 9000)}`;
    setFormData({
      invoiceNo: inv,
      supplierName: 'National Grain Distributors',
      source: 'Wholesale Shop',
      procurementDate: new Date().toISOString().slice(0, 10),
      productName: 'Royal Basmati Rice 5kg',
      unitCost: '3.80',
      quantity: '50',
      batchCode: batch,
      notes: '',
    });
    setFormErrors({});
    setDrawerOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.invoiceNo.trim()) errors.invoiceNo = 'Invoice number is required';
    const cost = parseFloat(formData.unitCost);
    if (isNaN(cost) || cost <= 0) errors.unitCost = 'Unit cost must be greater than 0';
    const qty = parseFloat(formData.quantity);
    if (isNaN(qty) || qty <= 0) errors.quantity = 'Quantity must be greater than 0';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const total = parseFloat(formData.unitCost) * parseFloat(formData.quantity);
    const newRecord: ProcurementRecord = {
      id: Date.now(),
      invoiceNo: formData.invoiceNo,
      supplierName: formData.supplierName,
      source: formData.source,
      procurementDate: formData.procurementDate,
      totalAmount: total,
      itemCount: parseFloat(formData.quantity),
      notes: `${formData.productName} [${formData.batchCode}]: ${formData.quantity} units @ $${formData.unitCost}`,
    };

    setProcurements([newRecord, ...procurements]);
    addNotification('success', `Procurement invoice ${newRecord.invoiceNo} registered.`);
    setDrawerOpen(false);
  };

  const filteredProcurements = procurements.filter((p) => {
    const matchSrc = selectedSource === 'ALL' || p.source === selectedSource;
    const q = searchQuery.toLowerCase();
    const matchQ =
      p.invoiceNo.toLowerCase().includes(q) ||
      p.supplierName.toLowerCase().includes(q) ||
      (p.notes && p.notes.toLowerCase().includes(q));
    return matchSrc && matchQ;
  });

  const totalCapitalSpent = procurements.reduce((acc, p) => acc + p.totalAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-medium text-xs uppercase tracking-wider mb-1">
            <Truck className="w-4 h-4" />
            <span>Multi-Batch Costing Module</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Procurement & Batch Intake
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Record inventory arrivals across Wholesale, Quick Commerce, and E-Commerce channels.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateDrawer}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20 hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Stock Intake</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Invoices</span>
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground">{procurements.length}</div>
          <p className="text-xs text-muted-foreground mt-1">Intake consignments</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Capital Invested</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-foreground">
            ${totalCapitalSpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Total procurement value</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Channels</span>
            <Store className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-foreground">3 Sources</div>
          <p className="text-xs text-muted-foreground mt-1">Wholesale, Quick Comm, E-Comm</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Allocation Method</span>
            <Layers className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground">LCF</div>
          <p className="text-xs text-muted-foreground mt-1">Lowest-Cost-First automated</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-2 bg-card rounded-2xl border border-border shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search procurements by invoice number, vendor, or lot description..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-transparent border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setSelectedSource('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedSource === 'ALL'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            All Sources
          </button>
          {SOURCES.map((src) => (
            <button
              key={src}
              type="button"
              onClick={() => setSelectedSource(src)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedSource === src
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {src}
            </button>
          ))}
        </div>
      </div>

      {/* Procurement Table */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground font-semibold tracking-wider">
              <tr>
                <th className="px-6 py-4">Invoice # & Date</th>
                <th className="px-6 py-4">Supplier & Channel</th>
                <th className="px-6 py-4">Consignment Details</th>
                <th className="px-6 py-4 text-right">Total Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredProcurements.map((proc) => (
                <tr key={proc.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted text-foreground border border-border block w-max">
                      {proc.invoiceNo}
                    </span>
                    <span className="text-xs text-muted-foreground mt-1 block">
                      {proc.procurementDate}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-foreground block">{proc.supplierName}</span>
                    <span className="inline-block mt-1 text-[11px] font-medium px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      {proc.source}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-muted-foreground">
                    <div className="font-medium text-foreground">{proc.notes}</div>
                    <div>Units received: {proc.itemCount}</div>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-sm font-bold text-foreground">
                    ${proc.totalAmount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Drawer for New Stock Intake */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Record New Stock Intake"
        description="Register arrival of inventory lots with fluctuating acquisition costs."
        footer={
          <>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
            >
              Commit Intake & Create Lots
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
              Procurement Invoice # <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={formData.invoiceNo}
              onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                Supplier / Vendor
              </label>
              <input
                type="text"
                value={formData.supplierName}
                onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                Procurement Channel
              </label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
              Product Item
            </label>
            <input
              type="text"
              value={formData.productName}
              onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                Unit Acquisition Cost ($) <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.unitCost}
                onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                Quantity Received <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
              Batch Code
            </label>
            <input
              type="text"
              value={formData.batchCode}
              onChange={(e) => setFormData({ ...formData, batchCode: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </form>
      </Drawer>
    </div>
  );
}
