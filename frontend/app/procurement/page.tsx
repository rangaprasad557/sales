'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  Store,
  IndianRupee,
  Layers,
  Package,
  AlertCircle,
  FileText,
  ExternalLink,
  Edit2,
  Boxes,
  CheckCircle2,
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
  procurementDate?: string;
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
  const [editingProcurement, setEditingProcurement] = useState<ProcurementRecord | null>(null);
  const [consignmentItems, setConsignmentItems] = useState<any[]>([]);
  const [consignmentSearch, setConsignmentSearch] = useState('');
  const [consignmentTab, setConsignmentTab] = useState<'products' | 'lots'>('products');
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
    setEditingProcurement(null);
    setConsignmentItems([]);
    setConsignmentSearch('');
    setConsignmentTab('products');
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

  const openEditDrawer = async (proc: ProcurementRecord) => {
    fetchProducts();
    setEditingProcurement(proc);
    setConsignmentSearch('');
    setConsignmentTab('products');

    let resolvedSupplierName = proc.supplierName || '';
    let resolvedSource = proc.source || 'Wholesale Shop';
    let itemProdId = '';
    let itemProdName = '';
    let itemUnitCost = '10.00';
    let itemQty = String(proc.itemCount || '50');
    let itemBatchCode = '';
    let itemNotes = proc.notes || '';

    try {
      const res = await fetch(`/api/procurements/${proc.id}`);
      if (res.ok) {
        const data = await res.json();
        const p = data.procurement || data;
        if (p.supplier_name) {
          resolvedSupplierName = p.supplier_name;
        } else if (p.notes) {
          const match = p.notes.match(/Supplier:\s*([^.]+)/i);
          if (match) resolvedSupplierName = match[1].trim();
        }
        if (p.source) resolvedSource = p.source;
        if (p.notes) itemNotes = p.notes;
        if (p.items && p.items.length > 0) {
          setConsignmentItems(p.items);
          const it = p.items[0];
          itemProdId = String(it.product_id || '');
          itemProdName = it.product_name || '';
          itemUnitCost = String(it.unit_cost || '10.00');
          itemQty = String(it.initial_qty || it.qty || '50');
          itemBatchCode = it.batch_code || '';
        } else {
          setConsignmentItems([]);
        }
      }
    } catch {
      setConsignmentItems([]);
    }

    // Refresh suppliers list and match supplier
    let currentSuppliers = suppliers;
    try {
      const sRes = await fetch('/api/suppliers');
      if (sRes.ok) {
        const sData = await sRes.json();
        const list = sData.suppliers || sData.data || (Array.isArray(sData) ? sData : []);
        currentSuppliers = list.map((s: any) => ({
          id: s.id,
          name: s.name,
          source: s.source || 'Wholesale Shop',
          contactPerson: s.contact_person || s.contactPerson,
        }));
        setSuppliers(currentSuppliers);
      }
    } catch {
      // Keep existing suppliers
    }

    const matchedSupplier = currentSuppliers.find(
      (s) => s.name.trim().toLowerCase() === resolvedSupplierName.trim().toLowerCase()
    );

    let resolvedSupplierId = '';
    if (matchedSupplier) {
      resolvedSupplierId = String(matchedSupplier.id);
      resolvedSupplierName = matchedSupplier.name;
      if (matchedSupplier.source) resolvedSource = matchedSupplier.source;
    } else if (resolvedSupplierName) {
      resolvedSupplierId = '__custom__';
    }

    // Strip previous system prefixes like 'Supplier: X. Product: Y.' from user editable notes
    const cleanedNotes = itemNotes
      .replace(/^Supplier:\s*[^.]*\.?\s*/i, '')
      .replace(/^Product:\s*[^.]*\.?\s*/i, '')
      .trim();

    setFormData({
      invoiceNo: proc.invoiceNo,
      supplierId: resolvedSupplierId,
      supplierName: resolvedSupplierName,
      source: resolvedSource,
      procurementDate: proc.procurementDate || new Date().toISOString().slice(0, 10),
      productId: itemProdId,
      productName: itemProdName,
      unitCost: itemUnitCost,
      quantity: itemQty,
      batchCode: itemBatchCode,
      notes: cleanedNotes,
    });
    setFormErrors({});
    setDrawerOpen(true);
  };

  const isMultiItemConsignment = Boolean(editingProcurement && consignmentItems.length > 1);

  const consignmentProductsRollup = useMemo(() => {
    const map = new Map<number, {
      productId: number;
      productName: string;
      sku: string;
      totalInitialQty: number;
      totalRemainingQty: number;
      totalValue: number;
      lotsCount: number;
      minCost: number;
      maxCost: number;
    }>();
    for (const it of consignmentItems) {
      const pid = it.product_id;
      const initialQty = parseFloat(it.initial_qty || it.qty || '0');
      const remainingQty = parseFloat(it.remaining_qty ?? it.initial_qty ?? '0');
      const unitCost = parseFloat(it.unit_cost || '0');
      const value = initialQty * unitCost;

      if (!map.has(pid)) {
        map.set(pid, {
          productId: pid,
          productName: it.product_name || `Product #${pid}`,
          sku: it.sku || '',
          totalInitialQty: initialQty,
          totalRemainingQty: remainingQty,
          totalValue: value,
          lotsCount: 1,
          minCost: unitCost,
          maxCost: unitCost,
        });
      } else {
        const existing = map.get(pid)!;
        existing.totalInitialQty += initialQty;
        existing.totalRemainingQty += remainingQty;
        existing.totalValue += value;
        existing.lotsCount += 1;
        existing.minCost = Math.min(existing.minCost, unitCost);
        existing.maxCost = Math.max(existing.maxCost, unitCost);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.productName.localeCompare(b.productName));
  }, [consignmentItems]);

  const consignmentSummary = useMemo(() => {
    const totalQty = consignmentItems.reduce((acc, it) => acc + (parseFloat(it.initial_qty || it.qty || '0')), 0);
    const totalRemaining = consignmentItems.reduce((acc, it) => acc + (parseFloat(it.remaining_qty ?? it.initial_qty ?? '0')), 0);
    const totalValue = consignmentItems.reduce((acc, it) => acc + (parseFloat(it.initial_qty || it.qty || '0') * parseFloat(it.unit_cost || '0')), 0);
    return {
      totalQty,
      totalRemaining,
      totalValue,
      productsCount: consignmentProductsRollup.length,
      lotsCount: consignmentItems.length,
    };
  }, [consignmentItems, consignmentProductsRollup]);

  const filteredConsignmentProducts = useMemo(() => {
    if (!consignmentSearch.trim()) return consignmentProductsRollup;
    const q = consignmentSearch.toLowerCase();
    return consignmentProductsRollup.filter(
      (p) => p.productName.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    );
  }, [consignmentProductsRollup, consignmentSearch]);

  const filteredConsignmentLots = useMemo(() => {
    if (!consignmentSearch.trim()) return consignmentItems;
    const q = consignmentSearch.toLowerCase();
    return consignmentItems.filter(
      (it) =>
        (it.product_name && it.product_name.toLowerCase().includes(q)) ||
        (it.sku && it.sku.toLowerCase().includes(q)) ||
        (it.batch_code && it.batch_code.toLowerCase().includes(q))
    );
  }, [consignmentItems, consignmentSearch]);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.invoiceNo.trim()) {
      errors.invoiceNo = 'Invoice number is required';
      addNotification('error', 'Invoice number is required');
    }
    if (!formData.procurementDate) {
      errors.procurementDate = 'Procurement date is required';
      addNotification('error', 'Procurement date is required');
    }

    if (!isMultiItemConsignment) {
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
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    const chosenSupplier = suppliers.find((s) => String(s.id) === formData.supplierId);
    const finalSupplierName = chosenSupplier
      ? chosenSupplier.name
      : formData.supplierName.trim() || 'Wholesale Vendor';

    const userNotes = formData.notes.trim();

    let payload: any;
    let successMsg = '';

    if (isMultiItemConsignment) {
      const formattedNotes = `Supplier: ${finalSupplierName}.${userNotes ? ' ' + userNotes : ''}`.trim();
      payload = {
        invoice_no: formData.invoiceNo.trim(),
        source: formData.source,
        procurement_date: formData.procurementDate,
        notes: formattedNotes,
        is_multi_item: true,
      };
      successMsg = `Consignment invoice ${formData.invoiceNo} header updated successfully!`;
    } else {
      const prodId = parseInt(formData.productId, 10);
      const qtyVal = parseFloat(formData.quantity);
      const costVal = parseFloat(formData.unitCost);
      const batchCode = formData.batchCode.trim() || `LOT-${Math.floor(1000 + Math.random() * 9000)}`;

      const chosenProduct = products.find((p) => p.id === prodId);
      const finalProductName = chosenProduct ? chosenProduct.name : formData.productName;
      const formattedNotes = `Supplier: ${finalSupplierName}. Product: ${finalProductName}.${userNotes ? ' ' + userNotes : ''}`.trim();

      payload = {
        invoice_no: formData.invoiceNo.trim(),
        source: formData.source,
        procurement_date: formData.procurementDate,
        unit_cost: costVal,
        quantity: qtyVal,
        product_id: prodId,
        notes: formattedNotes,
        items: [
          {
            product_id: prodId,
            qty: qtyVal,
            unit_cost: costVal,
            batch_code: batchCode,
          },
        ],
      };
      successMsg = editingProcurement
        ? `Procurement invoice ${formData.invoiceNo} updated successfully!`
        : `Stock intake committed! Invoice ${formData.invoiceNo} saved with batch ${batchCode}.`;
    }

    try {
      let res;
      if (editingProcurement) {
        res = await fetch(`/api/procurements/${editingProcurement.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/procurements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Procurement operation failed' }));
        throw new Error(errData.error || 'Procurement operation failed');
      }

      addNotification('success', successMsg);
      setDrawerOpen(false);
      setEditingProcurement(null);
      setConsignmentItems([]);
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
            <IndianRupee className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-foreground">
            ₹{totalCapitalSpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredProcurements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
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
                      ₹{proc.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => openEditDrawer(proc)}
                        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary transition-colors cursor-pointer"
                        title={`Edit Invoice ${proc.invoiceNo}`}
                        aria-label={`Edit Invoice ${proc.invoiceNo}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Drawer for Stock Intake (New or Edit) */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingProcurement(null);
          setConsignmentItems([]);
        }}
        width={editingProcurement && consignmentItems.length > 1 ? 'xl' : 'md'}
        title={
          editingProcurement
            ? consignmentItems.length > 1
              ? `Consignment: ${formData.invoiceNo}`
              : 'Edit Stock Intake'
            : 'Record New Stock Intake'
        }
        description={
          editingProcurement
            ? consignmentItems.length > 1
              ? `Consignment manifest with ${consignmentProductsRollup.length} products and ${consignmentItems.length} inventory lots.`
              : 'Update procurement details, unit cost, or batch allocation.'
            : 'Register arrival of inventory lots with fluctuating acquisition costs.'
        }
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setDrawerOpen(false);
                setEditingProcurement(null);
                setConsignmentItems([]);
              }}
              className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : editingProcurement ? 'Save Changes' : 'Commit Intake & Create Lots'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                Procurement Date <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                value={formData.procurementDate}
                onChange={(e) => setFormData({ ...formData, procurementDate: e.target.value })}
                className={`w-full px-3.5 py-2.5 rounded-xl border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                  formErrors.procurementDate ? 'border-destructive' : 'border-border'
                }`}
              />
              {formErrors.procurementDate && (
                <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {formErrors.procurementDate}
                </p>
              )}
            </div>
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
                <div className="space-y-2">
                  <select
                    value={formData.supplierId}
                    onChange={(e) => {
                      const selId = e.target.value;
                      if (selId === '__custom__') {
                        setFormData((prev) => ({
                          ...prev,
                          supplierId: '__custom__',
                        }));
                      } else {
                        const selSup = suppliers.find((s) => String(s.id) === selId);
                        setFormData((prev) => ({
                          ...prev,
                          supplierId: selId,
                          supplierName: selSup ? selSup.name : prev.supplierName,
                          source: selSup?.source || prev.source,
                        }));
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">-- Select Registered Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.source})
                      </option>
                    ))}
                    <option value="__custom__">+ Custom / Unregistered Supplier</option>
                  </select>
                  {(formData.supplierId === '__custom__' || (formData.supplierId === '' && Boolean(formData.supplierName) && !suppliers.some((s) => s.name.toLowerCase() === formData.supplierName.toLowerCase()))) && (
                    <input
                      type="text"
                      value={formData.supplierName}
                      onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                      placeholder="Enter supplier / vendor name"
                      className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  )}
                </div>
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
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
              Notes / Consignment Remarks
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Initial stock intake from historical sales records or invoice remarks..."
              className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {isMultiItemConsignment ? (
            <div className="space-y-4 pt-2 border-t border-border">
              {/* Consignment Overview Banner */}
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Boxes className="w-5 h-5 text-primary" />
                    <h3 className="text-sm font-bold text-foreground">Consignment Inventory Manifest</h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                    {consignmentSummary.productsCount} Products &bull; {consignmentSummary.lotsCount} Batches
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="p-2.5 rounded-lg bg-card border border-border">
                    <div className="text-xs text-muted-foreground font-medium">Total Value</div>
                    <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{consignmentSummary.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-card border border-border">
                    <div className="text-xs text-muted-foreground font-medium">Initial Qty</div>
                    <div className="text-base font-bold text-foreground font-mono">
                      {consignmentSummary.totalQty.toLocaleString()} pcs
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-card border border-border">
                    <div className="text-xs text-muted-foreground font-medium">Remaining Stock</div>
                    <div className="text-base font-bold text-primary font-mono">
                      {consignmentSummary.totalRemaining.toLocaleString()} pcs
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-card border border-border">
                    <div className="text-xs text-muted-foreground font-medium">Channel</div>
                    <div className="text-sm font-semibold text-foreground truncate">
                      {formData.source}
                    </div>
                  </div>
                </div>
              </div>

              {/* View Tabs & Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-1 p-1 bg-muted rounded-lg border border-border">
                  <button
                    type="button"
                    onClick={() => setConsignmentTab('products')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      consignmentTab === 'products'
                        ? 'bg-card text-foreground shadow-xs font-bold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Catalogue Products ({consignmentSummary.productsCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setConsignmentTab('lots')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      consignmentTab === 'lots'
                        ? 'bg-card text-foreground shadow-xs font-bold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    All Lots ({consignmentSummary.lotsCount})
                  </button>
                </div>

                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={consignmentSearch}
                    onChange={(e) => setConsignmentSearch(e.target.value)}
                    placeholder="Filter products or batches..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Manifest Table */}
              <div className="border border-border rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                {consignmentTab === 'products' ? (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-muted/60 border-b border-border sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold text-muted-foreground">Product</th>
                        <th className="py-2.5 px-3 font-semibold text-muted-foreground text-center">Lots</th>
                        <th className="py-2.5 px-3 font-semibold text-muted-foreground text-right">Cost (Avg/Range)</th>
                        <th className="py-2.5 px-3 font-semibold text-muted-foreground text-right">Initial Qty</th>
                        <th className="py-2.5 px-3 font-semibold text-muted-foreground text-right">Remaining</th>
                        <th className="py-2.5 px-3 font-semibold text-muted-foreground text-right">Total Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredConsignmentProducts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-muted-foreground">
                            No products match filter &quot;{consignmentSearch}&quot;
                          </td>
                        </tr>
                      ) : (
                        filteredConsignmentProducts.map((p) => (
                          <tr key={p.productId} className="hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-3 font-medium text-foreground">
                              <div>{p.productName}</div>
                              <div className="text-[10px] text-muted-foreground font-mono">{p.sku}</div>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground border border-border">
                                {p.lotsCount}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono">
                              {p.minCost === p.maxCost
                                ? `₹${p.minCost.toFixed(2)}`
                                : `₹${p.minCost.toFixed(2)} - ₹${p.maxCost.toFixed(2)}`}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono">{p.totalInitialQty}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-primary">{p.totalRemainingQty}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-medium">
                              ₹{p.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-muted/60 border-b border-border sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold text-muted-foreground">Batch Code</th>
                        <th className="py-2.5 px-3 font-semibold text-muted-foreground">Product</th>
                        <th className="py-2.5 px-3 font-semibold text-muted-foreground text-right">Cost</th>
                        <th className="py-2.5 px-3 font-semibold text-muted-foreground text-right">Initial</th>
                        <th className="py-2.5 px-3 font-semibold text-muted-foreground text-right">Remaining</th>
                        <th className="py-2.5 px-3 font-semibold text-muted-foreground text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredConsignmentLots.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-muted-foreground">
                            No batches match filter &quot;{consignmentSearch}&quot;
                          </td>
                        </tr>
                      ) : (
                        filteredConsignmentLots.map((it: any) => {
                          const rem = parseFloat(it.remaining_qty ?? it.initial_qty ?? '0');
                          const isDepleted = rem <= 0;
                          return (
                            <tr key={it.id || it.batch_code} className="hover:bg-muted/30 transition-colors">
                              <td className="py-2 px-3 font-mono font-semibold text-foreground">{it.batch_code}</td>
                              <td className="py-2 px-3 text-foreground">{it.product_name}</td>
                              <td className="py-2 px-3 text-right font-mono">₹{parseFloat(it.unit_cost || '0').toFixed(2)}</td>
                              <td className="py-2 px-3 text-right font-mono">{it.initial_qty || it.qty}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-primary">{rem}</td>
                              <td className="py-2 px-3 text-center">
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                    isDepleted
                                      ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                                      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                  }`}
                                >
                                  {isDepleted ? 'Depleted' : 'Active'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : (
            <>
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
                    Unit Acquisition Cost (₹) <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
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
                    type="text"
                    inputMode="decimal"
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
            </>
          )}
        </form>
      </Drawer>
    </div>
  );
}
