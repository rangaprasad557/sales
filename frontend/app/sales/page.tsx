'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  ShoppingCart,
  Search,
  Plus,
  Trash2,
  SlidersHorizontal,
  Package,
  Layers,
  IndianRupee,
  TrendingUp,
  Receipt,
  User,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  X,
  Boxes,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { ProductPickerModal, PickerItemToAdd } from '../../components/ProductPickerModal';
import { ManualLotOverrideModal, LotAllocation, LotItem } from '../../components/ManualLotOverrideModal';
import { InvoiceReceiptModal, CompletedSaleRecord } from '../../components/InvoiceReceiptModal';
import { CatalogueProduct } from '../catalogue/page';
import { Customer } from '../customers/page';
import { useUIStore } from '../../store/useUIStore';

interface CartItem {
  id: string; // unique cart entry key
  product: CatalogueProduct;
  qty: number;
  salePrice: number;
  allocationType: 'AUTO_LOWEST_COST' | 'MANUAL_OVERRIDE';
  manualAllocations?: LotAllocation[];
}

const SEED_CATALOGUE_DATA: CatalogueProduct[] = [
  {
    id: 1,
    name: 'Royal Basmati Rice 5kg',
    sku: 'RICE-BAS-5KG',
    category: 'Grains & Cereals',
    unit: 'kg',
    currentStock: 145,
    minStock: 25,
    lowestCost: 3.8,
    barcode: '8901234567890',
  },
  {
    id: 2,
    name: 'Aashirvaad Whole Wheat Atta 10kg',
    sku: 'WHEAT-ATTA-10KG',
    category: 'Grains & Cereals',
    unit: 'kg',
    currentStock: 80,
    minStock: 20,
    lowestCost: 2.2,
    barcode: '8909876543210',
  },
  {
    id: 3,
    name: 'Pure Mustard Oil Cold Pressed 1L',
    sku: 'OIL-MUST-1L',
    category: 'Oils & Condiments',
    unit: 'liters',
    currentStock: 12,
    minStock: 15,
    lowestCost: 4.1,
    barcode: '8905551234567',
  },
  {
    id: 4,
    name: 'Organic Red Lentils (Masoor Dal) 1kg',
    sku: 'DAL-MASOOR-1KG',
    category: 'Grains & Cereals',
    unit: 'kg',
    currentStock: 65,
    minStock: 10,
    lowestCost: 1.95,
    barcode: '8903332221110',
  },
];

const SEED_CUSTOMERS_DATA: Customer[] = [
  {
    id: 1,
    name: 'Metro Supermarket',
    email: 'purchasing@metrosuper.com',
    phone: '+1 (555) 234-5678',
    creditLimit: 25000.0,
  },
  {
    id: 2,
    name: 'Green Grocers Co.',
    email: 'orders@greengrocers.org',
    phone: '+1 (555) 876-5432',
    creditLimit: 12000.0,
  },
  {
    id: 3,
    name: 'Downtown Gourmet Deli',
    email: 'chef@downtowndeli.com',
    phone: '+1 (555) 432-1098',
    creditLimit: 5000.0,
  },
];

export default function SalesPOSPage() {
  const [catalogue, setCatalogue] = useState<CatalogueProduct[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  // Quick Search & Autocomplete
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Active Sale / Cart
  const [cart, setCart] = useState<CartItem[]>([]);

  // Modals
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [overrideTargetItem, setOverrideTargetItem] = useState<CartItem | null>(null);
  const [completedSale, setCompletedSale] = useState<CompletedSaleRecord | null>(null);
  const [isReceiptOpen, setReceiptOpen] = useState(false);

  // Available lots mock/cache (initially clean/empty)
  const [lotsMap, setLotsMap] = useState<Record<number, LotItem[]>>({});

  const { addNotification } = useUIStore();

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter catalogue for Quick Search Autocomplete
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return catalogue
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.includes(q))
      )
      .slice(0, 8);
  }, [catalogue, searchQuery]);

  // Quick Add Item from Autocomplete dropdown
  const handleQuickAdd = (product: CatalogueProduct) => {
    if (product.currentStock <= 0) {
      addNotification('error', `Cannot add "${product.name}": item is depleted (0 in stock).`);
      return;
    }

    const existingIndex = cart.findIndex((item) => item.product.id === product.id);
    if (existingIndex >= 0) {
      const updated = [...cart];
      const newQty = updated[existingIndex].qty + 1;
      if (newQty > product.currentStock) {
        addNotification('warning', `Reached maximum available stock (${product.currentStock} ${product.unit}).`);
        return;
      }
      updated[existingIndex].qty = newQty;
      setCart(updated);
    } else {
      const defaultPrice = product.lowestCost > 0 ? parseFloat((product.lowestCost * 1.3).toFixed(2)) : 10.0;
      const newItem: CartItem = {
        id: `${Date.now()}-${product.id}`,
        product,
        qty: 1,
        salePrice: defaultPrice,
        allocationType: 'AUTO_LOWEST_COST',
      };
      setCart([...cart, newItem]);
    }

    setSearchQuery('');
    setSearchFocused(false);
    addNotification('success', `Added "${product.name}" to active sale.`);
  };

  // Load backend products and customers
  const fetchProducts = () => {
    fetch('/api/products')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        const list = data.products || data.data || (Array.isArray(data) ? data : []);
        setCatalogue(
          list.map((p: any) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            category: p.category_name || p.category || 'General',
            unit: p.unit || 'pcs',
            currentStock: parseFloat(p.stock || p.current_stock || p.total_stock || '0'),
            minStock: parseInt(p.min_stock || p.minStock || '5', 10),
            lowestCost: parseFloat(p.lowest_cost || p.lowestCost || '0'),
            barcode: p.barcode || '',
          }))
        );
      })
      .catch(() => {});
  };

  const fetchCustomers = () => {
    fetch('/api/customers')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        const list = data.customers || data.data || (Array.isArray(data) ? data : []);
        setCustomers(
          list.map((c: any) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            creditLimit: parseFloat(c.credit_limit || c.creditLimit || '0'),
          }))
        );
      })
      .catch(() => {});
  };

  const fetchInventory = () => {
    fetch('/api/inventory')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        const items = data.inventory || data.items || (Array.isArray(data) ? data : []);
        const map: Record<number, LotItem[]> = {};
        items.forEach((item: any) => {
          map[item.id] = (item.lots || []).map((l: any) => ({
            id: l.id,
            batchCode: l.batch_code || l.batchCode,
            unitCost: parseFloat(l.unit_cost || l.unitCost || '0'),
            remainingQty: parseFloat(l.remaining_qty || l.remainingQty || '0'),
            source: l.source || 'Wholesale Shop',
            procurementDate: l.procurement_date || l.procurementDate,
          }));
        });
        setLotsMap(map);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    fetchInventory();
  }, []);

  // Add items from Advanced Product Picker Grid
  const handleAddItemsFromPicker = (itemsToAdd: PickerItemToAdd[]) => {
    const newCart = [...cart];

    for (const item of itemsToAdd) {
      const existingIdx = newCart.findIndex((c) => c.product.id === item.product.id);
      if (existingIdx >= 0) {
        newCart[existingIdx].qty += item.qty;
        newCart[existingIdx].salePrice = item.salePrice;
      } else {
        newCart.push({
          id: `${Date.now()}-${item.product.id}-${Math.random()}`,
          product: item.product,
          qty: item.qty,
          salePrice: item.salePrice,
          allocationType: 'AUTO_LOWEST_COST',
        });
      }
    }

    setCart(newCart);
    addNotification('success', `Added ${itemsToAdd.length} items to the sale.`);
  };

  // Update Cart Item Quantity
  const handleUpdateQty = (cartId: string, qtyStr: string) => {
    const clean = qtyStr.replace(/[^0-9]/g, '');
    const val = parseInt(clean, 10);
    const qty = isNaN(val) ? 0 : val;

    setCart((prev) =>
      prev.map((item) => {
        if (item.id === cartId) {
          if (item.product.currentStock > 0 && qty > item.product.currentStock) {
            addNotification('warning', `Requested ${qty} exceeds available stock (${item.product.currentStock}).`);
            return { ...item, qty: item.product.currentStock };
          }
          return { ...item, qty };
        }
        return item;
      })
    );
  };

  // Update Cart Item Price
  const handleUpdatePrice = (cartId: string, priceStr: string) => {
    const val = parseFloat(priceStr);
    const price = isNaN(val) ? 0 : Math.max(0, val);
    setCart((prev) =>
      prev.map((item) => (item.id === cartId ? { ...item, salePrice: price } : item))
    );
  };

  // Remove Item from Cart
  const handleRemoveCartItem = (cartId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== cartId));
  };

  // Clear Cart
  const handleClearCart = () => {
    setCart([]);
  };

  // Compute Lowest-Cost-First (LCF) batch allocation preview for a cart item
  const computeLCFAllocation = (item: CartItem): { cogs: number; lotsPreview: LotAllocation[] } => {
    if (item.allocationType === 'MANUAL_OVERRIDE' && item.manualAllocations) {
      const cogs = item.manualAllocations.reduce((acc, l) => acc + l.qty * l.unitCost, 0);
      return { cogs, lotsPreview: item.manualAllocations };
    }

    // Auto LCF simulation
    const availableLots = [...(lotsMap[item.product.id] || [])].sort((a, b) => a.unitCost - b.unitCost);
    let remainingNeeded = item.qty;
    let totalCogs = 0;
    const allocatedLots: LotAllocation[] = [];

    for (const lot of availableLots) {
      if (remainingNeeded <= 0) break;
      const take = Math.min(lot.remainingQty, remainingNeeded);
      if (take > 0) {
        allocatedLots.push({
          lotId: lot.id,
          batchCode: lot.batchCode,
          unitCost: lot.unitCost,
          qty: take,
        });
        totalCogs += take * lot.unitCost;
        remainingNeeded -= take;
      }
    }

    // Fallback if not enough lots recorded: compute using item.product.lowestCost
    if (remainingNeeded > 0) {
      totalCogs += remainingNeeded * (item.product.lowestCost || 0);
    }

    return { cogs: totalCogs, lotsPreview: allocatedLots };
  };

  // Financial Rollups
  const cartSummary = useMemo(() => {
    let subtotal = 0;
    let totalCogs = 0;

    for (const item of cart) {
      const itemTotal = item.qty * item.salePrice;
      const { cogs } = computeLCFAllocation(item);
      subtotal += itemTotal;
      totalCogs += cogs;
    }

    const netProfit = subtotal - totalCogs;
    const marginPct = subtotal > 0 ? (netProfit / subtotal) * 100 : 0;

    return {
      subtotal,
      totalCogs,
      netProfit,
      marginPct,
      totalUnits: cart.reduce((acc, item) => acc + item.qty, 0),
    };
  }, [cart, lotsMap]);

  // Selected customer info
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || null;
  const isCreditExceeded = selectedCustomer && cartSummary.subtotal > selectedCustomer.creditLimit;

  // Checkout Execution
  const handleCheckout = async () => {
    if (cart.length === 0) return;

    const invoiceNo = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const itemsForSale = cart.map((item) => {
      const { cogs, lotsPreview } = computeLCFAllocation(item);
      const itemTotal = item.qty * item.salePrice;
      return {
        name: item.product.name,
        sku: item.product.sku,
        qty: item.qty,
        unit: item.product.unit,
        unitPrice: item.salePrice,
        totalPrice: itemTotal,
        totalCost: cogs,
        profit: itemTotal - cogs,
        lotsUsed: lotsPreview.map((l) => ({
          batchCode: l.batchCode,
          qty: l.qty,
          unitCost: l.unitCost,
        })),
      };
    });

    const record: CompletedSaleRecord = {
      invoiceNo,
      customerName: selectedCustomer ? selectedCustomer.name : 'Walk-in Retail Customer',
      saleDate: new Date().toISOString().slice(0, 10),
      totalAmount: cartSummary.subtotal,
      totalCogs: cartSummary.totalCogs,
      totalProfit: cartSummary.netProfit,
      items: itemsForSale,
    };

    // Persist sale to backend API and deduct inventory
    const salePayload = {
      invoice_no: invoiceNo,
      customer_id: selectedCustomerId || null,
      sale_date: new Date().toISOString().slice(0, 10),
      notes: `POS Sale. Customer: ${selectedCustomer ? selectedCustomer.name : 'Walk-in'}`,
      items: cart.map((item) => ({
        product_id: item.product.id,
        qty: item.qty,
        unit_sale_price: item.salePrice,
        allocation_mode: item.allocationType === 'MANUAL_OVERRIDE' ? 'MANUAL' : 'AUTO',
        manual_lots:
          item.allocationType === 'MANUAL_OVERRIDE' && item.manualAllocations
            ? item.manualAllocations.map((m) => ({ lot_id: m.lotId, qty: m.qty }))
            : undefined,
      })),
    };

    try {
      await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(salePayload),
      });
      fetchProducts();
      fetchInventory();
    } catch (e) {
      console.warn('Backend sale recording note:', e);
    }

    setCompletedSale(record);
    setReceiptOpen(true);
    setCart([]);
    addNotification('success', `Invoice ${invoiceNo} finalized and inventory updated.`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-medium text-xs uppercase tracking-wider mb-1">
            <ShoppingCart className="w-4 h-4" />
            <span>Point of Sale Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            POS Billing & Multi-Batch Allocation
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Catalogue-driven billing screen with automated Lowest-Cost-First multi-lot split & manual override.
          </p>
        </div>

        {/* Header Actions: Past Orders & Customer Selector */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/orders"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold shadow-xs focus-visible:ring-2 focus-visible:ring-primary transition-all cursor-pointer"
            title="View past orders and customer invoices"
            aria-label="View past orders and invoices"
          >
            <Receipt className="w-3.5 h-3.5 text-primary" />
            <span>Past Orders</span>
          </Link>

          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <select
              value={selectedCustomerId || ''}
              onChange={(e) =>
                setSelectedCustomerId(e.target.value ? parseInt(e.target.value, 10) : null)
              }
              className="pl-9 pr-8 py-2 rounded-xl text-xs font-semibold bg-card border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
            >
              <option value="">-- Walk-in Retail Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (Credit: ₹{c.creditLimit.toLocaleString()})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Credit Warning Banner if exceeded */}
      {isCreditExceeded && selectedCustomer && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <strong>Credit Limit Warning:</strong> Order subtotal (₹
              {cartSummary.subtotal.toFixed(2)}) exceeds authorized credit line of ₹
              {selectedCustomer.creditLimit.toLocaleString()} for {selectedCustomer.name}.
            </div>
          </div>
          <span className="font-bold text-amber-700 dark:text-amber-400 uppercase text-[11px] tracking-wider">
            Approval Required
          </span>
        </div>
      )}

      {/* Quick Search & Advanced Picker Trigger */}
      <div className="relative p-3.5 bg-card rounded-3xl border border-border shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Quick Search Input with live autocomplete */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              placeholder="Quick search & add product by name, SKU, category, or barcode..."
              className="w-full pl-11 pr-10 py-2.5 text-xs sm:text-sm bg-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Clear search"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Floating Autocomplete Dropdown */}
            {isSearchFocused && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-card border border-border rounded-2xl shadow-xl z-30 overflow-hidden divide-y divide-border">
                {searchResults.map((p) => {
                  const isDepleted = p.currentStock <= 0;
                  return (
                    <div
                      key={p.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleQuickAdd(p);
                      }}
                      className="p-3 hover:bg-muted/60 transition-colors flex items-center justify-between gap-4 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          <Package className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-foreground">{p.name}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-mono">{p.sku}</span>
                            <span>•</span>
                            <span>{p.category}</span>
                            <span>•</span>
                            <span className="font-bold text-primary">
                              ₹{p.lowestCost > 0 ? (p.lowestCost * 1.3).toFixed(2) : '10.00'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {isDepleted ? (
                          <span className="text-xs text-rose-600 font-semibold">Out of Stock</span>
                        ) : (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                            {p.currentStock} {p.unit} in stock
                          </span>
                        )}
                        <button
                          type="button"
                          disabled={isDepleted}
                          className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 disabled:opacity-30 cursor-pointer"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Advanced Multi-Attribute Picker Button */}
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground font-bold text-xs sm:text-sm hover:bg-primary/90 shadow-sm active:scale-95 transition-all shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Open Product Picker Grid</span>
          </button>
        </div>
      </div>

      {/* Main Billing Workspace (Active Cart & Allocation Lineage) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Line Items */}
        <div className="lg:col-span-2 rounded-3xl border border-border bg-card p-6 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-border">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">
                Active Sale Order ({cart.length} line items)
              </h2>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={handleClearCart}
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Order</span>
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
              <div className="w-16 h-16 rounded-3xl bg-muted/60 flex items-center justify-center mb-4">
                <ShoppingCart className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-base font-bold text-foreground">Sale Order is Empty</p>
              <p className="text-xs max-w-sm mt-1">
                Use the quick search box above or open the Advanced Product Picker Grid to add items to the sale.
              </p>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="mt-5 px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold transition-all border border-primary/20 cursor-pointer"
              >
                Open Product Picker Grid
              </button>
            </div>
          ) : (
            <div className="space-y-4 flex-1 overflow-y-auto">
              {cart.map((item) => {
                const { cogs, lotsPreview } = computeLCFAllocation(item);
                const lineTotal = item.qty * item.salePrice;
                const lineProfit = lineTotal - cogs;
                const marginPct = lineTotal > 0 ? (lineProfit / lineTotal) * 100 : 0;

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl border border-border bg-card hover:border-primary/30 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-bold text-foreground text-sm">{item.product.name}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span className="font-mono">{item.product.sku}</span>
                          <span>•</span>
                          <span>{item.product.category}</span>
                          <span>•</span>
                          <span>Unit: {item.product.unit}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveCartItem(item.id)}
                        className="p-1 text-muted-foreground hover:text-destructive rounded-lg transition-colors"
                        title="Remove line item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Inputs & Price Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-border">
                      <div className="flex items-center gap-4">
                        {/* Qty Input */}
                        <div className="flex items-center gap-1.5">
                          <label className="text-xs font-semibold text-muted-foreground">Qty:</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={item.qty}
                            onChange={(e) => handleUpdateQty(item.id, e.target.value)}
                            className="w-16 px-2.5 py-1 text-center text-xs font-bold rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                          />
                          <span className="text-xs text-muted-foreground">{item.product.unit}</span>
                        </div>

                        {/* Unit Sale Price */}
                        <div className="flex items-center gap-1.5">
                          <label className="text-xs font-semibold text-muted-foreground">Price:</label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                              ₹
                            </span>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={item.salePrice}
                              onChange={(e) => handleUpdatePrice(item.id, e.target.value)}
                              className="w-20 pl-5 pr-2 py-1 text-right text-xs font-bold rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Line Financials */}
                      <div className="text-right">
                        <div className="text-sm font-black text-foreground font-mono">
                          ₹{lineTotal.toFixed(2)}
                        </div>
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          Est. Profit: +₹{lineProfit.toFixed(2)} ({marginPct.toFixed(0)}%)
                        </div>
                      </div>
                    </div>

                    {/* Multi-Batch Allocation Attribution & Override Trigger */}
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 overflow-x-auto">
                        <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider shrink-0">
                          {item.allocationType === 'AUTO_LOWEST_COST' ? 'Auto LCF Lots:' : 'Manual Lots:'}
                        </span>
                        {lotsPreview.length === 0 ? (
                          <span className="text-muted-foreground/60 italic">Standard acquisition</span>
                        ) : (
                          lotsPreview.map((lot, idx) => (
                            <span
                              key={idx}
                              className="font-mono text-[11px] px-2 py-0.5 rounded bg-card text-foreground border border-border shrink-0"
                            >
                              {lot.batchCode} ({lot.qty} @ ₹{lot.unitCost.toFixed(2)})
                            </span>
                          ))
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setOverrideTargetItem(item)}
                        className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 shrink-0 ml-2"
                      >
                        <Layers className="w-3 h-3" />
                        <span>Override Batches</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Real-time Order Summary & Checkout Card */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground pb-3 border-b border-border flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-primary" />
              <span>Financial Allocation Summary</span>
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Units Billed:</span>
                <span className="font-bold text-foreground">{cartSummary.totalUnits} items</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Estimated Acquisition Cost (COGS):</span>
                <span className="font-mono font-semibold text-foreground">
                  ₹{cartSummary.totalCogs.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Estimated Net Profit:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  +₹{cartSummary.netProfit.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Gross Profit Margin:</span>
                <span className="font-mono font-bold text-primary">
                  {cartSummary.marginPct.toFixed(1)}%
                </span>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between">
                <span className="text-base font-bold text-foreground">Order Subtotal:</span>
                <span className="text-2xl font-black font-mono text-foreground">
                  ₹{cartSummary.subtotal.toFixed(2)}
                </span>
              </div>
            </div>

            {selectedCustomer && (
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="font-bold text-foreground">{selectedCustomer.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Credit Line:</span>
                  <span className="font-mono font-semibold text-foreground">
                    ₹{selectedCustomer.creditLimit.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full py-3.5 px-6 rounded-2xl bg-primary text-primary-foreground font-black text-base shadow-lg shadow-primary/25 hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Receipt className="w-5 h-5" />
            <span>Complete Sale & Print Receipt</span>
          </button>
        </div>
      </div>

      {/* Advanced Product Picker Modal */}
      <ProductPickerModal
        isOpen={isPickerOpen}
        onClose={() => setPickerOpen(false)}
        products={catalogue}
        onAddItems={handleAddItemsFromPicker}
      />

      {/* Manual Lot Override Modal */}
      {overrideTargetItem && (
        <ManualLotOverrideModal
          isOpen={Boolean(overrideTargetItem)}
          onClose={() => setOverrideTargetItem(null)}
          productName={overrideTargetItem.product.name}
          productId={overrideTargetItem.product.id}
          requiredQty={overrideTargetItem.qty}
          unit={overrideTargetItem.product.unit}
          availableLots={lotsMap[overrideTargetItem.product.id] || []}
          currentAllocations={overrideTargetItem.manualAllocations || []}
          onSaveOverrides={(allocs) => {
            setCart((prev) =>
              prev.map((item) =>
                item.id === overrideTargetItem.id
                  ? {
                      ...item,
                      allocationType: 'MANUAL_OVERRIDE',
                      manualAllocations: allocs,
                    }
                  : item
              )
            );
            addNotification(
              'success',
              `Manual batch override applied to ${overrideTargetItem.product.name}.`
            );
          }}
          onResetToAutoLCF={() => {
            setCart((prev) =>
              prev.map((item) =>
                item.id === overrideTargetItem.id
                  ? {
                      ...item,
                      allocationType: 'AUTO_LOWEST_COST',
                      manualAllocations: undefined,
                    }
                  : item
              )
            );
            addNotification('info', `Reverted ${overrideTargetItem.product.name} to Auto Lowest-Cost-First.`);
          }}
        />
      )}

      {/* Printable Invoice Receipt Modal */}
      <InvoiceReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setReceiptOpen(false)}
        sale={completedSale}
      />
    </div>
  );
}
