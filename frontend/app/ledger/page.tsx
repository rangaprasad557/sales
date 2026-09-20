'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  Calendar,
  IndianRupee,
  Search,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  Clock,
  CheckCircle2,
  X,
  Edit2,
  Trash2,
  RefreshCw,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  User,
  CreditCard,
  Building,
} from 'lucide-react';

interface LedgerEntry {
  id: number;
  salesperson: string;
  entry_date: string;
  entry_type: string;
  counterparty: string | null;
  item_description: string;
  quantity: number | null;
  unit_rate: number | null;
  total_amount: number;
  cash_amount: number;
  online_amount: number;
  due_amount: number;
  notes: string | null;
  created_at: string;
}

interface LedgerSummary {
  total_cash: number;
  total_online: number;
  total_due: number;
  total_sales: number;
  total_expenses: number;
  net_balance: number;
  entry_count: number;
}

const EMPTY_SUMMARY: LedgerSummary = {
  total_cash: 0,
  total_online: 0,
  total_due: 0,
  total_sales: 0,
  total_expenses: 0,
  net_balance: 0,
  entry_count: 0,
};

const ENTRY_TYPE_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  SALE: { label: 'Sale', bg: 'bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-500/20' },
  PURCHASE: { label: 'Purchase', bg: 'bg-orange-500/10', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-500/20' },
  PAYMENT_TO_OWNER: { label: 'Paid to Owner', bg: 'bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-500/20' },
  PAYMENT_FROM_OWNER: { label: 'From Owner', bg: 'bg-indigo-500/10', text: 'text-indigo-700 dark:text-indigo-400', border: 'border-indigo-500/20' },
  EXPENSE: { label: 'Expense', bg: 'bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-500/20' },
  BILL_PAYMENT: { label: 'Bill Paid', bg: 'bg-purple-500/10', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-500/20' },
  DUE_RECEIVED: { label: 'Due Received', bg: 'bg-cyan-500/10', text: 'text-cyan-700 dark:text-cyan-400', border: 'border-cyan-500/20' },
  ADJUSTMENT: { label: 'Adjustment', bg: 'bg-slate-500/10', text: 'text-slate-700 dark:text-slate-400', border: 'border-slate-500/20' },
};

function formatYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function LedgerPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<LedgerSummary>(EMPTY_SUMMARY);
  const [salespersons, setSalespersons] = useState<string[]>(['Surendra']);
  const [selectedSalesperson, setSelectedSalesperson] = useState<string>('Surendra');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [activePreset, setActivePreset] = useState<'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_YEAR' | 'CUSTOM'>('ALL');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Pagination
  const [page, setPage] = useState<number>(1);
  const pageSize = 50;
  const [totalCount, setTotalCount] = useState<number>(0);

  // Drawer Form state
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  const [formSalesperson, setFormSalesperson] = useState<string>('Surendra');
  const [formDate, setFormDate] = useState<string>(formatYMD(new Date()));
  const [formType, setFormType] = useState<string>('SALE');
  const [formCounterparty, setFormCounterparty] = useState<string>('');
  const [formItemDesc, setFormItemDesc] = useState<string>('');
  const [formQuantity, setFormQuantity] = useState<string>('');
  const [formUnitRate, setFormUnitRate] = useState<string>('');
  const [formTotalAmount, setFormTotalAmount] = useState<string>('');
  const [formCashAmount, setFormCashAmount] = useState<string>('');
  const [formOnlineAmount, setFormOnlineAmount] = useState<string>('');
  const [formDueAmount, setFormDueAmount] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');

  // Preset date calculator
  const handlePresetSelect = (preset: 'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_YEAR') => {
    setActivePreset(preset);
    setPage(1);
    const now = new Date();

    if (preset === 'ALL') {
      setFromDate('');
      setToDate('');
    } else if (preset === 'TODAY') {
      const todayStr = formatYMD(now);
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === 'THIS_WEEK') {
      const day = now.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      setFromDate(formatYMD(monday));
      setToDate(formatYMD(sunday));
    } else if (preset === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setFromDate(formatYMD(firstDay));
      setToDate(formatYMD(lastDay));
    } else if (preset === 'THIS_YEAR') {
      setFromDate(`${now.getFullYear()}-01-01`);
      setToDate(`${now.getFullYear()}-12-31`);
    }
  };

  // Fetch summary & entries
  useEffect(() => {
    setIsLoading(true);

    const sumParams = new URLSearchParams();
    if (selectedSalesperson) sumParams.set('salesperson', selectedSalesperson);
    if (fromDate) sumParams.set('from_date', fromDate);
    if (toDate) sumParams.set('to_date', toDate);

    const listParams = new URLSearchParams();
    if (selectedSalesperson) listParams.set('salesperson', selectedSalesperson);
    if (selectedType !== 'ALL') listParams.set('entry_type', selectedType);
    if (fromDate) listParams.set('from_date', fromDate);
    if (toDate) listParams.set('to_date', toDate);
    if (searchQuery.trim()) listParams.set('search', searchQuery.trim());
    listParams.set('limit', String(pageSize));
    listParams.set('offset', String((page - 1) * pageSize));

    Promise.all([
      fetch(`/api/ledger/summary?${sumParams.toString()}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/ledger?${listParams.toString()}`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([sumData, listData]) => {
        if (sumData && sumData.summary) {
          setSummary(sumData.summary);
        }
        if (listData) {
          setEntries(listData.entries || []);
          setTotalCount(listData.total_count || 0);
          if (listData.salespersons && Array.isArray(listData.salespersons) && listData.salespersons.length > 0) {
            setSalespersons(listData.salespersons);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLoading(false);
      });
  }, [selectedSalesperson, selectedType, fromDate, toDate, searchQuery, page, refreshTrigger]);

  const openCreateDrawer = () => {
    setEditingEntry(null);
    setFormSalesperson(selectedSalesperson || 'Surendra');
    setFormDate(formatYMD(new Date()));
    setFormType('SALE');
    setFormCounterparty('');
    setFormItemDesc('');
    setFormQuantity('');
    setFormUnitRate('');
    setFormTotalAmount('');
    setFormCashAmount('');
    setFormOnlineAmount('');
    setFormDueAmount('');
    setFormNotes('');
    setFormError('');
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (entry: LedgerEntry) => {
    setEditingEntry(entry);
    setFormSalesperson(entry.salesperson || 'Surendra');
    setFormDate(entry.entry_date || formatYMD(new Date()));
    setFormType(entry.entry_type || 'SALE');
    setFormCounterparty(entry.counterparty || '');
    setFormItemDesc(entry.item_description || '');
    setFormQuantity(entry.quantity != null ? String(entry.quantity) : '');
    setFormUnitRate(entry.unit_rate != null ? String(entry.unit_rate) : '');
    setFormTotalAmount(entry.total_amount != null ? String(entry.total_amount) : '');
    setFormCashAmount(entry.cash_amount != null ? String(entry.cash_amount) : '');
    setFormOnlineAmount(entry.online_amount != null ? String(entry.online_amount) : '');
    setFormDueAmount(entry.due_amount != null ? String(entry.due_amount) : '');
    setFormNotes(entry.notes || '');
    setFormError('');
    setIsDrawerOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formItemDesc.trim()) {
      setFormError('Item / Description is required.');
      return;
    }

    const payload = {
      salesperson: formSalesperson.trim() || 'Surendra',
      entry_date: formDate,
      entry_type: formType,
      counterparty: formCounterparty.trim() || null,
      item_description: formItemDesc.trim(),
      quantity: parseFloat(formQuantity) || 0,
      unit_rate: parseFloat(formUnitRate) || 0,
      total_amount: parseFloat(formTotalAmount) || 0,
      cash_amount: parseFloat(formCashAmount) || 0,
      online_amount: parseFloat(formOnlineAmount) || 0,
      due_amount: parseFloat(formDueAmount) || 0,
      notes: formNotes.trim() || null,
    };

    // Auto calculate total if 0
    if (payload.total_amount === 0 && payload.quantity > 0 && payload.unit_rate > 0) {
      payload.total_amount = round2(payload.quantity * payload.unit_rate);
    }

    setFormSubmitting(true);
    try {
      const url = editingEntry ? `/api/ledger/${editingEntry.id}` : '/api/ledger';
      const method = editingEntry ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to save entry.');
        return;
      }

      setIsDrawerOpen(false);
      setRefreshTrigger((prev) => prev + 1);
    } catch {
      setFormError('Network error. Please try again.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this ledger entry?')) return;
    try {
      const res = await fetch(`/api/ledger/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setRefreshTrigger((prev) => prev + 1);
      } else {
        alert('Failed to delete entry.');
      }
    } catch {
      alert('Network error while deleting entry.');
    }
  };

  const round2 = (val: number) => Math.round(val * 100) / 100;

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const activeScopeLabel = useMemo(() => {
    if (activePreset === 'TODAY') return 'Today';
    if (activePreset === 'THIS_WEEK') return 'This Week';
    if (activePreset === 'THIS_MONTH') return 'This Month';
    if (activePreset === 'THIS_YEAR') return 'This Year';
    if (fromDate || toDate) return `${fromDate || 'Start'} to ${toDate || 'Present'}`;
    return 'All Time History';
  }, [activePreset, fromDate, toDate]);

  return (
    <div className="space-y-3.5 sm:space-y-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              Salesperson Ledger & Cash Accountability
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Daily cash register, online collections, expenses, owner settlements, and running accountability balances.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Salesperson Selector Dropdown */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-border bg-card shadow-xs">
            <User className="w-3.5 h-3.5 text-primary shrink-0" />
            <select
              value={selectedSalesperson}
              onChange={(e) => {
                setSelectedSalesperson(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer"
              aria-label="Filter by Salesperson"
            >
              {salespersons.map((sp) => (
                <option key={sp} value={sp} className="bg-card text-foreground">
                  {sp}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setRefreshTrigger((prev) => prev + 1)}
            className="h-8.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-bold text-foreground transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
            title="Refresh ledger data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={openCreateDrawer}
            className="h-8.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Entry</span>
          </button>
        </div>
      </div>

      {/* Balance Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Cash Balance */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-card border border-border shadow-xs min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider truncate">Cash Balance</span>
            <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <IndianRupee className="w-3.5 h-3.5" />
            </div>
          </div>
          <div
            className={`text-base sm:text-lg xl:text-xl font-black font-mono tracking-tight truncate tabular-nums ${
              summary.total_cash >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
            title={`₹${summary.total_cash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          >
            {summary.total_cash >= 0 ? '+' : ''}₹{summary.total_cash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">Physical cash held</p>
        </div>

        {/* Online Balance */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-card border border-border shadow-xs min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider truncate">Online Balance</span>
            <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
          </div>
          <div
            className={`text-base sm:text-lg xl:text-xl font-black font-mono tracking-tight truncate tabular-nums ${
              summary.total_online >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'
            }`}
            title={`₹${summary.total_online.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          >
            {summary.total_online >= 0 ? '+' : ''}₹{summary.total_online.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">UPI / digital collections</p>
        </div>

        {/* Dues Outstanding */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-card border border-border shadow-xs min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider truncate">Dues Outstanding</span>
            <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div
            className="text-base sm:text-lg xl:text-xl font-black font-mono tracking-tight truncate tabular-nums text-foreground"
            title={`₹${summary.total_due.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          >
            ₹{summary.total_due.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">Credit sales pending</p>
        </div>

        {/* Net Accountability Position */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-card border border-border shadow-xs min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider truncate">Net Position</span>
            <div className="w-6 h-6 rounded-md bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
              <Building className="w-3.5 h-3.5" />
            </div>
          </div>
          <div
            className={`text-base sm:text-lg xl:text-xl font-black font-mono tracking-tight truncate tabular-nums ${
              summary.net_balance >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
            title={`₹${summary.net_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          >
            {summary.net_balance >= 0 ? '+' : ''}₹{summary.net_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {summary.net_balance >= 0 ? 'Salesperson owes business' : 'Business owes salesperson'}
          </p>
        </div>
      </div>

      {/* Filter & Period Controls Bar */}
      <div className="p-2.5 sm:p-3 rounded-2xl bg-card border border-border shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
        {/* Quick Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mr-1 shrink-0">
            <Clock className="w-3.5 h-3.5" />
            <span>Period:</span>
          </span>
          {(['ALL', 'THIS_YEAR', 'THIS_MONTH', 'THIS_WEEK', 'TODAY'] as const).map((preset) => {
            const labels = {
              ALL: 'All Time',
              THIS_YEAR: 'This Year',
              THIS_MONTH: 'This Month',
              THIS_WEEK: 'This Week',
              TODAY: 'Today',
            };
            const isSelected = activePreset === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => handlePresetSelect(preset)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-primary/10 text-primary border border-primary/20 shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {labels[preset]}
              </button>
            );
          })}
        </div>

        {/* Date Inputs & Search */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Custom Date Inputs */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setActivePreset('CUSTOM');
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-xl border border-border bg-background text-xs font-medium text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              aria-label="From Date"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setActivePreset('CUSTOM');
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-xl border border-border bg-background text-xs font-medium text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              aria-label="To Date"
            />
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search counterparty, item..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="pl-8 pr-3 py-1.5 rounded-xl border border-border bg-background text-xs font-medium text-foreground focus:ring-2 focus:ring-primary focus:outline-none w-48 sm:w-56"
            />
          </div>

          {/* Reset Pill */}
          {(fromDate || toDate || searchQuery || activePreset !== 'ALL' || selectedType !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                handlePresetSelect('ALL');
                setSelectedType('ALL');
                setSearchQuery('');
              }}
              className="px-2.5 py-1.5 rounded-xl bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Reset all filters"
            >
              <span>Reset</span>
              <span className="text-[10px]">✕</span>
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/5 border border-primary/15 text-primary text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate max-w-[180px] font-semibold">{activeScopeLabel}</span>
          </div>
        </div>
      </div>

      {/* Entry Type Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => {
            setSelectedType('ALL');
            setPage(1);
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            selectedType === 'ALL'
              ? 'bg-foreground text-background shadow-xs font-bold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          All Entries ({summary.entry_count})
        </button>

        {Object.entries(ENTRY_TYPE_CONFIG).map(([typeKey, cfg]) => {
          const isSelected = selectedType === typeKey;
          return (
            <button
              key={typeKey}
              type="button"
              onClick={() => {
                setSelectedType(typeKey);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? `${cfg.bg} ${cfg.text} border ${cfg.border} shadow-xs font-bold`
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <span>{cfg.label}</span>
            </button>
          );
        })}
      </div>

      {/* Transactions Table */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="px-4 sm:px-5 py-3 border-b border-border bg-muted/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            <h2 className="text-sm sm:text-base font-bold text-foreground">
              Transactions ({totalCount} total)
            </h2>
          </div>
          <span className="text-[11px] font-medium text-muted-foreground">
            Showing page {page} of {totalPages}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-muted/30 border-b border-border text-[11px] uppercase text-muted-foreground font-semibold tracking-wider">
              <tr>
                <th className="px-3.5 py-2">Date</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Counterparty</th>
                <th className="px-3.5 py-2">Item / Description</th>
                <th className="px-3 py-2 text-center">Qty</th>
                <th className="px-3 py-2 text-right">Rate</th>
                <th className="px-3 py-2 text-right">Total Amount</th>
                <th className="px-3 py-2 text-right">Cash</th>
                <th className="px-3 py-2 text-right">Online</th>
                <th className="px-3 py-2 text-right">Due</th>
                <th className="px-3.5 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-xs text-muted-foreground">
                    No ledger entries found matching your filters.
                  </td>
                </tr>
              ) : (
                entries.map((item) => {
                  const cfg = ENTRY_TYPE_CONFIG[item.entry_type] || {
                    label: item.entry_type,
                    bg: 'bg-muted',
                    text: 'text-foreground',
                    border: 'border-border',
                  };

                  return (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-3.5 py-2 font-mono text-xs text-foreground whitespace-nowrap">
                        {item.entry_date}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-medium text-foreground max-w-[150px] truncate" title={item.counterparty || '–'}>
                        {item.counterparty || <span className="text-muted-foreground">–</span>}
                      </td>
                      <td className="px-3.5 py-2 font-semibold text-foreground max-w-[200px] truncate" title={item.item_description}>
                        <div>{item.item_description}</div>
                        {item.notes && <div className="text-[10px] font-normal text-muted-foreground truncate">{item.notes}</div>}
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-foreground">
                        {item.quantity ? item.quantity : <span className="text-muted-foreground font-normal">–</span>}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                        {item.unit_rate ? `₹${item.unit_rate.toFixed(2)}` : '–'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-foreground">
                        ₹{item.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {item.cash_amount !== 0 ? (
                          <span className={item.cash_amount > 0 ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-rose-600 dark:text-rose-400'}>
                            {item.cash_amount > 0 ? '+' : ''}₹{item.cash_amount.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">–</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {item.online_amount !== 0 ? (
                          <span className={item.online_amount > 0 ? 'text-blue-700 dark:text-blue-400 font-bold' : 'text-amber-600 dark:text-amber-400'}>
                            {item.online_amount > 0 ? '+' : ''}₹{item.online_amount.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">–</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {item.due_amount !== 0 ? (
                          <span className="text-amber-600 dark:text-amber-400 font-bold">
                            ₹{item.due_amount.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">–</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditDrawer(item)}
                            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                            title="Edit entry"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="p-1 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Delete entry"
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

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 shadow-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 shadow-xs"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Slide-over Drawer for Create / Edit */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-card border-l border-border shadow-2xl h-full flex flex-col justify-between animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  {editingEntry ? 'Edit Ledger Entry' : 'Record New Ledger Entry'}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Enter transaction details for salesperson cash accountability.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Form */}
            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-semibold">
                  {formError}
                </div>
              )}

              {/* Salesperson & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Salesperson</label>
                  <input
                    type="text"
                    value={formSalesperson}
                    onChange={(e) => setFormSalesperson(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-medium text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Date</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-medium text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Entry Type */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Entry Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-medium text-foreground focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer"
                >
                  {Object.entries(ENTRY_TYPE_CONFIG).map(([tKey, cfg]) => (
                    <option key={tKey} value={tKey}>
                      {cfg.label} ({tKey})
                    </option>
                  ))}
                </select>
              </div>

              {/* Counterparty (Customer / Destination) */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Counterparty (Customer / Shop / Person)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Nallurhalli Pan Shop, Paid to Prasad"
                  value={formCounterparty}
                  onChange={(e) => setFormCounterparty(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-medium text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              {/* Item / Description */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Item Description / Particulars *
                </label>
                <input
                  type="text"
                  placeholder="e.g. King Lights, Auto Charges, Cash Remitted"
                  value={formItemDesc}
                  onChange={(e) => setFormItemDesc(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-medium text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              {/* Qty & Unit Rate */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Quantity</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-medium text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Unit Rate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formUnitRate}
                    onChange={(e) => setFormUnitRate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-medium text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Total Amount */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Total Transaction Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formTotalAmount}
                  onChange={(e) => setFormTotalAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-medium text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              {/* Payment Split: Cash, Online, Due */}
              <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-3">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Payment Settlement Breakdown
                </span>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                      Cash (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formCashAmount}
                      onChange={(e) => setFormCashAmount(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-medium text-foreground focus:ring-2 focus:ring-primary focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-blue-700 dark:text-blue-400 mb-1">
                      Online (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formOnlineAmount}
                      onChange={(e) => setFormOnlineAmount(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-medium text-foreground focus:ring-2 focus:ring-primary focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-amber-700 dark:text-amber-400 mb-1">
                      Due (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formDueAmount}
                      onChange={(e) => setFormDueAmount(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-medium text-foreground focus:ring-2 focus:ring-primary focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Quick Split Buttons */}
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const tot = formTotalAmount || (parseFloat(formQuantity) * parseFloat(formUnitRate)).toFixed(2);
                      setFormCashAmount(tot);
                      setFormOnlineAmount('0');
                      setFormDueAmount('0');
                    }}
                    className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 cursor-pointer"
                  >
                    All Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const tot = formTotalAmount || (parseFloat(formQuantity) * parseFloat(formUnitRate)).toFixed(2);
                      setFormCashAmount('0');
                      setFormOnlineAmount(tot);
                      setFormDueAmount('0');
                    }}
                    className="px-2 py-1 rounded text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20 cursor-pointer"
                  >
                    All Online
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const tot = formTotalAmount || (parseFloat(formQuantity) * parseFloat(formUnitRate)).toFixed(2);
                      setFormCashAmount('0');
                      setFormOnlineAmount('0');
                      setFormDueAmount(tot);
                    }}
                    className="px-2 py-1 rounded text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 cursor-pointer"
                  >
                    All Due
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Additional remarks or notes..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-medium text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              {/* Drawer Action Buttons */}
              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-bold text-foreground transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {formSubmitting ? 'Saving...' : editingEntry ? 'Update Entry' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
