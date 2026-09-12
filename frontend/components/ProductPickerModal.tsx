'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Package,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Boxes,
  Check,
  Filter,
  Sparkles,
} from 'lucide-react';
import { CatalogueProduct } from '../app/catalogue/page';

export interface PickerItemToAdd {
  product: CatalogueProduct;
  qty: number;
  salePrice: number;
}

interface ProductPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: CatalogueProduct[];
  onAddItems: (items: PickerItemToAdd[]) => void;
}

type SortField = 'name' | 'sku' | 'category' | 'currentStock' | 'lowestCost';
type SortOrder = 'asc' | 'desc';

import { fuzzyMatch } from '../lib/fuzzy';
export { fuzzyMatch };

export function ProductPickerModal({
  isOpen,
  onClose,
  products,
  onAddItems,
}: ProductPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedUnit, setSelectedUnit] = useState('ALL');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Quantities entered in the picker grid: productId -> quantity
  const [enteredQuantities, setEnteredQuantities] = useState<Record<number, number>>({});
  // Custom sale prices entered: productId -> price
  const [customPrices, setCustomPrices] = useState<Record<number, number>>({});

  const categories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.category)));
  }, [products]);

  const units = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.unit)));
  }, [products]);

  // Filter and fuzzy search
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (onlyInStock && p.currentStock <= 0) return false;
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
      if (selectedUnit !== 'ALL' && p.unit !== selectedUnit) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.trim();
      const matchName = fuzzyMatch(q, p.name);
      const matchSku = fuzzyMatch(q, p.sku);
      const matchCategory = fuzzyMatch(q, p.category);
      const matchBarcode = p.barcode ? p.barcode.includes(q) : false;

      return matchName || matchSku || matchCategory || matchBarcode;
    });
  }, [products, searchQuery, selectedCategory, selectedUnit, onlyInStock]);

  // Sort grid
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredProducts, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleQtyChange = (productId: number, qtyStr: string) => {
    const val = parseInt(qtyStr, 10);
    setEnteredQuantities((prev) => ({
      ...prev,
      [productId]: isNaN(val) ? 0 : Math.max(0, val),
    }));
  };

  const handlePriceChange = (productId: number, priceStr: string) => {
    const val = parseFloat(priceStr);
    setCustomPrices((prev) => ({
      ...prev,
      [productId]: isNaN(val) ? 0 : Math.max(0, val),
    }));
  };

  const itemsReadyToAdd = useMemo(() => {
    const items: PickerItemToAdd[] = [];
    for (const p of products) {
      const qty = enteredQuantities[p.id] || 0;
      if (qty > 0) {
        // default suggested price is lowestCost * 1.30 or minimum $5.00
        const defaultPrice = p.lowestCost > 0 ? parseFloat((p.lowestCost * 1.3).toFixed(2)) : 10.0;
        const price = customPrices[p.id] !== undefined ? customPrices[p.id] : defaultPrice;
        items.push({ product: p, qty, salePrice: price });
      }
    }
    return items;
  }, [products, enteredQuantities, customPrices]);

  const handleAddAllSelected = () => {
    if (itemsReadyToAdd.length === 0) return;
    onAddItems(itemsReadyToAdd);
    setEnteredQuantities({});
    onClose();
  };

  const handleAddSingleItem = (product: CatalogueProduct) => {
    const qty = enteredQuantities[product.id] || 1;
    const defaultPrice = product.lowestCost > 0 ? parseFloat((product.lowestCost * 1.3).toFixed(2)) : 10.0;
    const price = customPrices[product.id] !== undefined ? customPrices[product.id] : defaultPrice;

    onAddItems([{ product, qty, salePrice: price }]);
    setEnteredQuantities((prev) => ({ ...prev, [product.id]: 0 }));
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="picker-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-card border border-border rounded-3xl shadow-2xl flex flex-col z-10 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border bg-muted/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-md shadow-primary/20">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 id="picker-title" className="text-xl font-black tracking-tight text-foreground">
                Advanced Product Picker & Multi-Attribute Grid
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Typo-tolerant fuzzy search across catalogue items. Enter quantities directly to add to the active sale.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Close picker modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Multi-Attribute Filter Bar */}
        <div className="p-4 border-b border-border bg-card/60 space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Fuzzy Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Fuzzy search by name (e.g. 'bsmt', 'wht'), SKU, barcode, or category..."
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* In-Stock Toggle */}
            <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none shrink-0 px-3 py-2 rounded-xl bg-muted/60 border border-border hover:bg-muted">
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => setOnlyInStock(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary"
              />
              <span>In Stock Only ({products.filter((p) => p.currentStock > 0).length})</span>
            </label>
          </div>

          {/* Category & Unit Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
              Category:
            </span>
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                selectedCategory === 'ALL'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              All ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat}
              </button>
            ))}

            <div className="h-3 w-px bg-border mx-1" />

            <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
              Unit:
            </span>
            <button
              type="button"
              onClick={() => setSelectedUnit('ALL')}
              className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                selectedUnit === 'ALL'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              All
            </button>
            {units.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setSelectedUnit(u)}
                className={`px-2 py-0.5 rounded-md font-medium transition-all ${
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

        {/* Sortable Data Grid */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur-md border-b border-border text-xs uppercase text-muted-foreground font-semibold tracking-wider z-10">
              <tr>
                <th
                  onClick={() => handleSort('name')}
                  className="px-6 py-3.5 cursor-pointer hover:text-foreground select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Product Item</span>
                    {sortField === 'name' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('sku')}
                  className="px-4 py-3.5 cursor-pointer hover:text-foreground select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>SKU / Barcode</span>
                    {sortField === 'sku' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('category')}
                  className="px-4 py-3.5 cursor-pointer hover:text-foreground select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Category & Unit</span>
                    {sortField === 'category' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('currentStock')}
                  className="px-4 py-3.5 cursor-pointer hover:text-foreground select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>In-Stock / Status</span>
                    {sortField === 'currentStock' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('lowestCost')}
                  className="px-4 py-3.5 cursor-pointer hover:text-foreground select-none text-right"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Lowest Cost</span>
                    {sortField === 'lowestCost' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3.5 text-center">Add Qty & Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <Package className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="font-semibold text-foreground">No products match your fuzzy search</p>
                    <p className="text-xs mt-1">Try relaxing your search terms or toggling filters.</p>
                  </td>
                </tr>
              ) : (
                sortedProducts.map((p) => {
                  const qtyEntered = enteredQuantities[p.id] || 0;
                  const isDepleted = p.currentStock <= 0;
                  const isLow = p.currentStock > 0 && p.currentStock <= p.minStock;

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-muted/30 transition-colors ${
                        qtyEntered > 0 ? 'bg-primary/5' : ''
                      }`}
                    >
                      {/* Product Name */}
                      <td className="px-6 py-3.5">
                        <div className="font-semibold text-foreground">{p.name}</div>
                        {p.description && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {p.description}
                          </div>
                        )}
                      </td>

                      {/* SKU / Barcode */}
                      <td className="px-4 py-3.5 font-mono text-xs">
                        <span className="px-2 py-0.5 rounded bg-muted text-foreground border border-border">
                          {p.sku}
                        </span>
                        {p.barcode && (
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {p.barcode}
                          </div>
                        )}
                      </td>

                      {/* Category & Unit */}
                      <td className="px-4 py-3.5 text-xs">
                        <span className="font-medium text-foreground">{p.category}</span>
                        <span className="ml-2 font-mono text-[11px] px-1.5 py-0.2 rounded bg-muted/60 text-muted-foreground border border-border">
                          {p.unit}
                        </span>
                      </td>

                      {/* Stock / Health Badge */}
                      <td className="px-4 py-3.5">
                        {isDepleted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                            <XCircle className="w-3 h-3" />
                            <span>Depleted (0)</span>
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Low ({p.currentStock})</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>In Stock ({p.currentStock})</span>
                          </span>
                        )}
                      </td>

                      {/* Lowest Batch Cost */}
                      <td className="px-4 py-3.5 text-right font-mono text-xs font-bold text-foreground">
                        ${p.lowestCost > 0 ? p.lowestCost.toFixed(2) : '0.00'}
                      </td>

                      {/* Add Qty & Action */}
                      <td className="px-6 py-3.5">
                        <div className="flex items-center justify-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max={p.currentStock > 0 ? p.currentStock : 999}
                            value={qtyEntered === 0 ? '' : qtyEntered}
                            onChange={(e) => handleQtyChange(p.id, e.target.value)}
                            placeholder="Qty"
                            disabled={isDepleted}
                            className="w-16 px-2 py-1.5 text-center text-xs font-semibold rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-40"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddSingleItem(p)}
                            disabled={isDepleted}
                            className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-primary transition-all cursor-pointer"
                            title={`Add ${p.name} to sale`}
                          >
                            <Plus className="w-4 h-4" />
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

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground">
            Showing <strong className="text-foreground">{sortedProducts.length}</strong> of{' '}
            <strong className="text-foreground">{products.length}</strong> catalogue products.
            {itemsReadyToAdd.length > 0 && (
              <span className="ml-2 font-bold text-primary">
                ({itemsReadyToAdd.length} items with entered quantities ready)
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleAddAllSelected}
              disabled={itemsReadyToAdd.length === 0}
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-md shadow-primary/20 hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>
                Add Selected to Sale ({itemsReadyToAdd.reduce((acc, item) => acc + item.qty, 0)} units)
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
