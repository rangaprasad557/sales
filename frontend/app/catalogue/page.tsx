'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Tag,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Barcode,
  Layers,
  Sparkles,
  ArrowUpDown,
  Filter,
  IndianRupee,
  Boxes,
  Archive,
  AlertCircle,
  RefreshCw,
  Edit2,
  Trash2,
  PlusCircle,
  Calendar,
} from 'lucide-react';
import { Drawer } from '../../components/Drawer';
import { useUIStore } from '../../store/useUIStore';

export interface CatalogueProduct {
  id: number;
  name: string;
  sku: string;
  category: string;
  categoryId?: number;
  unit: string;
  currentStock: number;
  minStock: number;
  lowestCost: number;
  latestProcurementCost?: number;
  latestProcurementDate?: string;
  latestSupplierSource?: string;
  totalProcuredQty?: number;
  barcode?: string;
  description?: string;
}

const UNITS_OF_MEASURE = ['pcs', 'kg', 'box', 'liters', 'bundle', 'pack'];

export default function CataloguePage() {
  const [products, setProducts] = useState<CatalogueProduct[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedUnit, setSelectedUnit] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'LOW' | 'DEPLETED'>('ALL');
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CatalogueProduct | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addNotification } = useUIStore();

  // Quick Restock Modal State
  const [restockProduct, setRestockProduct] = useState<CatalogueProduct | null>(null);
  const [restockQty, setRestockQty] = useState('50');
  const [restockCost, setRestockCost] = useState('0');
  const [restockSource, setRestockSource] = useState('Wholesale Shop');
  const [restockDate, setRestockDate] = useState(new Date().toISOString().slice(0, 10));
  const [isSubmittingRestock, setIsSubmittingRestock] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'General',
    unit: 'pcs',
    minStock: '10',
    barcode: '',
    description: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch from backend API
  const fetchProducts = () => {
    fetch('/api/products')
      .then((res) => {
        if (!res.ok) throw new Error('API unavailable');
        return res.json();
      })
      .then((data) => {
        const list = data.products || data.data || (Array.isArray(data) ? data : []);
        const mapped = list.map((p: any) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          category: p.category_name || p.category || 'General',
          categoryId: p.category_id || p.categoryId,
          unit: p.unit || 'pcs',
          currentStock: parseFloat(p.stock || p.current_stock || p.total_stock || '0'),
          minStock: parseInt(p.min_stock || p.minStock || '5', 10),
          lowestCost: parseFloat(p.lowest_cost || p.lowestCost || '0'),
          latestProcurementCost: parseFloat(p.latest_procurement_cost || p.latestProcurementCost || p.lowest_cost || '0'),
          latestProcurementDate: p.latest_procurement_date || '',
          latestSupplierSource: p.latest_supplier_source || '',
          totalProcuredQty: parseFloat(p.total_procured_qty || '0'),
          barcode: p.barcode || '',
          description: p.description || '',
        }));
        setProducts(mapped);
      })
      .catch(() => {});
  };

  const fetchCategories = () => {
    fetch('/api/categories')
      .then((res) => {
        if (!res.ok) throw new Error('API unavailable');
        return res.json();
      })
      .then((data) => {
        const list = data.categories || data.data || (Array.isArray(data) ? data : []);
        const names = list.map((c: any) => c.name).filter(Boolean);
        if (names.length > 0) {
          setAvailableCategories(names);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const categories = Array.from(
    new Set([
      ...availableCategories,
      ...products.map((p) => p.category),
      'Grains & Cereals',
      'Oils & Condiments',
      'Packaged Foods & Snacks',
      'Electronics',
      'Beverages',
      'General',
    ])
  ).filter(Boolean);

  // Stock status derivation
  const getProductStatus = (p: CatalogueProduct): 'ACTIVE' | 'LOW_STOCK' | 'DEPLETED' => {
    if (p.currentStock <= 0) return 'DEPLETED';
    if (p.currentStock <= p.minStock) return 'LOW_STOCK';
    return 'ACTIVE';
  };

  const filteredProducts = products.filter((p) => {
    const status = getProductStatus(p);
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && status === 'ACTIVE') ||
      (statusFilter === 'LOW' && status === 'LOW_STOCK') ||
      (statusFilter === 'DEPLETED' && status === 'DEPLETED');

    const matchesCategory =
      selectedCategory === 'ALL' || p.category === selectedCategory;

    const matchesUnit = selectedUnit === 'ALL' || p.unit === selectedUnit;

    const q = searchQuery.toLowerCase();
    const matchesQuery =
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.includes(q)) ||
      p.category.toLowerCase().includes(q);

    return matchesStatus && matchesCategory && matchesUnit && matchesQuery;
  });

  const openCreateDrawer = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      sku: '',
      category: categories[0] || 'General',
      unit: 'pcs',
      minStock: '10',
      barcode: '',
      description: '',
    });
    setFormErrors({});
    setDrawerOpen(true);
  };

  const openEditDrawer = (product: CatalogueProduct) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      category: product.category,
      unit: product.unit,
      minStock: String(product.minStock),
      barcode: product.barcode || '',
      description: product.description || '',
    });
    setFormErrors({});
    setDrawerOpen(true);
  };

  const handleGenerateSku = () => {
    if (!formData.name) return;
    const clean = formData.name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 14);
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    setFormData((prev) => ({ ...prev, sku: `${clean}-${randomSuffix}` }));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) {
      errors.name = 'Product name is required';
      addNotification('error', 'Product title is required');
    }
    const minVal = parseInt(formData.minStock, 10);
    if (isNaN(minVal) || minVal < 0) {
      errors.minStock = 'Minimum stock threshold must be 0 or higher';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    const minVal = parseInt(formData.minStock, 10);
    const finalSku = (
      formData.sku.trim() ||
      `${formData.name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 10)}-${Math.floor(100 + Math.random() * 900)}`
    ).toUpperCase();

    const payload = {
      name: formData.name.trim(),
      sku: finalSku,
      category: formData.category,
      unit: formData.unit,
      min_stock: minVal,
      minStock: minVal,
      barcode: formData.barcode.trim(),
      description: formData.description.trim(),
    };

    try {
      if (editingProduct) {
        // Update existing product via PUT
        const res = await fetch(`/api/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: 'Update failed' }));
          throw new Error(errData.error || 'Update failed');
        }
        addNotification('success', `Product "${formData.name.trim()}" updated successfully.`);
      } else {
        // Create new product via POST
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: 'Creation failed' }));
          throw new Error(errData.error || 'Creation failed');
        }
        addNotification('success', `Product "${formData.name.trim()}" added to catalogue.`);
      }

      setDrawerOpen(false);
      setEditingProduct(null);
      fetchProducts();
      fetchCategories();
    } catch (err: any) {
      addNotification('error', err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (product: CatalogueProduct) => {
    if (!confirm(`Delete product "${product.name}" (${product.sku})? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Delete failed' }));
        throw new Error(errData.error || 'Delete failed');
      }
      addNotification('success', `Product "${product.name}" deleted.`);
      fetchProducts();
    } catch (err: any) {
      addNotification('error', err.message || 'Delete failed');
    }
  };

  // Quick Restock Handlers
  const openRestockModal = (product: CatalogueProduct) => {
    setRestockProduct(product);
    setRestockQty('50');
    setRestockCost(
      (product.latestProcurementCost && product.latestProcurementCost > 0)
        ? product.latestProcurementCost.toFixed(2)
        : product.lowestCost > 0
        ? product.lowestCost.toFixed(2)
        : '100.00'
    );
    setRestockSource(product.latestSupplierSource || 'Wholesale Shop');
    setRestockDate(new Date().toISOString().slice(0, 10));
  };

  const handleExecuteRestock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!restockProduct) return;
    const qty = parseFloat(restockQty);
    const cost = parseFloat(restockCost);
    if (isNaN(qty) || qty <= 0) {
      addNotification('error', 'Please enter a valid restock quantity greater than 0.');
      return;
    }
    if (isNaN(cost) || cost < 0) {
      addNotification('error', 'Please enter a valid procurement cost.');
      return;
    }

    setIsSubmittingRestock(true);
    try {
      const res = await fetch('/api/procurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: restockSource,
          procurement_date: restockDate,
          notes: `Quick restock for ${restockProduct.name} (${restockProduct.sku})`,
          items: [
            {
              product_id: restockProduct.id,
              qty: qty,
              unit_cost: cost,
            },
          ],
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to intake stock');
      }

      addNotification(
        'success',
        `Successfully restocked ${qty} ${restockProduct.unit} of "${restockProduct.name}" at ₹${cost.toFixed(2)}/${restockProduct.unit}.`
      );
      setRestockProduct(null);
      fetchProducts();
    } catch (err: any) {
      addNotification('error', err.message || 'Restock failed');
    } finally {
      setIsSubmittingRestock(false);
    }
  };

  // Stock status badges with icon + label + border (color-blind safe)
  const renderStatusBadge = (status: 'ACTIVE' | 'LOW_STOCK' | 'DEPLETED', current: number, min: number) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>In Stock</span>
          </span>
        );
      case 'LOW_STOCK':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock</span>
          </span>
        );
      case 'DEPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5" />
            <span>Depleted (0)</span>
          </span>
        );
    }
  };

  // Metrics
  const totalCount = products.length;
  const activeCount = products.filter((p) => getProductStatus(p) === 'ACTIVE').length;
  const lowCount = products.filter((p) => getProductStatus(p) === 'LOW_STOCK').length;
  const depletedCount = products.filter((p) => getProductStatus(p) === 'DEPLETED').length;
  const totalUnitsOnHand = products.reduce((acc, p) => acc + p.currentStock, 0);
  const totalValuation = products.reduce(
    (acc, p) => acc + p.currentStock * (p.latestProcurementCost || p.lowestCost || 0),
    0
  );

  return (
    <div className="space-y-3.5 sm:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Package className="w-4 h-4" />
            </div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              Product Catalogue & Rates
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Unified view of product masters, wholesale procurement rates, active stock on hand, and fast replenishment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchProducts}
            className="h-8.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-bold text-foreground transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
            title="Refresh catalogue data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={openCreateDrawer}
            className="h-8.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add to Catalogue</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="p-3 sm:p-3.5 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Catalogue Items</span>
            <Package className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="text-base sm:text-lg xl:text-xl font-black text-foreground font-mono tracking-tight">{totalCount}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Total registered SKUs</p>
        </div>

        <div className="p-3 sm:p-3.5 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Available Stock</span>
            <Boxes className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-base sm:text-lg xl:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
            {totalUnitsOnHand} <span className="text-xs font-semibold text-muted-foreground">units</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Active inventory on hand</p>
        </div>

        <div className="p-3 sm:p-3.5 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Stock Health</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-base sm:text-lg xl:text-xl font-black text-foreground font-mono tracking-tight">
            {activeCount} <span className="text-xs font-semibold text-muted-foreground">in stock</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {depletedCount} depleted • {lowCount} low stock
          </p>
        </div>

        <div className="p-3 sm:p-3.5 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Inventory Valuation</span>
            <IndianRupee className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="text-base sm:text-lg xl:text-xl font-black text-foreground font-mono tracking-tight">
            ₹{totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Valued at procurement cost</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-2.5 p-2.5 sm:p-3 bg-card rounded-2xl border border-border shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search catalogue by product name, SKU code, barcode, or category..."
              className="w-full h-8.5 pl-9 pr-3 py-1 text-xs bg-transparent border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
            {(['ALL', 'ACTIVE', 'LOW', 'DEPLETED'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {st === 'ALL' ? 'All Items' : st === 'ACTIVE' ? 'In Stock' : st === 'LOW' ? 'Low Stock' : 'Depleted'}
              </button>
            ))}
          </div>
        </div>

        {/* Category & Unit Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mr-1">
            Category:
          </span>
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-2 py-0.5 rounded-lg text-xs font-medium transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 rounded-lg text-xs font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat}
            </button>
          ))}

          <div className="h-3.5 w-px bg-border mx-1.5" />

          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mr-1">
            Unit:
          </span>
          <button
            type="button"
            onClick={() => setSelectedUnit('ALL')}
            className={`px-1.5 py-0.5 rounded-md text-xs font-medium transition-all ${
              selectedUnit === 'ALL'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            All
          </button>
          {UNITS_OF_MEASURE.map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setSelectedUnit(u)}
              className={`px-1.5 py-0.5 rounded-md text-xs font-medium transition-all ${
                selectedUnit === u
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {/* Unified Catalogue Table */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-muted/50 border-b border-border text-[11px] uppercase text-muted-foreground font-semibold tracking-wider">
              <tr>
                <th className="px-3.5 py-2">Product Details</th>
                <th className="px-3 py-2">SKU / Barcode</th>
                <th className="px-3 py-2">Category & Unit</th>
                <th className="px-3 py-2">Procurement Rate (Cost)</th>
                <th className="px-3 py-2">Current Stock</th>
                <th className="px-3 py-2">Stock Status</th>
                <th className="px-3.5 py-2 text-center">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    <Package className="w-8 h-8 mx-auto mb-1.5 text-muted-foreground/50" />
                    <p className="font-semibold text-foreground">No products match your criteria</p>
                    <p className="text-xs mt-0.5">Try relaxing filters or add new items to the catalogue.</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const status = getProductStatus(product);
                  const effectiveProcRate =
                    (product.latestProcurementCost && product.latestProcurementCost > 0)
                      ? product.latestProcurementCost
                      : product.lowestCost;

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      {/* Product Name & Description */}
                      <td className="px-3.5 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-muted/60 border border-border flex items-center justify-center font-bold text-primary shrink-0 shadow-xs">
                            <Package className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-foreground block group-hover:text-primary transition-colors text-xs sm:text-sm">
                              {product.name}
                            </span>
                            {product.description ? (
                              <span className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                                {product.description}
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground/70 italic">
                                Standard Catalogue Item
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* SKU / Barcode */}
                      <td className="px-3 py-2.5">
                        <div className="space-y-0.5">
                          <span className="inline-block font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-muted text-foreground border border-border">
                            {product.sku}
                          </span>
                          {product.barcode && (
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Barcode className="w-3 h-3" />
                              <span>{product.barcode}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Category & Unit */}
                      <td className="px-3 py-2.5">
                        <div className="space-y-0.5 text-xs">
                          <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                            <Tag className="w-3 h-3 text-primary" />
                            {product.category}
                          </span>
                          <span className="block font-mono text-[10px] px-1 py-0.2 rounded bg-muted/60 text-muted-foreground border border-border w-fit">
                            Unit: {product.unit}
                          </span>
                        </div>
                      </td>

                      {/* Procurement Rate (Cost Price) */}
                      <td className="px-3 py-2.5">
                        {effectiveProcRate > 0 ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-0.5 text-xs sm:text-sm font-mono font-black text-foreground">
                              <IndianRupee className="w-3 h-3 text-primary" />
                              <span>{effectiveProcRate.toFixed(2)}</span>
                              <span className="text-[10px] text-muted-foreground font-normal ml-0.5">
                                /{product.unit}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Calendar className="w-2.5 h-2.5" />
                              <span>
                                {product.latestProcurementDate
                                  ? product.latestProcurementDate
                                  : 'Historical baseline'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground/60 italic">
                            No procurement recorded
                          </div>
                        )}
                      </td>

                      {/* Current Stock */}
                      <td className="px-3 py-2.5">
                        <div className="space-y-0.5">
                          <div className="text-xs sm:text-sm font-black font-mono text-foreground">
                            {product.currentStock}{' '}
                            <span className="text-[11px] font-normal text-muted-foreground">
                              {product.unit}
                            </span>
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Alert at &le; {product.minStock} {product.unit}
                          </div>
                        </div>
                      </td>

                      {/* Stock Status Badge */}
                      <td className="px-3 py-2.5">
                        {renderStatusBadge(status, product.currentStock, product.minStock)}
                      </td>

                      {/* Quick Actions */}
                      <td className="px-3.5 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openRestockModal(product)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 focus-visible:ring-2 focus-visible:ring-emerald-500 transition-all cursor-pointer shadow-2xs"
                            title={`Quick restock ${product.name}`}
                          >
                            <PlusCircle className="w-3 h-3" />
                            <span>Restock</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditDrawer(product)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary transition-colors cursor-pointer"
                            title={`Edit ${product.name}`}
                            aria-label={`Edit ${product.name}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(product)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-destructive transition-colors cursor-pointer"
                            title={`Delete ${product.name}`}
                            aria-label={`Delete ${product.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Quick Restock Modal */}
      {restockProduct && (
        <div
          className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="restock-title"
        >
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setRestockProduct(null)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl z-10 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-border bg-muted/40 flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <PlusCircle className="w-5 h-5 text-emerald-500" />
                <span id="restock-title">Quick Restock Batch</span>
              </div>
              <button
                type="button"
                onClick={() => setRestockProduct(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleExecuteRestock} className="p-6 space-y-4">
              <div className="p-3 rounded-xl bg-muted/50 border border-border">
                <div className="font-bold text-foreground text-sm">{restockProduct.name}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span className="font-mono">{restockProduct.sku}</span>
                  <span>•</span>
                  <span>Unit: {restockProduct.unit}</span>
                  <span>•</span>
                  <span>Current Stock: {restockProduct.currentStock}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                    Restock Quantity ({restockProduct.unit}) <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={restockQty}
                    onChange={(e) => setRestockQty(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                    Procurement Cost (₹/{restockProduct.unit}) <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={restockCost}
                    onChange={(e) => setRestockCost(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                    Procurement Source
                  </label>
                  <select
                    value={restockSource}
                    onChange={(e) => setRestockSource(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Wholesale Shop">Wholesale Shop</option>
                    <option value="Quick Commerce">Quick Commerce</option>
                    <option value="E-Commerce">E-Commerce</option>
                    <option value="Direct Distributor">Direct Distributor</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                    Procurement Date
                  </label>
                  <input
                    type="date"
                    value={restockDate}
                    onChange={(e) => setRestockDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">Total Batch Cost:</span>
                <span className="font-mono font-black text-foreground text-sm">
                  ₹
                  {((parseFloat(restockQty) || 0) * (parseFloat(restockCost) || 0)).toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRestockProduct(null)}
                  className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRestock}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingRestock ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Intaking...</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      <span>Confirm & Intake Stock</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slide-over Drawer for Add/Edit Product */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingProduct ? `Edit Product: ${editingProduct.name}` : 'Add Product to Catalogue'}
        description={editingProduct ? 'Modify master SKU, category mapping, unit of measure, and replenishment threshold.' : 'Configure master SKU, category mapping, unit of measure, and replenishment threshold.'}
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
              {isSubmitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Save Product'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
              Product Title <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Royal Basmati Rice 5kg"
              className={`w-full px-3.5 py-2.5 rounded-xl border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                formErrors.name ? 'border-destructive' : 'border-border'
              }`}
            />
            {formErrors.name && (
              <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {formErrors.name}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                SKU (Stock Keeping Unit) <span className="text-destructive">*</span>
              </label>
              <button
                type="button"
                onClick={handleGenerateSku}
                className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
              >
                <Sparkles className="w-3 h-3" />
                Auto-generate
              </button>
            </div>
            <input
              type="text"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
              placeholder="e.g. RICE-BAS-5KG"
              className={`w-full px-3.5 py-2.5 rounded-xl border font-mono bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                formErrors.sku ? 'border-destructive' : 'border-border'
              }`}
            />
            {formErrors.sku && (
              <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {formErrors.sku}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                Min Stock Threshold
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={formData.minStock}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setFormData({ ...formData, minStock: val });
                }}
                placeholder="10"
                className={`w-full px-3.5 py-2.5 rounded-xl border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                  formErrors.minStock ? 'border-destructive' : 'border-border'
                }`}
              />
              {formErrors.minStock && (
                <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {formErrors.minStock}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
              Unit of Measure
            </label>
            <div className="flex flex-wrap gap-2">
              {UNITS_OF_MEASURE.map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => setFormData({ ...formData, unit })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    formData.unit === unit
                      ? 'bg-primary/10 border-primary text-primary shadow-xs'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {unit}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
              Barcode / GTIN / UPC (Optional)
            </label>
            <div className="relative">
              <Barcode className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                placeholder="8901234567890"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
              Description & Specifications
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Product origin, grading, grain length, packaging details..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </form>
      </Drawer>
    </div>
  );
}
