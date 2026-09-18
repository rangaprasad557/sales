'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  Receipt,
  Download,
  Upload,
  WalletCards,
  ChevronDown,
} from 'lucide-react';
import { useUIStore } from '../store/useUIStore';
import { ThemeToggle } from './ThemeToggle';
import { CigaretteIcon } from './CigaretteIcon';

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isMastersOpen, setIsMastersOpen] = useState(false);
  const mastersRef = useRef<HTMLDivElement>(null);

  const {
    currentUser,
    logout,
    isMobileSidebarOpen,
    setMobileSidebarOpen,
    addNotification,
  } = useUIStore();

  useEffect(() => {
    setMounted(true);

    const handleClickOutside = (e: MouseEvent) => {
      if (mastersRef.current && !mastersRef.current.contains(e.target as Node)) {
        setIsMastersOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMastersOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setMobileSidebarOpen(false);
    setIsMastersOpen(false);
    router.replace('/login');
  };

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleDownloadBackup = async () => {
    setIsBackingUp(true);
    try {
      const res = await fetch('/api/system/backup');
      if (res.ok) {
        const data = await res.json();
        const jsonStr = JSON.stringify(data.backup || data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `retail_sales_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addNotification('success', 'Store backup downloaded successfully.');
      } else {
        addNotification('error', 'Failed to generate store backup.');
      }
    } catch {
      addNotification('error', 'Network error during backup generation.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleFileRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm(`Restore store data from "${file.name}"? This will replace all existing store data with the backup contents.`)) {
      e.target.value = '';
      return;
    }

    setIsRestoring(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = await fetch('/api/system/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      if (res.ok) {
        addNotification('success', 'Store data restored successfully from backup!');
        setTimeout(() => window.location.reload(), 800);
      } else {
        const err = await res.json().catch(() => ({ error: 'Restore failed' }));
        addNotification('error', err.error || 'Failed to restore store data.');
      }
    } catch {
      addNotification('error', 'Invalid JSON backup file or network error.');
    } finally {
      setIsRestoring(false);
      e.target.value = '';
    }
  };

  // If on login page, render clean minimal header without protected store navigation tabs
  if (pathname === '/login') {
    return (
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-xs">
              <CigaretteIcon className="w-6 h-6" />
            </div>
            <span className="font-extrabold text-sm tracking-tight text-foreground">Retail Sales</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>
    );
  }

  // Core operational links shown directly in top bar
  const navLinks = [
    { href: '/orders', label: 'Orders', icon: Receipt },
    { href: '/procurement', label: 'Procurement', icon: Truck },
    { href: '/charges', label: 'Charges', icon: WalletCards },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/catalogue', label: 'Catalogue', icon: Package },
  ];

  // Secondary master entities grouped into sleek dropdown
  const masterLinks = [
    { href: '/customers', label: 'Customers', icon: Users, description: 'Customer directory & credit limits' },
    { href: '/suppliers', label: 'Suppliers', icon: Building2, description: 'Vendors & procurement sources' },
    { href: '/categories', label: 'Categories', icon: Layers, description: 'Product taxonomy & icons' },
  ];

  const isMastersActive = ['/customers', '/suppliers', '/categories'].includes(pathname);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card/80 backdrop-blur-md">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand & Desktop Navigation */}
          <div className="flex items-center gap-2 lg:gap-3 shrink-0 min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
              aria-label="Open mobile navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Cigarette Sales Brand Emblem linking to POS billing */}
            <Link
              href="/"
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 shadow-xs group transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Apex Cigarette Sales Home"
              title="New Sale (POS)"
            >
              <CigaretteIcon className="w-6 h-6 group-hover:scale-110 transition-transform" />
            </Link>

            {/* Desktop Nav Links */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5" aria-label="Main Navigation">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      isActive
                        ? 'bg-primary/10 text-primary border border-primary/20 shadow-xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}

              {/* Masters Dropdown */}
              <div className="relative" ref={mastersRef}>
                <button
                  type="button"
                  onClick={() => setIsMastersOpen((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer ${
                    isMastersActive
                      ? 'bg-primary/10 text-primary border border-primary/20 shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                  aria-expanded={isMastersOpen}
                  aria-haspopup="true"
                  aria-label="Master entities menu"
                >
                  <Layers className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
                  <span>Masters</span>
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isMastersOpen ? 'rotate-180' : ''}`} />
                </button>

                {isMastersOpen && (
                  <div className="absolute top-full left-0 mt-1.5 w-60 rounded-2xl bg-card border border-border shadow-xl p-1.5 z-50 animate-in fade-in-0 zoom-in-95">
                    {masterLinks.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsMastersOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-colors ${
                            isActive
                              ? 'bg-primary/10 text-primary font-semibold'
                              : 'text-foreground hover:bg-muted font-medium'
                          }`}
                        >
                          <div className="p-1.5 rounded-lg bg-muted text-muted-foreground shrink-0">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground truncate">{item.label}</div>
                            <div className="text-[10px] text-muted-foreground truncate">{item.description}</div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </nav>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Hidden Backup File Input */}
            <input
              id="backup-file-input"
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileRestore}
            />

            {/* Download Store Backup Button */}
            {currentUser && (
              <button
                type="button"
                onClick={handleDownloadBackup}
                disabled={isBackingUp}
                className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                title="Download Store Backup (JSON)"
                aria-label="Download Store Backup"
              >
                <Download className="w-4 h-4" />
              </button>
            )}

            {/* Restore Store Backup Button */}
            {currentUser && (
              <button
                type="button"
                onClick={() => document.getElementById('backup-file-input')?.click()}
                disabled={isRestoring}
                className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                title="Restore Store from Backup (JSON)"
                aria-label="Restore Store from Backup"
              >
                <Upload className="w-4 h-4" />
              </button>
            )}

            {/* Authentication State & Profile Pill */}
            {!mounted ? (
              <div
                className="w-20 sm:w-24 h-9 rounded-lg bg-muted border border-border animate-pulse shrink-0"
                aria-hidden="true"
              />
            ) : currentUser ? (
              <div className="flex items-center gap-2 pl-2 pr-1.5 py-1 h-9 rounded-lg bg-card border border-border shadow-xs shrink-0">
                <div
                  className="w-6 h-6 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-[10px] shrink-0"
                  title={`${currentUser.name} (Full Access)`}
                >
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:flex flex-col text-left leading-tight mr-1 min-w-0">
                  <span className="text-xs font-semibold text-foreground truncate max-w-[90px] lg:max-w-[120px]">
                    {currentUser.name.split(' ')[0]}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-400">
                    Full Access
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
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
            className="fixed inset-y-0 left-0 w-72 bg-card border-r border-border p-6 shadow-2xl flex flex-col justify-between animate-in slide-in-from-left duration-200 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-border">
                {/* Mobile Drawer Brand Icon */}
                <Link
                  href="/"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="flex items-center gap-2.5"
                >
                  <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                    <CigaretteIcon className="w-6 h-6" />
                  </div>
                  <span className="font-extrabold text-sm tracking-tight text-foreground">Retail Sales</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Primary Actions */}
              <div className="mt-4 flex flex-col gap-1">
                <Link
                  href="/"
                  onClick={() => setMobileSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    pathname === '/' || pathname === '/sales'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>New Sale (POS)</span>
                </Link>

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

                {/* Master Entities section in mobile */}
                <div className="pt-3 mt-2 border-t border-border/60">
                  <div className="px-3 pb-1.5 text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                    Master Entities
                  </div>
                  {masterLinks.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileSidebarOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
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
                    onClick={handleLogout}
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
