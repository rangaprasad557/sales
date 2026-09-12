'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  Mail,
  Phone,
  MapPin,
  Clock,
  Truck,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Tag,
  ShoppingBag,
  Store,
  Globe,
  Trash2,
} from 'lucide-react';
import { Drawer } from '../../components/Drawer';
import { useUIStore } from '../../store/useUIStore';

export interface Supplier {
  id: number;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  source: string; // 'Wholesale Shop' | 'Quick Commerce' | 'E-Commerce' | 'Other'
  paymentTerms: string;
  notes?: string;
}

const SOURCES = ['Wholesale Shop', 'Quick Commerce', 'E-Commerce', 'Other'];
const PAYMENT_TERMS_OPTIONS = ['Immediate / COD', 'Net 7 Days', 'Net 15 Days', 'Net 30 Days', 'Net 60 Days'];

const SEED_SUPPLIERS: Supplier[] = [
  {
    id: 1,
    name: 'National Grain Distributors',
    contactPerson: 'Sarah Jenkins',
    email: 'sarah@nationalgrain.com',
    phone: '+1 (555) 901-2345',
    address: '100 Terminal Island Expressway, Hub 4',
    source: 'Wholesale Shop',
    paymentTerms: 'Net 30 Days',
    notes: 'Primary bulk supplier for Basmati Rice and whole wheat flour.',
  },
  {
    id: 2,
    name: 'Golden Harvest Milling',
    contactPerson: 'David Ross',
    email: 'dross@goldenharvest.io',
    phone: '+1 (555) 890-1234',
    address: '45 Milling Way, Grain Valley',
    source: 'Wholesale Shop',
    paymentTerms: 'Net 15 Days',
    notes: 'Specialty organic grain supplier with direct farm sourcing.',
  },
  {
    id: 3,
    name: 'BlinkSupply Rapid Delivery',
    contactPerson: 'Alex Chen',
    email: 'ops@blinksupply.quick',
    phone: '+1 (555) 789-0123',
    address: 'Urban Darkstore Hub #12',
    source: 'Quick Commerce',
    paymentTerms: 'Immediate / COD',
    notes: 'Same-day urgent stock replenishment partner.',
  },
  {
    id: 4,
    name: 'OmniTrade Wholesale B2B',
    contactPerson: 'Elena Rostova',
    email: 'b2b@omnitrade.online',
    phone: '+1 (555) 678-9012',
    address: 'Cloud Logistics Park, Dock 8',
    source: 'E-Commerce',
    paymentTerms: 'Net 30 Days',
    notes: 'Direct online marketplace intake with fluctuating lot pricing.',
  },
];

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('ALL');
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const { addNotification } = useUIStore();

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    source: 'Wholesale Shop',
    paymentTerms: 'Net 30 Days',
    notes: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch from backend API
  const fetchSuppliers = () => {
    fetch('/api/suppliers')
      .then((res) => {
        if (!res.ok) throw new Error('API unavailable');
        return res.json();
      })
      .then((data) => {
        const list = data.suppliers || data.data || (Array.isArray(data) ? data : []);
        const mapped = list.map((s: any) => ({
          id: s.id,
          name: s.name,
          contactPerson: s.contact_person || s.contactPerson || '',
          email: s.email || '',
          phone: s.phone || '',
          address: s.address || '',
          source: s.source || 'Wholesale Shop',
          paymentTerms: s.payment_terms || s.paymentTerms || 'Net 30 Days',
          notes: s.notes || '',
        }));
        setSuppliers(mapped);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const filteredSuppliers = suppliers.filter((s) => {
    const matchesSource = selectedSource === 'ALL' || s.source === selectedSource;
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      s.name.toLowerCase().includes(q) ||
      (s.contactPerson && s.contactPerson.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.phone && s.phone.toLowerCase().includes(q));
    return matchesSource && matchesQuery;
  });

  const openCreateDrawer = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      source: 'Wholesale Shop',
      paymentTerms: 'Net 30 Days',
      notes: '',
    });
    setFormErrors({});
    setDrawerOpen(true);
  };

  const openEditDrawer = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contactPerson: supplier.contactPerson || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      source: supplier.source || 'Wholesale Shop',
      paymentTerms: supplier.paymentTerms || 'Net 30 Days',
      notes: supplier.notes || '',
    });
    setFormErrors({});
    setDrawerOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) {
      errors.name = 'Supplier name is required';
      addNotification('error', 'Supplier name is required');
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
      addNotification('error', 'Please enter a valid email address');
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    const payload = {
      name: formData.name.trim(),
      contact_person: formData.contactPerson.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      address: formData.address.trim(),
      source: formData.source,
      payment_terms: formData.paymentTerms,
      notes: formData.notes.trim(),
    };

    try {
      if (editingSupplier) {
        // Update existing supplier via PUT
        const res = await fetch(`/api/suppliers/${editingSupplier.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: 'Update failed' }));
          throw new Error(errData.error || 'Update failed');
        }
        addNotification('success', `Supplier "${formData.name.trim()}" updated successfully.`);
      } else {
        // Create new supplier via POST
        const res = await fetch('/api/suppliers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: 'Registration failed' }));
          throw new Error(errData.error || 'Registration failed');
        }
        addNotification('success', `Supplier "${formData.name.trim()}" registered successfully.`);
      }

      setDrawerOpen(false);
      setEditingSupplier(null);
      fetchSuppliers();
    } catch (err: any) {
      addNotification('error', err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (supplier: Supplier) => {
    if (!confirm(`Delete supplier "${supplier.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Delete failed' }));
        throw new Error(errData.error || 'Delete failed');
      }
      addNotification('success', `Supplier "${supplier.name}" deleted.`);
      fetchSuppliers();
    } catch (err: any) {
      addNotification('error', err.message || 'Delete failed');
    }
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'Wholesale Shop':
        return {
          icon: Store,
          className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        };
      case 'Quick Commerce':
        return {
          icon: Truck,
          className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        };
      case 'E-Commerce':
        return {
          icon: Globe,
          className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
        };
      default:
        return {
          icon: Tag,
          className: 'bg-muted text-muted-foreground border-border',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-medium text-xs uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            <span>Master Data Module</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Supplier & Vendor Directory
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure multi-batch procurement sources, vendor payment terms, and supply channels.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateDrawer}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20 hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Supplier</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Suppliers</span>
            <Building2 className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground">{suppliers.length}</div>
          <p className="text-xs text-muted-foreground mt-1">Active vendor network</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Wholesale Hubs</span>
            <Store className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-foreground">
            {suppliers.filter((s) => s.source === 'Wholesale Shop').length}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Primary bulk grain & flour</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Quick Commerce</span>
            <Truck className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-foreground">
            {suppliers.filter((s) => s.source === 'Quick Commerce').length}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Express replenishment hubs</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Standard Terms</span>
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground">Net 30</div>
          <p className="text-xs text-muted-foreground mt-1">Dominant commercial term</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-2 bg-card rounded-2xl border border-border shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search suppliers by vendor name, contact person, or email..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-transparent border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* Source Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setSelectedSource('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedSource === 'ALL'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            All Channels
          </button>
          {SOURCES.map((src) => (
            <button
              key={src}
              type="button"
              onClick={() => setSelectedSource(src)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedSource === src
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {src}
            </button>
          ))}
        </div>
      </div>

      {/* Supplier Table */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground font-semibold tracking-wider">
              <tr>
                <th className="px-6 py-4">Supplier / Vendor</th>
                <th className="px-6 py-4">Procurement Channel</th>
                <th className="px-6 py-4">Contact Info</th>
                <th className="px-6 py-4">Payment Terms</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    <Building2 className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="font-medium text-foreground">No suppliers found</p>
                    <p className="text-xs mt-1">Try adjusting your filters or add a new supplier.</p>
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => {
                  const badge = getSourceBadge(supplier.source);
                  const BadgeIcon = badge.icon;
                  return (
                    <tr
                      key={supplier.id}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-card text-foreground font-bold text-sm flex items-center justify-center border border-border shadow-xs shrink-0">
                            {supplier.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-foreground block group-hover:text-primary transition-colors">
                              {supplier.name}
                            </span>
                            {supplier.notes && (
                              <span className="text-xs text-muted-foreground line-clamp-1">
                                {supplier.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${badge.className}`}
                        >
                          <BadgeIcon className="w-3.5 h-3.5" />
                          <span>{supplier.source}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1 text-xs text-muted-foreground">
                          {supplier.contactPerson && (
                            <span className="font-medium text-foreground block">
                              {supplier.contactPerson}
                            </span>
                          )}
                          {supplier.email && (
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-muted-foreground/70" />
                              <a
                                href={`mailto:${supplier.email}`}
                                className="hover:underline hover:text-foreground"
                              >
                                {supplier.email}
                              </a>
                            </div>
                          )}
                          {supplier.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-muted-foreground/70" />
                              <span>{supplier.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted text-foreground text-xs font-medium border border-border">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          {supplier.paymentTerms}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditDrawer(supplier)}
                            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary transition-colors"
                            title={`Edit ${supplier.name}`}
                            aria-label={`Edit ${supplier.name}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(supplier)}
                            className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-destructive transition-colors"
                            title={`Delete ${supplier.name}`}
                            aria-label={`Delete ${supplier.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
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
      </div>

      {/* Slide-over Drawer for Add/Edit Supplier */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingSupplier ? 'Edit Supplier Profile' : 'Add New Supplier'}
        description="Configure vendor channels, payment terms, and procurement points of contact."
        footer={
          <>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Register Supplier'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
              Supplier / Vendor Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. National Grain Distributors"
              className={`w-full px-3.5 py-2.5 rounded-xl border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                formErrors.name ? 'border-destructive' : 'border-border'
              }`}
            />
            {formErrors.name && (
              <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {formErrors.name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
              Procurement Source Channel
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SOURCES.map((src) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setFormData({ ...formData, source: src })}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-all ${
                    formData.source === src
                      ? 'bg-primary/10 border-primary text-primary shadow-xs'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>{src}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                Contact Person
              </label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) =>
                  setFormData({ ...formData, contactPerson: e.target.value })
                }
                placeholder="Sarah Jenkins"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                Payment Terms
              </label>
              <select
                value={formData.paymentTerms}
                onChange={(e) =>
                  setFormData({ ...formData, paymentTerms: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {PAYMENT_TERMS_OPTIONS.map((term) => (
                  <option key={term} value={term}>
                    {term}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="vendor@company.com"
                className={`w-full px-3.5 py-2.5 rounded-xl border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                  formErrors.email ? 'border-destructive' : 'border-border'
                }`}
              />
              {formErrors.email && (
                <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {formErrors.email}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
              Warehouse / Facility Address
            </label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Dock, logistics hub, or pickup depot address..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
              Procurement Notes & Terms
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Lead times, minimum order quantity, seasonal availability..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </form>
      </Drawer>
    </div>
  );
}
