'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  WalletCards,
  Plus,
  Search,
  Calendar,
  IndianRupee,
  ReceiptText,
  Edit2,
  Trash2,
  X,
  Check,
  AlertCircle,
  Filter,
  RefreshCw,
  TrendingDown,
  FileSpreadsheet,
} from 'lucide-react';

interface ChargeItem {
  id: number;
  charge_date: string;
  amount: number;
  notes: string;
  created_at?: string;
}

interface ChargesSummary {
  total_count: number;
  total_amount: number;
  average_amount: number;
}

export default function ChargesPage() {
  const [charges, setCharges] = useState<ChargeItem[]>([]);
  const [summary, setSummary] = useState<ChargesSummary>({
    total_count: 0,
    total_amount: 0,
    average_amount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Drawer & Modal States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingCharge, setEditingCharge] = useState<ChargeItem | null>(null);
  const [formDate, setFormDate] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Dialog State
  const [deleteTarget, setDeleteTarget] = useState<ChargeItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCharges = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const res = await fetch(`/api/charges?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch charges (Status: ${res.status})`);
      }
      const data = await res.json();
      if (data.success) {
        setCharges(data.charges || []);
        if (data.summary) {
          setSummary({
            total_count: data.summary.total_count || 0,
            total_amount: data.summary.total_amount || 0,
            average_amount: data.summary.average_amount || 0,
          });
        }
      } else {
        throw new Error(data.error || 'Failed to load charges');
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching charges');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCharges();
  }, [fromDate, toDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCharges();
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setFromDate('');
    setToDate('');
  };

  const openCreateDrawer = () => {
    setEditingCharge(null);
    const today = new Date().toISOString().split('T')[0];
    setFormDate(today);
    setFormAmount('');
    setFormNotes('');
    setFormError(null);
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (item: ChargeItem) => {
    setEditingCharge(item);
    setFormDate(item.charge_date || '');
    setFormAmount(item.amount.toString());
    setFormNotes(item.notes || '');
    setFormError(null);
    setIsDrawerOpen(true);
  };

  const handleSaveCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const amt = parseFloat(formAmount);
    if (isNaN(amt) || amt <= 0) {
      setFormError('Please enter a valid amount greater than 0');
      return;
    }
    if (!formDate.trim()) {
      setFormError('Charge date is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        charge_date: formDate.trim(),
        amount: amt,
        notes: formNotes.trim(),
      };

      let res;
      if (editingCharge) {
        res = await fetch(`/api/charges/${editingCharge.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/charges', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save charge');
      }

      setIsDrawerOpen(false);
      fetchCharges();
    } catch (err: any) {
      setFormError(err.message || 'Error saving charge');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/charges/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete charge');
      }
      setDeleteTarget(null);
      fetchCharges();
    } catch (err: any) {
      alert(err.message || 'Error deleting charge');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-medium text-xs uppercase tracking-wider mb-1">
            <WalletCards className="w-4 h-4" />
            <span>Operating Expense Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <span>Business Charges & Expenses</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track operational charges, bundle packaging, transit, and vendor incidentals deducted from Net Profit.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCreateDrawer}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-xs hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Record Charge</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Operating Charges</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground font-mono">
            ₹{summary.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Deducted from gross profit for true store net profit
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Charge Entries</span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <ReceiptText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground font-mono">
            {summary.total_count}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Historical & live operational expense items
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Average Charge per Entry</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground font-mono">
            ₹{summary.average_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Average expense per incidental transaction
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-3xl bg-card border border-border shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search vendor, area, phone, or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-muted/40 border border-border rounded-xl text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1.5 bg-muted/40 border border-border rounded-xl px-3 py-1.5 text-xs text-muted-foreground">
              <span>From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent border-none text-xs text-foreground focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-muted/40 border border-border rounded-xl px-3 py-1.5 text-xs text-muted-foreground">
              <span>To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent border-none text-xs text-foreground focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="px-3.5 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 transition-all cursor-pointer"
            >
              Filter
            </button>

            {(searchTerm || fromDate || toDate) && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground rounded-xl transition-all cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Charges Data Table */}
      <div className="rounded-3xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ReceiptText className="w-4 h-4 text-primary" />
            <h2 className="text-base font-bold text-foreground">Charges Ledger</h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {charges.length} {charges.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>

          <button
            type="button"
            onClick={fetchCharges}
            title="Refresh ledger"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            <span className="text-sm">Loading business charges...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-destructive flex flex-col items-center gap-2">
            <AlertCircle className="w-6 h-6" />
            <span className="text-sm font-semibold">{error}</span>
          </div>
        ) : charges.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-2">
            <WalletCards className="w-10 h-10 stroke-1 text-muted-foreground/50" />
            <span className="text-base font-semibold text-foreground">No charges found</span>
            <span className="text-xs">No business charges match your selected date range or search filter.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 border-b border-border text-xs uppercase text-muted-foreground font-semibold tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Notes & Description</th>
                  <th className="px-6 py-3.5 text-right">Amount</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {charges.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-3.5 whitespace-nowrap font-mono text-xs font-semibold text-foreground">
                      {c.charge_date}
                    </td>
                    <td className="px-6 py-3.5 text-sm text-foreground">
                      <div className="font-medium">{c.notes || 'Incidental Charge'}</div>
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                      ₹{c.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditDrawer(c)}
                          title="Edit charge"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(c)}
                          title="Delete charge"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-over Drawer for Add/Edit Charge */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in">
          <div
            className="w-full max-w-md bg-card h-full border-l border-border shadow-2xl p-6 flex flex-col justify-between overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-title"
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <WalletCards className="w-5 h-5 text-primary" />
                  <h3 id="drawer-title" className="text-lg font-bold text-foreground">
                    {editingCharge ? 'Edit Business Charge' : 'Record New Charge'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                  aria-label="Close drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form id="charge-form" onSubmit={handleSaveCharge} className="space-y-4 mt-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Charge Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-muted/40 border border-border rounded-xl text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Amount (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 bg-muted/40 border border-border rounded-xl text-sm font-mono font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Notes & Description
                  </label>
                  <textarea
                    rows={4}
                    placeholder="e.g. Big Basket delivery fee, packaging bundle, metro transit..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-muted/40 border border-border rounded-xl text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Include details like vendor, transit routes, or quantity notes.
                  </p>
                </div>
              </form>
            </div>

            <div className="pt-6 border-t border-border flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="charge-form"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-xs hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary cursor-pointer disabled:opacity-50 transition-all"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>{editingCharge ? 'Update Charge' : 'Save Charge'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <div className="p-2.5 rounded-2xl bg-destructive/10">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">Delete Business Charge?</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Are you sure you want to delete this charge of{' '}
              <strong className="text-foreground font-mono">₹{deleteTarget.amount.toFixed(2)}</strong> on{' '}
              <strong className="text-foreground">{deleteTarget.charge_date}</strong>? This action cannot be undone and will affect Net Profit calculation.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold hover:bg-destructive/90 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
