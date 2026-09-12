'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  Package,
  Users,
  Building2,
  Tag,
  ArrowRight,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { fuzzyMatch } from '../lib/fuzzy';

interface GlobalSearchItem {
  id: string;
  type: 'product' | 'customer' | 'supplier' | 'category';
  title: string;
  subtitle: string;
  badge: string;
  url: string;
}

// Fallback seed data for global search index
const SEED_GLOBAL_ITEMS: GlobalSearchItem[] = [
  // Products
  {
    id: 'prod-1',
    type: 'product',
    title: 'Royal Basmati Rice 5kg',
    subtitle: 'SKU: RICE-BAS-5KG • Stock: 145 kg',
    badge: 'Product',
    url: '/catalogue',
  },
  {
    id: 'prod-2',
    type: 'product',
    title: 'Aashirvaad Whole Wheat Atta 10kg',
    subtitle: 'SKU: WHEAT-ATTA-10KG • Stock: 80 kg',
    badge: 'Product',
    url: '/catalogue',
  },
  {
    id: 'prod-3',
    type: 'product',
    title: 'Pure Mustard Oil Cold Pressed 1L',
    subtitle: 'SKU: OIL-MUST-1L • Stock: 12 liters',
    badge: 'Product',
    url: '/catalogue',
  },
  {
    id: 'prod-4',
    type: 'product',
    title: 'Organic Red Lentils (Masoor Dal) 1kg',
    subtitle: 'SKU: DAL-MASOOR-1KG • Stock: 65 kg',
    badge: 'Product',
    url: '/catalogue',
  },
  // Customers
  {
    id: 'cust-1',
    type: 'customer',
    title: 'Metro Supermarket',
    subtitle: 'purchasing@metrosuper.com • Credit: ₹25,000.00',
    badge: 'Customer',
    url: '/customers',
  },
  {
    id: 'cust-2',
    type: 'customer',
    title: 'Green Grocers Co.',
    subtitle: 'orders@greengrocers.org • Credit: ₹12,000.00',
    badge: 'Customer',
    url: '/customers',
  },
  {
    id: 'cust-3',
    type: 'customer',
    title: 'Downtown Gourmet Deli',
    subtitle: 'chef@downtowndeli.com • Credit: ₹5,000.00',
    badge: 'Customer',
    url: '/customers',
  },
  // Suppliers
  {
    id: 'sup-1',
    type: 'supplier',
    title: 'National Grain Distributors',
    subtitle: 'Wholesale Shop • Contact: Sarah Jenkins',
    badge: 'Supplier',
    url: '/suppliers',
  },
  {
    id: 'sup-2',
    type: 'supplier',
    title: 'Golden Harvest Milling',
    subtitle: 'Wholesale Shop • Contact: David Ross',
    badge: 'Supplier',
    url: '/suppliers',
  },
  {
    id: 'sup-3',
    type: 'supplier',
    title: 'BlinkSupply Rapid Delivery',
    subtitle: 'Quick Commerce • Same-day replenishment',
    badge: 'Supplier',
    url: '/suppliers',
  },
  // Categories
  {
    id: 'cat-1',
    type: 'category',
    title: 'Grains & Cereals',
    subtitle: 'Code: GRAINS • 8 assigned catalogue items',
    badge: 'Category',
    url: '/categories',
  },
  {
    id: 'cat-2',
    type: 'category',
    title: 'Basmati & Long Grain Rice',
    subtitle: 'Code: RICE-BASMATI • Subcategory of Grains',
    badge: 'Category',
    url: '/categories',
  },
  {
    id: 'cat-3',
    type: 'category',
    title: 'Oils & Condiments',
    subtitle: 'Code: OILS-COND • 6 assigned catalogue items',
    badge: 'Category',
    url: '/categories',
  },
];

export function GlobalSearchBar() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchIndex, setSearchIndex] = useState<GlobalSearchItem[]>(SEED_GLOBAL_ITEMS);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Global Cmd+K / Ctrl+K listener to focus search bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch live entities from backend if available
  useEffect(() => {
    Promise.all([
      fetch('/api/products').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/customers').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/suppliers').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/categories').then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([prods, custs, sups, cats]) => {
      const items: GlobalSearchItem[] = [];

      if (Array.isArray(prods) && prods.length > 0) {
        prods.forEach((p: any) => {
          items.push({
            id: `prod-${p.id}`,
            type: 'product',
            title: p.name,
            subtitle: `SKU: ${p.sku} • Category: ${p.category_name || p.category || 'General'}`,
            badge: 'Product',
            url: '/catalogue',
          });
        });
      }

      if (Array.isArray(custs) && custs.length > 0) {
        custs.forEach((c: any) => {
          items.push({
            id: `cust-${c.id}`,
            type: 'customer',
            title: c.name,
            subtitle: `${c.email || c.phone || 'Customer Account'} • Credit: ₹${parseFloat(c.credit_limit || c.creditLimit || '0').toLocaleString('en-IN')}`,
            badge: 'Customer',
            url: '/customers',
          });
        });
      }

      if (Array.isArray(sups) && sups.length > 0) {
        sups.forEach((s: any) => {
          items.push({
            id: `sup-${s.id}`,
            type: 'supplier',
            title: s.name,
            subtitle: `${s.source || 'Vendor'} • Contact: ${s.contact_person || s.contactPerson || 'Office'}`,
            badge: 'Supplier',
            url: '/suppliers',
          });
        });
      }

      if (Array.isArray(cats) && cats.length > 0) {
        cats.forEach((c: any) => {
          items.push({
            id: `cat-${c.id}`,
            type: 'category',
            title: c.name,
            subtitle: `Code: ${c.code || `CAT-${c.id}`}`,
            badge: 'Category',
            url: '/categories',
          });
        });
      }

      if (items.length > 0) {
        setSearchIndex(items);
      }
    });
  }, []);

  // Filtered matching items using typo-tolerant fuzzy matching
  const filteredResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim();

    return searchIndex
      .filter((item) => {
        return (
          fuzzyMatch(q, item.title) ||
          fuzzyMatch(q, item.subtitle) ||
          fuzzyMatch(q, item.badge)
        );
      })
      .slice(0, 8);
  }, [query, searchIndex]);

  const handleSelect = (item: GlobalSearchItem) => {
    setIsOpen(false);
    setQuery('');
    router.push(item.url);
  };

  const getItemIcon = (type: GlobalSearchItem['type']) => {
    switch (type) {
      case 'product':
        return <Package className="w-4 h-4 text-primary" />;
      case 'customer':
        return <Users className="w-4 h-4 text-blue-500" />;
      case 'supplier':
        return <Building2 className="w-4 h-4 text-amber-500" />;
      case 'category':
        return <Tag className="w-4 h-4 text-emerald-500" />;
    }
  };

  const getItemBadgeStyle = (type: GlobalSearchItem['type']) => {
    switch (type) {
      case 'product':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'customer':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'supplier':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'category':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    }
  };

  return (
    <div className="relative w-full max-w-xs sm:max-w-md md:max-w-lg">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Global search across catalogue, customers, suppliers..."
          className="w-full pl-9 pr-14 py-1.5 text-xs bg-muted/50 hover:bg-muted focus:bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
        />

        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setIsOpen(false);
              }}
              className="p-0.5 rounded text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-card border border-border text-[10px] font-mono text-muted-foreground font-semibold">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* Floating Dropdown Results */}
      {isOpen && query.trim() && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 top-full mt-2 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-border animate-in fade-in-50 zoom-in-95 duration-150 max-h-96 overflow-y-auto"
        >
          {filteredResults.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Search className="w-6 h-6 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-xs font-semibold text-foreground">No matching data found</p>
              <p className="text-[11px] mt-0.5">
                No catalogue items, customers, suppliers, or categories matched &ldquo;{query}&rdquo;.
              </p>
            </div>
          ) : (
            filteredResults.map((item, idx) => (
              <div
                key={item.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(item);
                }}
                className={`px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                  idx === selectedIndex ? 'bg-primary/5' : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center shrink-0">
                    {getItemIcon(item.type)}
                  </div>
                  <div className="truncate">
                    <div className="font-semibold text-xs text-foreground truncate">{item.title}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{item.subtitle}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getItemBadgeStyle(
                      item.type
                    )}`}
                  >
                    {item.badge}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
