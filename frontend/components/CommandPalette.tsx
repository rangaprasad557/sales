'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUIStore } from '../store/useUIStore';
import {
  Search,
  ShoppingCart,
  Package,
  Truck,
  Users,
  Building2,
  BarChart3,
  Moon,
  Sun,
  X,
  ArrowRight,
} from 'lucide-react';
import { useTheme } from 'next-themes';

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
}

export function CommandPalette() {
  const { isCommandPaletteOpen, setCommandPaletteOpen } = useUIStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      } else if (e.key === 'Escape' && isCommandPaletteOpen) {
        e.preventDefault();
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCommandPaletteOpen]);

  const items: CommandItem[] = [
    {
      id: 'pos',
      title: 'POS Billing View',
      subtitle: 'Open point of sale billing and product picker',
      category: 'Navigation',
      icon: ShoppingCart,
      action: () => {
        router.push('/');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'catalogue',
      title: 'Product Catalogue',
      subtitle: 'Manage inventory items, SKUs, and stock thresholds',
      category: 'Navigation',
      icon: Package,
      action: () => {
        router.push('/catalogue');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'procurement',
      title: 'Procurement Intake',
      subtitle: 'Record stock intake from Wholesale, Quick Comm, or E-Comm',
      category: 'Navigation',
      icon: Truck,
      action: () => {
        router.push('/procurement');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'analytics',
      title: 'Profit & Sales Analytics',
      subtitle: 'View day-to-year net profits, margins, and sales timelines',
      category: 'Navigation',
      icon: BarChart3,
      action: () => {
        router.push('/analytics');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'customers',
      title: 'Customer Directory',
      subtitle: 'Manage customer accounts, billing info, and credit limits',
      category: 'Navigation',
      icon: Users,
      action: () => {
        router.push('/customers');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'suppliers',
      title: 'Supplier Directory',
      subtitle: 'Manage vendor procurement contacts and payment terms',
      category: 'Navigation',
      icon: Building2,
      action: () => {
        router.push('/suppliers');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'toggle-theme',
      title: theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme',
      subtitle: 'Toggle between dark and light WCAG AAA color palettes',
      category: 'Preferences',
      icon: theme === 'dark' ? Sun : Moon,
      action: () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
        setCommandPaletteOpen(false);
      },
    },
  ];

  const filteredItems = items.filter(
    (it) =>
      it.title.toLowerCase().includes(query.toLowerCase()) ||
      it.subtitle.toLowerCase().includes(query.toLowerCase()) ||
      it.category.toLowerCase().includes(query.toLowerCase()),
  );

  const handleKeyDownInMenu = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    }
  };

  if (!isCommandPaletteOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => setCommandPaletteOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cmd-palette-title"
    >
      <div
        className="w-full max-w-xl bg-card text-foreground rounded-2xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDownInMenu}
      >
        <div className="flex items-center px-4 border-b border-border bg-muted/30">
          <Search className="w-5 h-5 text-muted-foreground mr-3 shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search modules... (Esc to close)"
            className="w-full py-4 bg-transparent text-foreground placeholder-muted-foreground text-sm font-medium focus:outline-none"
            aria-label="Search command palette"
          />
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(false)}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
            aria-label="Close command palette"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-border/40" role="listbox">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No matching commands or destinations found.
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-muted text-primary'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{item.title}</div>
                      <div
                        className={`text-xs ${
                          isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                        }`}
                      >
                        {item.subtitle}
                      </div>
                    </div>
                  </div>
                  <ArrowRight
                    className={`w-4 h-4 ${
                      isSelected ? 'text-primary-foreground' : 'text-muted-foreground/50'
                    }`}
                  />
                </div>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 bg-muted/40 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>Navigate with <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono">↑</kbd> <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono">↓</kbd></span>
          <span>Select with <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono">Enter</kbd></span>
          <span>Close with <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono">Esc</kbd></span>
        </div>
      </div>
    </div>
  );
}
