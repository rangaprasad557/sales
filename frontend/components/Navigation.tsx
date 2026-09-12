'use client';

import React, { useState, useEffect } from 'react';
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
  LogIn,
  LogOut,
  Layers,
} from 'lucide-react';
import { useUIStore } from '../store/useUIStore';
import { ThemeToggle } from './ThemeToggle';
import { CigaretteIcon } from './CigaretteIcon';

export function Navigation() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const {
    currentUser,
    logout,
    isMobileSidebarOpen,
    setMobileSidebarOpen,
  } = useUIStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  // POS Billing is now the root view; Overview has been removed as requested
  const navLinks = [
    { href: '/', label: 'POS Billing', icon: ShoppingCart },
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Brand & Desktop Navigation */}
          <div className="flex items-center gap-3 lg:gap-6 shrink-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
              aria-label="Open mobile navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Cigarette Sales Brand Emblem without text */}
            <Link
              href="/"
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 shadow-xs group transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Apex Cigarette Sales Home"
              title="Apex Cigarette Sales POS"
            >
              <CigaretteIcon className="w-6 h-6 group-hover:scale-110 transition-transform" />
            </Link>

            {/* Desktop Nav Links */}
            <nav className="hidden lg:flex items-center gap-1" aria-label="Main Navigation">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive =
                  link.href === '/'
                    ? pathname === '/' || pathname === '/sales'
                    : pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
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

          {/* Right Action Bar (Properly aligned with equal heights) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Authentication State & Profile Pill */}
            {!mounted ? (
              <div
                className="w-20 sm:w-24 h-9 rounded-lg bg-muted border border-border animate-pulse"
                aria-hidden="true"
              />
            ) : currentUser ? (
              <div className="flex items-center gap-2 pl-2 pr-1.5 py-1 h-9 rounded-lg bg-card border border-border shadow-xs">
                <div
                  className="w-6 h-6 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-[10px] shrink-0"
                  title={currentUser.name}
                >
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:flex flex-col text-left leading-tight mr-1">
                  <span className="text-xs font-semibold text-foreground truncate max-w-[120px]">
                    {currentUser.name}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-600 dark:text-emerald-400">
                    Full Access
                  </span>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-1.5 px-3 h-9 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 cursor-pointer select-none"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign In</span>
              </Link>
            )}
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
                {/* Mobile Drawer Brand Icon (no text) */}
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                    <CigaretteIcon className="w-6 h-6" />
                  </div>
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
                  const isActive =
                    link.href === '/'
                      ? pathname === '/' || pathname === '/sales'
                      : pathname === link.href;
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

              {currentUser ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/60 border border-border">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold text-foreground truncate">
                        {currentUser.name}
                      </div>
                      <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                        Full Access
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setMobileSidebarOpen(false);
                    }}
                    className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10"
                    title="Sign Out"
                    aria-label="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Google Sign In</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
