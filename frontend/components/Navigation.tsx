'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShoppingCart,
  Package,
  Truck,
  BarChart3,
  Users,
  Building2,
  Menu,
  X,
  Search,
  Sparkles,
  LogIn,
  Layers,
} from 'lucide-react';
import { useUIStore } from '../store/useUIStore';
import { ThemeToggle } from './ThemeToggle';

export function Navigation() {
  const pathname = usePathname();
  const { isMobileSidebarOpen, setMobileSidebarOpen, toggleCommandPalette } = useUIStore();

  const navLinks = [
    { href: '/', label: 'Overview', icon: Sparkles },
    { href: '/sales', label: 'POS Billing', icon: ShoppingCart },
    { href: '/catalogue', label: 'Catalogue', icon: Package },
    { href: '/categories', label: 'Categories', icon: Layers },
    { href: '/procurement', label: 'Procurement', icon: Truck },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/customers', label: 'Customers', icon: Users },
    { href: '/suppliers', label: 'Suppliers', icon: Building2 },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Open mobile navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link href="/" className="flex items-center gap-2.5 font-black text-lg tracking-tight text-foreground group">
              <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="leading-none">Apex POS</span>
                <span className="text-[10px] font-medium text-primary uppercase tracking-wider">Multi-Batch</span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1" aria-label="Main Navigation">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-primary/10 text-primary border border-primary/20 shadow-xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Cmd+K shortcut button */}
            <button
              type="button"
              onClick={toggleCommandPalette}
              className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-muted/70 hover:bg-muted border border-border text-xs text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              aria-label="Open command palette"
            >
              <div className="flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5" />
                <span>Search...</span>
              </div>
              <kbd className="px-1.5 py-0.5 rounded bg-card border border-border text-[10px] font-mono text-foreground font-semibold shadow-2xs">
                ⌘K
              </kbd>
            </button>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Sign In Link */}
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign In</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden bg-black/60 backdrop-blur-sm animate-in fade-in"
          onClick={() => setMobileSidebarOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation drawer"
        >
          <div
            className="fixed inset-y-0 left-0 w-72 bg-card border-r border-border p-6 shadow-2xl flex flex-col justify-between animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-border">
                <div className="flex items-center gap-2 font-black text-foreground text-lg">
                  <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span>Apex POS</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-6 flex flex-col gap-1.5">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="pt-6 border-t border-border flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Theme Mode</span>
                <ThemeToggle />
              </div>
              <Link
                href="/login"
                onClick={() => setMobileSidebarOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <LogIn className="w-4 h-4" />
                <span>Google Sign In</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
