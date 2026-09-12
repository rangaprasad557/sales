'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  Store,
  DollarSign,
  Layers,
  Package,
  AlertCircle,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { Drawer } from '../../components/Drawer';
import { useUIStore } from '../../store/useUIStore';

interface CatalogueProductItem {
  id: number;
  name: string;
  sku: string;
  unit: string;
  category?: string;
  currentStock?: number;
}

interface SupplierItem {
  id: number;
  name: string;
  source: string;
  contactPerson?: string;
}

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

export default function ProcurementPage() {
  const [procurements, setProcurements] = useState<ProcurementRecord[]>([]);
  const [products, setProducts] = useState<CatalogueProductItem[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState('ALL');
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addNotification } = useUIStore();

  // Form State
  const [formData, setFormData] = useState({
    invoiceNo: '',
    supplierId: '',
    supplierName: '',
    source: 'Wholesale Shop',
    procurementDate: new Date().toISOString().slice(0, 10),
    productId: '',
    productName: '',
    unitCost: '10.00',
    quantity: '50',
    batchCode: '', // Batch code not required
    notes: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const fetchProcurements = () => {
    fetch('/api/procurements')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        const list = data.procurements || data.data || (Array.isArray(data) ? data : []);
        setProcurements(
          list.map((p: any) => {
            let supName = p.supplier_name || p.supplierName || '';
            if (!supName && p.notes) {
              const match = p.notes.match(/Supplier:\s*([^.]+)/i);
              if (match) supName = match[1].trim();
            }
            if (!supName) supName = 'Wholesale Vendor';

            const itemsCount = p.items && p.items.length > 0
              ? p.items.reduce((sum: number, it: any) => sum + (parseFloat(it.initial_qty) || 0), 0)
              : 1;

            return {
              id: p.id,
              invoiceNo: p.invoice_no || p.invoiceNo,
              supplierName: supName,
              source: p.source || 'Wholesale Shop',
              procurementDate: p.procurement_date || p.procurementDate,
              totalAmount: parseFloat(p.total_amount || p.totalAmount || '0'),
              itemCount: itemsCount,
              notes: p.notes,
            };
          })
        );
      })
      .catch(() => {});
  };

  const fetchProducts = () => {
    fetch('/api/products')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        const list = data.products || data.data || (Array.isArray(data) ? data : []);
        setProducts(
          list.map((p: any) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            unit: p.unit || 'pcs',
            category: p.category,
            currentStock: parseFloat(p.stock || p.current_stock || p.total_stock || '0'),
          }))
        );
      })
      .catch(() => {});
  };

  const fetchSuppliers = () => {
    fetch('/api/suppliers')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        const list = data.suppliers || data.data || (Array.isArray(data) ? data : []);
        setSuppliers(
          list.map((s: any) => ({
            id: s.id,
            name: s.name,
            source: s.source || 'Wholesale Shop',
            contactPerson: s.contact_person || s.contactPerson,
          }))
        );
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchProcurements();
    fetchProducts();
    fetchSuppliers();
  }, []);

  const openCreateDrawer = () => {
    fetchProducts();
    fetchSuppliers();
    const inv = `PROC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    const defaultProduct = products.length > 0 ? products[0] : null;
    const defaultSupplier = suppliers.length > 0 ? suppliers[0] : null;

    setFormData({
      invoiceNo: inv,
      supplierId: defaultSupplier ? String(defaultSupplier.id) : '',
      supplierName: defaultSupplier ? defaultSupplier.name : '',
      source: defaultSupplier?.source || 'Wholesale Shop',
      procurementDate: new Date().toISOString().slice(0, 10),
      productId: defaultProduct ? String(defaultProduct.id) : '',
      productName: defaultProduct ? defaultProduct.name : '',
      unitCost: '10.00',
      quantity: '50',
      batchCode: '', // Not required
      notes: '',
    });
    setFormErrors({});
    setDrawerOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.invoiceNo.trim()) {
      errors.invoiceNo = 'Invoice number is required';
      addNotification('error', 'Invoice number is required');
    }
    if (!formData.productId) {
      errors.productId = 'Please select a product from the catalogue';
      addNotification('error', 'Please select a product from the catalogue');
    }
    const cost = parseFloat(formData.unitCost);
    if (isNaN(cost) || cost <= 0) {
      errors.unitCost = 'Unit cost must be greater than 0';
      addNotification('error', 'Unit acquisition cost must be greater than 0');
    }
    const qty = parseFloat(formData.quantity);
    if (isNaN(qty) || qty <= 0) {
      errors.quantity = 'Quantity must be greater than 0';
      addNotification('error', 'Quantity received must be greater than 0');
    }
    // Note: Batch code is NOT required (optional)
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    const prodId = parseInt(formData.productId, 10);
    const qtyVal = parseFloat(formData.quantity);
    const costVal = parseFloat(formData.unitCost);
    // Batch code is not required; if empty, let backend or frontend auto-generate
    const batchCode = formData.batchCode.trim() || `LOT-${Math.floor(1000 + Math.random() * 9000)}`;

    const chosenSupplier = suppliers.find((s) => String(s.id) === formData.supplierId);
    const finalSupplierName = chosenSupplier ? chosenSupplier.name : formData.supplierName.trim() || 'Wholesale Vendor';

    const chosenProduct = products.find((p) => p.id === prodId);
    const finalProductName = chosenProduct ? chosenProduct.name : formData.productName;

    const payload = {
      invoice_no: formData.invoiceNo.trim(),
      source: formData.source,
      procurement_date: formData.procurementDate,
      notes: `Supplier: ${finalSupplierName}. Product: ${finalProductName}. ${formData.notes}`.trim(),
      items: [
        {
          product_id: prodId,
          qty: qtyVal,
          unit_cost: costVal,
          batch_code: batchCode,
        },
      ],
    };

    try {
      const res = await fetch('/api/procurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Procurement intake failed' }));
        throw new Error(errData.error || 'Procurement intake failed');
      }

      addNotification('success', `Stock intake committed! Invoice ${formData.invoiceNo} saved with batch ${batchCode}.`);
      setDrawerOpen(false);
      fetchProcurements();
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to record intake');
    } finally {
      setIsSubmitting(false);
    }
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
              {filteredProcurements.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                    <Package className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="font-medium text-foreground">No procurement intakes recorded</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click &quot;New Stock Intake&quot; to record an incoming consignment.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProcurements.map((proc) => (
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
                ))
              )}
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
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Recording Intake...' : 'Commit Intake & Create Lots'}
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
              className={`w-full px-3.5 py-2.5 rounded-xl border bg-background text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary ${
                formErrors.invoiceNo ? 'border-destructive' : 'border-border'
              }`}
            />
            {formErrors.invoiceNo && (
              <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {formErrors.invoiceNo}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                  Supplier / Vendor
                </label>
                <a
                  href="/suppliers"
                  className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-0.5"
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>New</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              {suppliers.length > 0 ? (
                <select
                  value={formData.supplierId}
                  onChange={(e) => {
                    const selId = e.target.value;
                    const selSup = suppliers.find((s) => String(s.id) === selId);
                    setFormData((prev) => ({
                      ...prev,
                      supplierId: selId,
                      supplierName: selSup ? selSup.name : prev.supplierName,
                      source: selSup?.source || prev.source,
                    }));
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">-- Select Registered Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.source})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={formData.supplierName}
                  onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                  placeholder="e.g. National Grain Distributors"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              )}
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                Product Item (from Catalogue) <span className="text-destructive">*</span>
              </label>
              <a
                href="/catalogue"
                className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-0.5"
                target="_blank"
                rel="noreferrer"
              >
                <span>Catalogue</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            {products.length > 0 ? (
              <select
                value={formData.productId}
                onChange={(e) => {
                  const selId = e.target.value;
                  const selProd = products.find((p) => String(p.id) === selId);
                  setFormData((prev) => ({
                    ...prev,
                    productId: selId,
                    productName: selProd ? selProd.name : prev.productName,
                  }));
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                  formErrors.productId ? 'border-destructive' : 'border-border'
                }`}
              >
                <option value="">-- Select Product from Catalogue --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} [{p.sku}] ({p.unit})
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 rounded-xl border border-dashed border-amber-300 bg-amber-50 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-300">
                No products found in catalogue. Please{' '}
                <a href="/catalogue" className="font-bold underline text-primary">
                  create a product in the Catalogue
                </a>{' '}
                first.
              </div>
            )}
            {formErrors.productId && (
              <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {formErrors.productId}
              </p>
            )}
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
                className={`w-full px-3.5 py-2.5 rounded-xl border bg-background text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary ${
                  formErrors.unitCost ? 'border-destructive' : 'border-border'
                }`}
              />
              {formErrors.unitCost && (
                <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {formErrors.unitCost}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                Quantity Received <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="any"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className={`w-full px-3.5 py-2.5 rounded-xl border bg-background text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary ${
                  formErrors.quantity ? 'border-destructive' : 'border-border'
                }`}
              />
              {formErrors.quantity && (
                <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {formErrors.quantity}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
              Batch Code <span className="text-muted-foreground font-normal lowercase">(not required - auto-generated if left blank)</span>
            </label>
            <input
              type="text"
              value={formData.batchCode}
              onChange={(e) => setFormData({ ...formData, batchCode: e.target.value })}
              placeholder="e.g. LOT-202609-01 (leave blank to auto-generate)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Optional lot identifier. If omitted, the system generates LOT-&lt;id&gt;-&lt;num&gt; automatically.
            </p>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
