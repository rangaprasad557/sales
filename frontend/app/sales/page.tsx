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
  Calendar,
  RefreshCw,
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
  qtyStr?: string;
  priceStr?: string;
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
  },
  {
    id: 2,
    name: 'Green Grocers Co.',
    email: 'orders@greengrocers.org',
    phone: '+1 (555) 876-5432',
  },
  {
    id: 3,
    name: 'Downtown Gourmet Deli',
    email: 'chef@downtowndeli.com',
    phone: '+1 (555) 432-1098',
  },
];

export default function SalesPOSPage() {
  const [catalogue, setCatalogue] = useState<CatalogueProduct[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [saleDate, setSaleDate] = useState<string>('');
  const [customerError, setCustomerError] = useState(false);
  const [dateError, setDateError] = useState(false);

  // Quick Search & Autocomplete
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Navigation refs for fluid cashier Enter key progression
  const qtyInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const priceInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);

  // Active Sale / Cart
  const [cart, setCart] = useState<CartItem[]>([]);

  // Modals
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [overrideTargetItem, setOverrideTargetItem] = useState<CartItem | null>(null);
  const [completedSale, setCompletedSale] = useState<CompletedSaleRecord | null>(null);
  const [isReceiptOpen, setReceiptOpen] = useState(false);

  // Available lots mock/cache (initially clean/empty)
  const [lotsMap, setLotsMap] = useState<Record<number, LotItem[]>>({});

  const { currentUser, addNotification } = useUIStore();

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

    let targetId = '';
    const existingIndex = cart.findIndex((item) => item.product.id === product.id);
    if (existingIndex >= 0) {
      const updated = [...cart];
      const newQty = updated[existingIndex].qty + 1;
      if (newQty > product.currentStock) {
        addNotification('warning', `Reached maximum available stock (${product.currentStock} ${product.unit}).`);
        return;
      }
      updated[existingIndex].qty = newQty;
      updated[existingIndex].qtyStr = String(newQty);
      targetId = updated[existingIndex].id;
      setCart(updated);
    } else {
      const defaultPrice =
        product.salePrice && product.salePrice > 0
          ? product.salePrice
          : product.lowestCost > 0
          ? parseFloat((product.lowestCost * 1.3).toFixed(2))
          : 10.0;
      targetId = `${Date.now()}-${product.id}`;
      const newItem: CartItem = {
        id: targetId,
        product,
        qty: 1,
        qtyStr: '1',
        salePrice: defaultPrice,
        priceStr: defaultPrice.toFixed(2),
        allocationType: 'AUTO_LOWEST_COST',
      };
      setCart((prev) => [...prev, newItem]);
    }

    setSearchQuery('');
    setSearchFocused(false);
    addNotification('success', `Added "${product.name}" to active sale.`);

    // Auto-focus the added line item's quantity input
    setTimeout(() => {
      const el = qtyInputRefs.current[targetId];
      if (el) {
        el.focus();
        el.select();
      }
    }, 60);
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
            salePrice: parseFloat(p.sale_price || p.salePrice || p.default_sale_price || '0'),
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
        const newQty = newCart[existingIdx].qty + item.qty;
        newCart[existingIdx].qty = newQty;
        newCart[existingIdx].qtyStr = String(newQty);
        newCart[existingIdx].salePrice = item.salePrice;
        newCart[existingIdx].priceStr = item.salePrice.toFixed(2);
      } else {
        newCart.push({
          id: `${Date.now()}-${item.product.id}-${Math.random()}`,
          product: item.product,
          qty: item.qty,
          qtyStr: String(item.qty),
          salePrice: item.salePrice,
          priceStr: item.salePrice.toFixed(2),
          allocationType: 'AUTO_LOWEST_COST',
        });
      }
    }

    setCart(newCart);
    addNotification('success', `Added ${itemsToAdd.length} items to the sale.`);
  };

  // Update Cart Item Quantity with string buffer for unconstrained typing
  const handleUpdateQty = (cartId: string, rawStr: string) => {
    const clean = rawStr.replace(/[^0-9]/g, '');
    const val = clean === '' ? 0 : parseInt(clean, 10);

    setCart((prev) =>
      prev.map((item) => {
        if (item.id === cartId) {
          if (item.product.currentStock > 0 && val > item.product.currentStock) {
            addNotification('info', `Requested ${val} exceeds active stock (${item.product.currentStock}). Deficit will be fulfilled via backlog.`);
          }
          return { ...item, qty: val, qtyStr: clean };
        }
        return item;
      })
    );
  };

  // On blur, normalize quantity to at least 1
  const handleBlurQty = (cartId: string) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === cartId) {
          const finalQty = Math.max(1, item.qty);
          return { ...item, qty: finalQty, qtyStr: String(finalQty) };
        }
        return item;
      })
    );
  };

  // Update Cart Item Price with string buffer for fluid decimal typing
  const handleUpdatePrice = (cartId: string, rawStr: string) => {
    let clean = rawStr.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    if (parts.length > 2) {
      clean = parts[0] + '.' + parts.slice(1).join('');
    }
    const val = parseFloat(clean);
    const price = isNaN(val) ? 0 : Math.max(0, val);

    setCart((prev) =>
      prev.map((item) => {
        if (item.id === cartId) {
          return { ...item, salePrice: price, priceStr: clean };
        }
        return item;
      })
    );
  };

  // On blur, format price to 2 decimals
  const handleBlurPrice = (cartId: string) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === cartId) {
          return { ...item, priceStr: item.salePrice.toFixed(2) };
        }
        return item;
      })
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
  const computeLCFAllocation = (item: CartItem): { cogs: number; lotsPreview: LotAllocation[]; shortQty: number } => {
    if (item.allocationType === 'MANUAL_OVERRIDE' && item.manualAllocations) {
      const cogs = item.manualAllocations.reduce((acc, l) => acc + l.qty * l.unitCost, 0);
      const allocatedQty = item.manualAllocations.reduce((acc, l) => acc + l.qty, 0);
      return { cogs, lotsPreview: item.manualAllocations, shortQty: Math.max(0, item.qty - allocatedQty) };
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

    const shortQty = Math.max(0, remainingNeeded);
    // Fallback if not enough lots recorded: compute using item.product.lowestCost
    if (remainingNeeded > 0) {
      totalCogs += remainingNeeded * (item.product.lowestCost || 0);
    }

    return { cogs: totalCogs, lotsPreview: allocatedLots, shortQty };
  };

  // Financial Rollups
  const cartSummary = useMemo(() => {
    let subtotal = 0;
    let totalCogs = 0;
    let totalShort = 0;

    for (const item of cart) {
      const itemTotal = item.qty * item.salePrice;
      const { cogs, shortQty } = computeLCFAllocation(item);
      subtotal += itemTotal;
      totalCogs += cogs;
      totalShort += shortQty;
    }

    const netProfit = subtotal - totalCogs;
    const marginPct = subtotal > 0 ? (netProfit / subtotal) * 100 : 0;

    return {
      subtotal,
      totalCogs,
      netProfit,
      marginPct,
      totalShort,
      totalUnits: cart.reduce((acc, item) => acc + item.qty, 0),
    };
  }, [cart, lotsMap]);

  // Selected customer info
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || null;

  // Checkout Execution
  const handleCheckout = async () => {
    if (cart.length === 0 || isSubmittingSale) return;

    // Validate mandatory customer selection
    if (!selectedCustomerId) {
      setCustomerError(true);
      addNotification('error', 'Please select a customer. Customer selection is required to complete the sale.');
      return;
    }

    // Validate mandatory sale date selection
    if (!saleDate || !saleDate.trim()) {
      setDateError(true);
      addNotification('error', 'Please select a sale order date. Order date is required to complete the sale.');
      return;
    }

    // Validate if any item has 0 or invalid qty
    const invalidItem = cart.find((it) => it.qty <= 0);
    if (invalidItem) {
      addNotification('error', `Cannot complete sale: "${invalidItem.product.name}" has invalid quantity (must be > 0).`);
      return;
    }

    setIsSubmittingSale(true);
    const timestamp = Date.now().toString().slice(-6);
    const randomEntropy = Math.floor(100 + Math.random() * 900);
    const invoiceNo = `INV-${saleDate.replace(/-/g, '')}-${timestamp}-${randomEntropy}`;

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
      customerName: selectedCustomer ? selectedCustomer.name : 'Unknown Customer',
      saleDate: saleDate,
      soldBy: currentUser?.name || 'Store Staff',
      totalAmount: cartSummary.subtotal,
      totalCogs: cartSummary.totalCogs,
      totalProfit: cartSummary.netProfit,
      items: itemsForSale,
    };

    // Persist sale to backend API and deduct inventory
    const salePayload = {
      invoice_no: invoiceNo,
      customer_id: selectedCustomerId,
      sale_date: saleDate,
      sold_by: currentUser?.name || 'Store Staff',
      notes: `POS Sale. Customer: ${selectedCustomer ? selectedCustomer.name : 'Customer #' + selectedCustomerId}`,
      allow_backlog: true,
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
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(salePayload),
      });

      const resData = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(resData.error || `Server responded with status ${res.status}`);
      }

      fetchProducts();
      fetchInventory();

      setCompletedSale(record);
      setReceiptOpen(true);
      setCart([]);
      setSelectedCustomerId(null);
      setSaleDate('');
      setCustomerError(false);
      setDateError(false);
      addNotification('success', `Invoice ${invoiceNo} finalized and inventory updated.`);
    } catch (e: any) {
      console.error('Sale finalization error:', e);
      addNotification('error', `Failed to finalize sale: ${e.message || 'Unknown server error'}`);
    } finally {
      setIsSubmittingSale(false);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-3.5">
      {/* Top Compact Bar: POS Billing Badge + Quick Search + Product Picker Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-card border border-border shadow-xs shrink-0">
          <ShoppingCart className="w-4 h-4 text-primary shrink-0" />
          <span className="font-bold text-xs text-foreground">POS Billing</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-primary/10 text-primary">
            {cart.length} {cart.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        {/* Quick Search & Advanced Picker in compact single row */}
        <div className="relative flex-1 flex items-center gap-2 min-w-0">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (searchResults.length > 0) {
                    e.preventDefault();
                    handleQuickAdd(searchResults[0]);
                  }
                } else if (e.key === 'ArrowDown') {
                  if (cart.length > 0) {
                    e.preventDefault();
                    qtyInputRefs.current[cart[0].id]?.focus();
                    qtyInputRefs.current[cart[0].id]?.select();
                  }
                }
              }}
              placeholder="Quick search & add product by name, SKU, category, or barcode..."
              className="w-full pl-9 pr-8 h-9 text-xs sm:text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Clear search"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Floating Autocomplete Dropdown */}
            {isSearchFocused && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-card border border-border rounded-2xl shadow-xl z-30 overflow-hidden divide-y divide-border">
                {searchResults.map((p) => {
                  const isDepleted = p.currentStock <= 0;
                  return (
                    <div
                      key={p.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleQuickAdd(p);
                      }}
                      className="p-2.5 hover:bg-muted/60 transition-colors flex items-center justify-between gap-4 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          <Package className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-foreground truncate">{p.name}</div>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <span className="font-mono">{p.sku}</span>
                            <span>•</span>
                            <span>{p.category}</span>
                            <span>•</span>
                            <span className="font-bold text-primary">
                              ₹{p.salePrice && p.salePrice > 0
                                ? p.salePrice.toFixed(2)
                                : p.lowestCost > 0
                                ? (p.lowestCost * 1.3).toFixed(2)
                                : '10.00'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        {isDepleted ? (
                          <span className="text-[10px] text-rose-600 font-semibold">Out of Stock</span>
                        ) : (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                            {p.currentStock} {p.unit} in stock
                          </span>
                        )}
                        <button
                          type="button"
                          disabled={isDepleted}
                          className="px-2 py-0.5 rounded-md bg-primary text-primary-foreground text-[11px] font-bold hover:bg-primary/90 disabled:opacity-30 cursor-pointer"
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

          {/* Advanced Multi-Attribute Picker Trigger */}
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="h-9 px-3.5 sm:px-4 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 shadow-sm active:scale-95 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary select-none"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Product Picker</span>
            <span className="sm:hidden">Picker</span>
          </button>
        </div>
      </div>

      {/* Main Billing Workspace (Left: High-Density Active Cart | Right: Customer/Date & Financial Summary) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4 items-start">
        {/* Active Line Items Grid */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-3.5 sm:p-4 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-border">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" />
              <h2 className="text-xs sm:text-sm font-bold text-foreground">
                Active Sale Order ({cart.length} {cart.length === 1 ? 'line item' : 'line items'})
              </h2>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={handleClearCart}
                className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Order</span>
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
                <ShoppingCart className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-bold text-foreground">Sale Order is Empty</p>
              <p className="text-xs max-w-sm mt-0.5 text-muted-foreground">
                Quick search above or open the Product Picker Grid to add items.
              </p>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="mt-3.5 px-3.5 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold transition-all border border-primary/20 cursor-pointer"
              >
                Open Product Picker Grid
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[calc(100vh-210px)] overflow-y-auto pr-1">
              {cart.map((item, index) => {
                const { cogs, lotsPreview, shortQty } = computeLCFAllocation(item);
                const lineTotal = item.qty * item.salePrice;
                const lineProfit = lineTotal - cogs;
                const marginPct = lineTotal > 0 ? (lineProfit / lineTotal) * 100 : 0;

                return (
                  <div
                    key={item.id}
                    className="p-2.5 sm:p-3 rounded-xl border border-border bg-card hover:border-primary/40 transition-all space-y-1.5"
                  >
                    {/* Tier 1: Product Header + Inputs + Total + Delete (Responsive on Mobile) */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
                      {/* Product Header: Name + Unit + SKU + Category + Mobile Delete */}
                      <div className="flex items-start sm:items-center justify-between gap-2 min-w-0 flex-1">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                            <span className="font-bold text-xs sm:text-sm text-foreground" title={item.product.name}>
                              {item.product.name}
                            </span>
                            <span className="text-[10px] font-semibold text-muted-foreground px-1.5 py-0.2 rounded bg-muted shrink-0">
                              {item.product.unit}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground truncate">
                            <span className="font-mono">{item.product.sku}</span>
                            <span>•</span>
                            <span>{item.product.category}</span>
                            {shortQty > 0 && (
                              <span className="text-amber-600 dark:text-amber-400 font-bold ml-1">
                                Backlog: {shortQty.toFixed(1)} {item.product.unit}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Mobile Delete button (visible only < sm) */}
                        <button
                          type="button"
                          onClick={() => handleRemoveCartItem(item.id)}
                          className="sm:hidden p-1 text-muted-foreground hover:text-destructive rounded transition-colors cursor-pointer shrink-0"
                          title="Remove item"
                          aria-label={`Remove ${item.product.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Controls: Qty input, Price input, Total, Desktop Delete */}
                      <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 pt-1 sm:pt-0 border-t sm:border-t-0 border-border/40 shrink-0">
                        {/* Qty */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-semibold text-muted-foreground">Qty:</span>
                          <input
                            ref={(el) => { qtyInputRefs.current[item.id] = el; }}
                            type="text"
                            inputMode="numeric"
                            value={item.qtyStr !== undefined ? item.qtyStr : item.qty}
                            onChange={(e) => handleUpdateQty(item.id, e.target.value)}
                            onBlur={() => handleBlurQty(item.id)}
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (e.shiftKey) {
                                  if (index > 0) {
                                    priceInputRefs.current[cart[index - 1].id]?.focus();
                                    priceInputRefs.current[cart[index - 1].id]?.select();
                                  } else {
                                    searchInputRef.current?.focus();
                                    searchInputRef.current?.select();
                                  }
                                } else {
                                  priceInputRefs.current[item.id]?.focus();
                                  priceInputRefs.current[item.id]?.select();
                                }
                              }
                            }}
                            aria-label={`Quantity for ${item.product.name}`}
                            className="w-12 sm:w-14 h-7 text-center text-xs font-bold rounded-md border border-border bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        {/* Price */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-semibold text-muted-foreground">Price:</span>
                          <div className="relative">
                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">₹</span>
                            <input
                              ref={(el) => { priceInputRefs.current[item.id] = el; }}
                              type="text"
                              inputMode="decimal"
                              value={item.priceStr !== undefined ? item.priceStr : item.salePrice.toFixed(2)}
                              onChange={(e) => handleUpdatePrice(item.id, e.target.value)}
                              onBlur={() => handleBlurPrice(item.id)}
                              onFocus={(e) => e.target.select()}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (e.shiftKey) {
                                    qtyInputRefs.current[item.id]?.focus();
                                    qtyInputRefs.current[item.id]?.select();
                                  } else {
                                    if (index < cart.length - 1) {
                                      qtyInputRefs.current[cart[index + 1].id]?.focus();
                                      qtyInputRefs.current[cart[index + 1].id]?.select();
                                    } else {
                                      searchInputRef.current?.focus();
                                      searchInputRef.current?.select();
                                    }
                                  }
                                }
                              }}
                              aria-label={`Sell Price for ${item.product.name}`}
                              className="w-16 sm:w-20 pl-4 pr-1.5 h-7 text-right text-xs font-bold rounded-md border border-border bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                        </div>

                        {/* Line Total */}
                        <div className="text-right min-w-[60px] sm:min-w-[75px]">
                          <div className="text-xs sm:text-sm font-black text-foreground font-mono tabular-nums">
                            ₹{lineTotal.toFixed(2)}
                          </div>
                        </div>

                        {/* Desktop Delete button (visible only sm+) */}
                        <button
                          type="button"
                          onClick={() => handleRemoveCartItem(item.id)}
                          className="hidden sm:inline-flex p-1 text-muted-foreground hover:text-destructive rounded transition-colors cursor-pointer"
                          title="Remove item"
                          aria-label={`Remove ${item.product.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Tier 2: LCF Lot Allocation Details & Profit */}
                    <div className="pt-1.5 border-t border-border/60 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 overflow-x-auto min-w-0 pr-2">
                        <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider shrink-0">
                          {item.allocationType === 'AUTO_LOWEST_COST' ? 'LCF Lots:' : 'Manual:'}
                        </span>
                        {lotsPreview.length === 0 ? (
                          <span className="text-muted-foreground/60 italic text-[10px]">Standard acquisition</span>
                        ) : (
                          lotsPreview.map((lot, idx) => (
                            <span
                              key={idx}
                              className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-muted text-foreground border border-border shrink-0"
                            >
                              {lot.batchCode} ({lot.qty} @ ₹{lot.unitCost.toFixed(2)})
                            </span>
                          ))
                        )}
                        {shortQty > 0 && (
                          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0 font-semibold">
                            Stock backlog: {shortQty.toFixed(1)} {item.product.unit} (billed at latest cost ₹{item.product.lowestCost.toFixed(2)})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                          {lineProfit >= 0 ? '+' : ''}₹{lineProfit.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setOverrideTargetItem(item)}
                          className="p-1 text-primary hover:bg-primary/10 rounded-md transition-colors cursor-pointer"
                          title="Manual lot override"
                          aria-label={`Manual lot override for ${item.product.name}`}
                        >
                          <Layers className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Sidebar: Card 1 (Customer & Date) + Card 2 (Financial Summary) */}
        <div className="space-y-3 sticky top-16">
          {/* Card 1: Mandatory Customer & Order Date Selection (Blank by default) */}
          <div
            className={`p-3.5 rounded-2xl border bg-card shadow-xs transition-colors ${
              customerError || dateError
                ? 'border-rose-500/80 ring-2 ring-rose-500/20'
                : 'border-border'
            }`}
          >
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-border">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-primary" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Customer & Order Date
                </h2>
              </div>
              <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider bg-rose-500/10 px-1.5 py-0.5 rounded">
                * Required
              </span>
            </div>

            <div className="space-y-2.5">
              {/* Customer Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                  Customer <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <select
                    value={selectedCustomerId || ''}
                    onChange={(e) => {
                      setSelectedCustomerId(e.target.value ? parseInt(e.target.value, 10) : null);
                      if (e.target.value) setCustomerError(false);
                    }}
                    className={`w-full pl-8 pr-3 h-8.5 rounded-lg text-xs font-semibold bg-background border text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-xs transition-colors cursor-pointer ${
                      customerError && !selectedCustomerId
                        ? 'border-rose-500 ring-2 ring-rose-500/20'
                        : 'border-border'
                    }`}
                  >
                    <option value="">-- Select Customer (Required) * --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {customerError && !selectedCustomerId && (
                  <p className="text-[10px] font-semibold text-rose-500 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>Customer selection is required</span>
                  </p>
                )}
                {selectedCustomer && (
                  <div className="mt-1 px-2 py-0.5 rounded bg-muted/60 text-[10px] text-muted-foreground flex items-center justify-between">
                    <span className="font-semibold text-foreground truncate">{selectedCustomer.name}</span>
                    {selectedCustomer.phone && <span className="font-mono">{selectedCustomer.phone}</span>}
                  </div>
                )}
              </div>

              {/* Order Date Picker */}
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                  Sale Date <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    type="date"
                    value={saleDate}
                    onChange={(e) => {
                      setSaleDate(e.target.value);
                      if (e.target.value) setDateError(false);
                    }}
                    aria-label="Sale Order Date"
                    className={`w-full pl-8 pr-3 h-8.5 rounded-lg text-xs font-semibold bg-background border text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-xs cursor-pointer transition-colors ${
                      dateError && !saleDate
                        ? 'border-rose-500 ring-2 ring-rose-500/20'
                        : 'border-border'
                    }`}
                  />
                </div>
                {dateError && !saleDate && (
                  <p className="text-[10px] font-semibold text-rose-500 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>Sale order date is required</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Financial Allocation Summary & Complete Sale */}
          <div className="p-3.5 rounded-2xl border border-border bg-card shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-1.5">
                <IndianRupee className="w-3.5 h-3.5 text-primary" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Financial Summary
                </h2>
              </div>
              <span className="text-xs font-mono font-bold text-foreground">
                {cartSummary.totalUnits} {cartSummary.totalUnits === 1 ? 'item' : 'items'}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Acquisition Cost (COGS):</span>
                <span className="font-mono font-semibold text-foreground">
                  ₹{cartSummary.totalCogs.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Estimated Net Profit:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  +₹{cartSummary.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Profit Margin:</span>
                <span className="font-mono font-bold text-primary">
                  {cartSummary.marginPct.toFixed(1)}%
                </span>
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between">
                <span className="text-sm font-black text-foreground">Order Subtotal:</span>
                <span className="text-xl font-black font-mono text-foreground">
                  ₹{cartSummary.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCheckout}
              disabled={cart.length === 0 || isSubmittingSale}
              className="w-full mt-1 py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-black text-xs sm:text-sm shadow-md shadow-primary/25 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-40 transition-all flex items-center justify-center gap-2 cursor-pointer select-none"
            >
              {isSubmittingSale ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Receipt className="w-4 h-4" />
              )}
              <span>{isSubmittingSale ? 'Processing Sale...' : 'Complete Sale & Print Receipt'}</span>
            </button>
          </div>
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
