'use client';

import React, { useState, useEffect } from 'react';
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
  DollarSign,
  Boxes,
  Archive,
  AlertCircle,
  RefreshCw,
  Edit2,
  Trash2,
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
  barcode?: string;
  description?: string;
}

const UNITS_OF_MEASURE = ['pcs', 'kg', 'box', 'liters', 'bundle', 'pack'];

const SEED_CATALOGUE: CatalogueProduct[] = [
  {
    id: 1,
    name: 'Royal Basmati Rice 5kg',
    sku: 'RICE-BAS-5KG',
    category: 'Grains & Cereals',
    categoryId: 2,
    unit: 'kg',
    currentStock: 145,
    minStock: 25,
    lowestCost: 3.80,
    barcode: '8901234567890',
    description: 'Long-grain aged aromatic Basmati Rice premium harvest.',
  },
  {
    id: 2,
    name: 'Aashirvaad Whole Wheat Atta 10kg',
    sku: 'WHEAT-ATTA-10KG',
    category: 'Grains & Cereals',
    categoryId: 3,
    unit: 'kg',
    currentStock: 80,
    minStock: 20,
    lowestCost: 2.20,
    barcode: '8909876543210',
    description: '100% stone-ground whole wheat whole grain flour.',
  },
  {
    id: 3,
    name: 'Pure Mustard Oil Cold Pressed 1L',
    sku: 'OIL-MUST-1L',
    category: 'Oils & Condiments',
    categoryId: 5,
    unit: 'liters',
    currentStock: 12,
    minStock: 15,
    lowestCost: 4.10,
    barcode: '8905551234567',
    description: 'Traditional kachi ghani unrefined culinary mustard oil.',
  },
  {
    id: 4,
    name: 'Tata Salt Crystal Iodized 1kg',
    sku: 'SALT-IOD-1KG',
    category: 'Oils & Condiments',
    categoryId: 6,
    unit: 'pcs',
    currentStock: 0,
    minStock: 30,
    lowestCost: 0.75,
    barcode: '8904449876543',
    description: 'Vacuum-evaporated iodized table cooking salt.',
  },
  {
    id: 5,
    name: 'Organic Red Lentils (Masoor Dal) 1kg',
    sku: 'DAL-MASOOR-1KG',
    category: 'Grains & Cereals',
    categoryId: 1,
    unit: 'kg',
    currentStock: 65,
    minStock: 10,
    lowestCost: 1.95,
    barcode: '8903332221110',
    description: 'Split red lentils with high plant protein content.',
  },
];

export default function CataloguePage() {
  const [products, setProducts] = useState<CatalogueProduct[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedUnit, setSelectedUnit] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'LOW' | 'DEPLETED'>('ALL');
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CatalogueProduct | null>(null);
  const { addNotification } = useUIStore();

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
    if (!formData.name.trim()) errors.name = 'Product name is required';
    if (!formData.sku.trim()) errors.sku = 'SKU is required';
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

    const minVal = parseInt(formData.minStock, 10);
    const payload = {
      name: formData.name.trim(),
      sku: formData.sku.trim().toUpperCase(),
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

  // Stock status badges with icon + label + border (color-blind safe)
  const renderStatusBadge = (status: 'ACTIVE' | 'LOW_STOCK' | 'DEPLETED', current: number, min: number) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>In Stock ({current})</span>
          </span>
        );
      case 'LOW_STOCK':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock ({current} / min {min})</span>
          </span>
        );
      case 'DEPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5" />
            <span>Depleted (0 left)</span>
          </span>
        );
    }
  };

  // Metrics
  const totalCount = products.length;
  const activeCount = products.filter((p) => getProductStatus(p) === 'ACTIVE').length;
  const lowCount = products.filter((p) => getProductStatus(p) === 'LOW_STOCK').length;
  const depletedCount = products.filter((p) => getProductStatus(p) === 'DEPLETED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-medium text-xs uppercase tracking-wider mb-1">
            <Package className="w-4 h-4" />
            <span>Master Catalogue Module</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Product Catalogue
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage product identifiers, SKU taxonomy, units of measure, and min-stock alert thresholds.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateDrawer}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20 hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add to Catalogue</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Catalogue Items</span>
            <Package className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground">{totalCount}</div>
          <p className="text-xs text-muted-foreground mt-1">Total registered SKUs</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">In Stock (Active)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-foreground">{activeCount}</div>
          <p className="text-xs text-muted-foreground mt-1">Sufficient inventory</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Low Stock Alerts</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-foreground">{lowCount}</div>
          <p className="text-xs text-muted-foreground mt-1">Below minimum threshold</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Out of Stock</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-foreground">{depletedCount}</div>
          <p className="text-xs text-muted-foreground mt-1">Zero units on hand</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 p-3 bg-card rounded-2xl border border-border shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search catalogue by product name, SKU code, barcode, or category..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-transparent border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
            {(['ALL', 'ACTIVE', 'LOW', 'DEPLETED'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {st === 'ALL' ? 'All Stock' : st === 'ACTIVE' ? 'In Stock' : st === 'LOW' ? 'Low Stock' : 'Depleted'}
              </button>
            ))}
          </div>
        </div>

        {/* Category & Unit Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">
            Category:
          </span>
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
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
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat}
            </button>
          ))}

          <div className="h-4 w-px bg-border mx-2" />

          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">
            Unit:
          </span>
          <button
            type="button"
            onClick={() => setSelectedUnit('ALL')}
            className={`px-2 py-0.5 rounded-md text-xs font-medium transition-all ${
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
              className={`px-2 py-0.5 rounded-md text-xs font-medium transition-all ${
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

      {/* Catalogue Table */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground font-semibold tracking-wider">
              <tr>
                <th className="px-6 py-4">Product Details</th>
                <th className="px-6 py-4">SKU / Barcode</th>
                <th className="px-6 py-4">Category & Unit</th>
                <th className="px-6 py-4">Stock Status</th>
                <th className="px-6 py-4 text-right">Lowest Batch Cost</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <Package className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="font-medium text-foreground">No products match your criteria</p>
                    <p className="text-xs mt-1">Try relaxing filters or add new items to the catalogue.</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const status = getProductStatus(product);
                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center font-bold text-primary shrink-0 shadow-xs">
                            <Package className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="font-semibold text-foreground block group-hover:text-primary transition-colors">
                              {product.name}
                            </span>
                            {product.description && (
                              <span className="text-xs text-muted-foreground line-clamp-1">
                                {product.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <span className="inline-block font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted text-foreground border border-border">
                            {product.sku}
                          </span>
                          {product.barcode && (
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Barcode className="w-3.5 h-3.5" />
                              <span>{product.barcode}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1 text-xs">
                          <span className="inline-flex items-center gap-1 font-medium text-foreground">
                            <Tag className="w-3 h-3 text-primary" />
                            {product.category}
                          </span>
                          <span className="inline-block ml-2 text-[11px] font-mono px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border">
                            {product.unit}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {renderStatusBadge(status, product.currentStock, product.minStock)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {product.lowestCost > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-foreground">
                            <DollarSign className="w-3 h-3 text-muted-foreground" />
                            {product.lowestCost.toFixed(2)}
                            <span className="text-[10px] text-muted-foreground font-normal">
                              /{product.unit}
                            </span>
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/60 italic">No batches</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditDrawer(product)}
                            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary transition-colors"
                            title={`Edit ${product.name}`}
                            aria-label={`Edit ${product.name}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(product)}
                            className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-destructive transition-colors"
                            title={`Delete ${product.name}`}
                            aria-label={`Delete ${product.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
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
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
            >
              {editingProduct ? 'Update Product' : 'Save Product'}
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
                type="number"
                min="0"
                value={formData.minStock}
                onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
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
