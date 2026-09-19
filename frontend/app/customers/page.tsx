'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  MapPin,
  IndianRupee,
  ShieldCheck,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Building,
  Trash2,
} from 'lucide-react';
import { Drawer } from '../../components/Drawer';
import { useUIStore } from '../../store/useUIStore';

export interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  createdAt?: string;
}

const SEED_CUSTOMERS: Customer[] = [
  {
    id: 1,
    name: 'Metro Supermarket',
    email: 'purchasing@metrosuper.com',
    phone: '+1 (555) 234-5678',
    address: '450 Industrial Parkway, Suite 10, Metro City',
    notes: 'Premium commercial account.',
  },
  {
    id: 2,
    name: 'Green Grocers Co.',
    email: 'orders@greengrocers.org',
    phone: '+1 (555) 876-5432',
    address: '12 Farmhouse Lane, Green Valley',
    notes: 'Organic produce retail partner.',
  },
  {
    id: 3,
    name: 'Downtown Gourmet Deli',
    email: 'chef@downtowndeli.com',
    phone: '+1 (555) 432-1098',
    address: '88 Market Street, Downtown',
    notes: 'Daily delivery schedule required.',
  },
  {
    id: 4,
    name: 'Sunrise Convenience',
    email: 'owner@sunriseconv.com',
    phone: '+1 (555) 654-9870',
    address: '302 Coastal Highway',
    notes: 'Weekly cash-and-carry replenishment.',
  },
];

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const { addNotification } = useUIStore();

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch from API
  const fetchCustomers = () => {
    fetch('/api/customers')
      .then((res) => {
        if (!res.ok) throw new Error('API unavailable');
        return res.json();
      })
      .then((data) => {
        const list = data.customers || (Array.isArray(data) ? data : []);
        const mapped = list.map((c: any) => ({
          id: c.id,
          name: c.name,
          email: c.email || '',
          phone: c.phone || '',
          address: c.address || '',
          notes: c.notes || '',
        }));
        setCustomers(mapped);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.toLowerCase().includes(q))
    );
  });

  const openCreateDrawer = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      notes: '',
    });
    setFormErrors({});
    setDrawerOpen(true);
  };

  const openEditDrawer = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      notes: customer.notes || '',
    });
    setFormErrors({});
    setDrawerOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) {
      errors.name = 'Customer name is required';
      addNotification('error', 'Customer name is required');
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
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      address: formData.address.trim(),
      notes: formData.notes.trim(),
    };

    try {
      if (editingCustomer) {
        // Update existing customer via PUT
        const res = await fetch(`/api/customers/${editingCustomer.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: 'Update failed' }));
          throw new Error(errData.error || 'Update failed');
        }
        addNotification('success', `Customer "${formData.name.trim()}" updated successfully.`);
      } else {
        // Create new customer via POST
        const res = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: 'Create failed' }));
          throw new Error(errData.error || 'Create failed');
        }
        addNotification('success', `Customer "${formData.name.trim()}" created successfully.`);
      }

      setDrawerOpen(false);
      setEditingCustomer(null);
      fetchCustomers();
    } catch (err: any) {
      addNotification('error', err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Delete customer "${customer.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/customers/${customer.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Delete failed' }));
        throw new Error(errData.error || 'Delete failed');
      }
      addNotification('success', `Customer "${customer.name}" deleted.`);
      fetchCustomers();
    } catch (err: any) {
      addNotification('error', err.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-3.5 sm:space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              Customer Directory
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage customer accounts, billing profiles, and credit risk thresholds.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateDrawer}
          className="h-8.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="p-3 sm:p-3.5 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Accounts</span>
            <Users className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="text-base sm:text-lg xl:text-xl font-black text-foreground font-mono tracking-tight">{customers.length}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">Active customer profiles</p>
        </div>

        <div className="p-3 sm:p-3.5 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Phone Contacts</span>
            <Phone className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-base sm:text-lg xl:text-xl font-black text-foreground font-mono tracking-tight">
            {customers.filter((c) => c.phone).length}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">Verified phone numbers</p>
        </div>

        <div className="p-3 sm:p-3.5 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Email Profiles</span>
            <Mail className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-base sm:text-lg xl:text-xl font-black text-foreground font-mono tracking-tight">
            {customers.filter((c) => c.email).length}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">Direct invoice recipients</p>
        </div>

        <div className="p-3 sm:p-3.5 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Delivery Addresses</span>
            <MapPin className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="text-base sm:text-lg xl:text-xl font-black text-foreground font-mono tracking-tight">
            {customers.filter((c) => c.address).length}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">Documented shipping destinations</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center gap-2.5 p-2 sm:p-2.5 bg-card rounded-2xl border border-border shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customers by company name, contact email, or phone number..."
            className="w-full h-8.5 pl-9 pr-3 py-1 text-xs bg-transparent border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Customer Table */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-muted/50 border-b border-border text-[11px] uppercase text-muted-foreground font-semibold tracking-wider">
              <tr>
                <th className="px-3.5 py-2">Customer / Organization</th>
                <th className="px-3 py-2">Contact Info</th>
                <th className="px-3 py-2">Billing Address</th>
                <th className="px-3.5 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-1.5 text-muted-foreground/50" />
                    <p className="font-semibold text-foreground">No customers found</p>
                    <p className="text-xs mt-0.5">Try adjusting your search criteria or add a new customer.</p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center border border-primary/20 shrink-0">
                          {customer.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-semibold text-foreground block group-hover:text-primary transition-colors text-xs sm:text-sm">
                            {customer.name}
                          </span>
                          {customer.notes && (
                            <span className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                              {customer.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="space-y-0.5">
                        {customer.email && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="w-3 h-3 text-muted-foreground/70" />
                            <a
                              href={`mailto:${customer.email}`}
                              className="hover:underline hover:text-foreground"
                            >
                              {customer.email}
                            </a>
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3 text-muted-foreground/70" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {customer.address ? (
                        <div className="flex items-start gap-1.5 text-xs text-muted-foreground max-w-xs">
                          <MapPin className="w-3 h-3 text-muted-foreground/70 shrink-0 mt-0.5" />
                          <span className="line-clamp-2 text-[11px]">{customer.address}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/60 italic">
                          No address specified
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditDrawer(customer)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary transition-colors cursor-pointer"
                          title={`Edit ${customer.name}`}
                          aria-label={`Edit ${customer.name}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(customer)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-destructive transition-colors cursor-pointer"
                          title={`Delete ${customer.name}`}
                          aria-label={`Delete ${customer.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Drawer for Add/Edit Customer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingCustomer ? 'Edit Customer Profile' : 'Add New Customer'}
        description="Configure billing details, contact contacts, and commercial credit lines."
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
              {isSubmitting ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Create Customer'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
              Customer / Company Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Metro Supermarket"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="purchasing@company.com"
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
              Billing / Delivery Address
            </label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Full street address, city, state, zip code..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
              Account Notes & Terms
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Net 30 terms, special delivery dock instructions..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </form>
      </Drawer>
    </div>
  );
}
