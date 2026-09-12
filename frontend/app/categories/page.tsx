'use client';

import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Search,
  FolderTree,
  Tag,
  Package,
  Folder,
  ChevronRight,
  FolderPlus,
  AlertCircle,
  LayoutGrid,
  ListTree,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Drawer } from '../../components/Drawer';
import { CategoryTree, CategoryNode } from '../../components/CategoryTree';
import { useUIStore } from '../../store/useUIStore';

const SEED_CATEGORY_TREE: CategoryNode[] = [
  {
    id: 1,
    name: 'Grains & Cereals',
    code: 'GRAINS',
    description: 'Bulk rice, whole wheat, legumes, and staple pulses',
    productCount: 8,
    children: [
      {
        id: 2,
        name: 'Basmati & Long Grain Rice',
        code: 'RICE-BASMATI',
        description: 'Premium aromatic aged Basmati and export-grade varieties',
        parentId: 1,
        productCount: 4,
      },
      {
        id: 3,
        name: 'Whole Wheat & Flours',
        code: 'WHEAT-FLOUR',
        description: 'Stone ground unbleached whole wheat and specialty flours',
        parentId: 1,
        productCount: 4,
      },
    ],
  },
  {
    id: 4,
    name: 'Oils & Condiments',
    code: 'OILS-COND',
    description: 'Cold-pressed culinary oils and condiments',
    productCount: 6,
    children: [
      {
        id: 5,
        name: 'Cold-Pressed Cooking Oils',
        code: 'OILS-COOKING',
        description: 'Mustard oil, sunflower, and extra virgin olive oils',
        parentId: 4,
        productCount: 3,
      },
      {
        id: 6,
        name: 'Spices & Seasonings',
        code: 'SPICES-RAW',
        description: 'Whole and ground pure spices',
        parentId: 4,
        productCount: 3,
      },
    ],
  },
  {
    id: 7,
    name: 'Packaged Foods & Snacks',
    code: 'SNACKS-PACKAGED',
    description: 'Quick consumer goods, biscuits, and packaged dry snacks',
    productCount: 5,
    children: [],
  },
];

export default function CategoriesPage() {
  const [categoryTree, setCategoryTree] = useState<CategoryNode[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'tree' | 'grid'>('tree');
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const { addNotification } = useUIStore();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    parentId: '',
    description: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Flattened list for parent selection
  const flattenCategories = (nodes: CategoryNode[]): CategoryNode[] => {
    let result: CategoryNode[] = [];
    for (const node of nodes) {
      result.push(node);
      if (node.children && node.children.length > 0) {
        result = result.concat(flattenCategories(node.children));
      }
    }
    return result;
  };

  const allFlatCategories = flattenCategories(categoryTree);

  // Fetch from backend API
  const fetchCategories = () => {
    fetch('/api/categories')
      .then((res) => {
        if (!res.ok) throw new Error('API unavailable');
        return res.json();
      })
      .then((data) => {
        const list = data.categories || (Array.isArray(data) ? data : []);
        if (list.length > 0) {
          const idMap: Record<number, CategoryNode> = {};
          const roots: CategoryNode[] = [];

          list.forEach((c: any) => {
            idMap[c.id] = {
              id: c.id,
              name: c.name,
              code: c.code || c.icon || `CAT-${c.id}`,
              description: c.description || '',
              parentId: c.parent_id || c.parentId || null,
              productCount: c.product_count || c.productCount || 0,
              children: [],
            };
          });

          list.forEach((c: any) => {
            const node = idMap[c.id];
            const pId = c.parent_id || c.parentId;
            if (pId && idMap[pId]) {
              idMap[pId].children!.push(node);
            } else {
              roots.push(node);
            }
          });

          setCategoryTree(roots);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const [editingCategory, setEditingCategory] = useState<CategoryNode | null>(null);

  const openCreateDrawer = (parent?: CategoryNode) => {
    setEditingCategory(null);
    setFormData({
      name: '',
      code: '',
      parentId: parent ? String(parent.id) : '',
      description: '',
    });
    setFormErrors({});
    setDrawerOpen(true);
  };

  const openEditDrawer = (cat: CategoryNode) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      code: cat.code,
      parentId: cat.parentId ? String(cat.parentId) : '',
      description: cat.description || '',
    });
    setFormErrors({});
    setDrawerOpen(true);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) {
      errors.name = 'Category name is required';
      addNotification('error', 'Category name is required');
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    const parentIdNum = formData.parentId ? parseInt(formData.parentId, 10) : null;
    const finalCode = (
      formData.code.trim() ||
      formData.name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 15)
    ).toUpperCase();

    const payload = {
      name: formData.name.trim(),
      icon: finalCode,
      parent_id: parentIdNum,
      description: formData.description.trim(),
    };

    try {
      if (editingCategory) {
        // UPDATE existing category
        const res = await fetch(`/api/categories/${editingCategory.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: 'Update failed' }));
          throw new Error(errData.error || 'Update failed');
        }
        addNotification('success', `Category "${formData.name.trim()}" updated successfully.`);
      } else {
        // CREATE new category
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: 'Create failed' }));
          throw new Error(errData.error || 'Create failed');
        }
        addNotification('success', `Category "${formData.name.trim()}" created successfully.`);
      }
      setDrawerOpen(false);
      setEditingCategory(null);
      fetchCategories();
    } catch (err: any) {
      addNotification('error', err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (cat: CategoryNode) => {
    if (!confirm(`Delete category "${cat.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/categories/${cat.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Delete failed' }));
        throw new Error(errData.error || 'Delete failed');
      }
      addNotification('success', `Category "${cat.name}" deleted.`);
      if (selectedCategory?.id === cat.id) setSelectedCategory(null);
      fetchCategories();
    } catch (err: any) {
      addNotification('error', err.message || 'Delete failed');
    }
  };

  // Metrics
  const rootCount = categoryTree.length;
  const totalCount = allFlatCategories.length;
  const subcategoryCount = totalCount - rootCount;
  const totalProducts = allFlatCategories.reduce((acc, c) => acc + (c.productCount || 0), 0);

  // Filtered nodes
  const filterTree = (nodes: CategoryNode[], q: string): CategoryNode[] => {
    if (!q) return nodes;
    return nodes
      .map((node) => {
        const matchesSelf =
          node.name.toLowerCase().includes(q) ||
          node.code.toLowerCase().includes(q) ||
          (node.description && node.description.toLowerCase().includes(q));
        const filteredChildren = node.children ? filterTree(node.children, q) : [];
        if (matchesSelf || filteredChildren.length > 0) {
          return {
            ...node,
            children: filteredChildren,
          };
        }
        return null;
      })
      .filter(Boolean) as CategoryNode[];
  };

  const displayedTree = filterTree(categoryTree, searchQuery.toLowerCase());

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-medium text-xs uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4" />
            <span>Master Data Module</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Category Hierarchy
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize the master catalogue with multi-level parent and child category relationships.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openCreateDrawer()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20 hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Category</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Categories</span>
            <Layers className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground">{totalCount}</div>
          <p className="text-xs text-muted-foreground mt-1">All registered taxons</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Root Departments</span>
            <Folder className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-foreground">{rootCount}</div>
          <p className="text-xs text-muted-foreground mt-1">Top-level product groupings</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Subcategories</span>
            <FolderTree className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-foreground">{subcategoryCount}</div>
          <p className="text-xs text-muted-foreground mt-1">Nested classification levels</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Assigned SKUs</span>
            <Package className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground">{totalProducts}</div>
          <p className="text-xs text-muted-foreground mt-1">Items catalogued across hierarchy</p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2 bg-card rounded-2xl border border-border shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter categories by name or code..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-transparent border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex items-center gap-1 bg-muted p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode('tree')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'tree'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ListTree className="w-3.5 h-3.5" />
            <span>Tree View</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'grid'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Grid Cards</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Tree / Grid */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-primary" />
              <span>Hierarchical Category Structure</span>
            </h2>
            <button
              type="button"
              onClick={() => openCreateDrawer()}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              <span>New Root Department</span>
            </button>
          </div>

          {viewMode === 'tree' ? (
            <CategoryTree
              categories={displayedTree}
              selectedCategoryId={selectedCategory?.id}
              onSelectCategory={(cat) => setSelectedCategory(cat)}
              onAddSubcategory={(parent) => openCreateDrawer(parent)}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {allFlatCategories.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedCategory?.id === cat.id
                      ? 'border-primary bg-primary/5 shadow-xs'
                      : 'border-border bg-card hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                      <Tag className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                      {cat.code}
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground text-sm">{cat.name}</h3>
                  {cat.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {cat.description}
                    </p>
                  )}
                  <div className="mt-3 pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {cat.parentId ? 'Subcategory' : 'Root Category'}
                    </span>
                    <span className="font-medium text-foreground">
                      {cat.productCount || 0} items
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Category Inspector */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col">
          <h2 className="text-base font-bold text-foreground mb-4 pb-3 border-b border-border flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" />
            <span>Category Inspector</span>
          </h2>

          {selectedCategory ? (
            <div className="space-y-4 flex-1">
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Category Name
                </span>
                <h3 className="text-lg font-bold text-foreground mt-0.5">
                  {selectedCategory.name}
                </h3>
                <span className="inline-block mt-1 text-xs font-mono px-2 py-0.5 rounded bg-muted text-foreground border border-border">
                  {selectedCategory.code}
                </span>
              </div>

              {selectedCategory.description && (
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Description
                  </span>
                  <p className="text-sm text-foreground bg-muted/40 p-3 rounded-xl border border-border">
                    {selectedCategory.description}
                  </p>
                </div>
              )}

              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Hierarchy Level:</span>
                  <span className="font-bold text-foreground">
                    {selectedCategory.parentId ? 'Child Subcategory' : 'Root Category'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Products Mapped:</span>
                  <span className="font-bold text-primary">
                    {selectedCategory.productCount || 0} SKUs
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Subcategories:</span>
                  <span className="font-bold text-foreground">
                    {selectedCategory.children?.length || 0}
                  </span>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => openEditDrawer(selectedCategory)}
                  className="w-full py-2 px-3 rounded-xl bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-blue-500/20"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit {selectedCategory.name}</span>
                </button>
                <button
                  type="button"
                  onClick={() => openCreateDrawer(selectedCategory)}
                  className="w-full py-2 px-3 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-primary/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Subcategory to {selectedCategory.name}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(selectedCategory)}
                  className="w-full py-2 px-3 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-destructive/20"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Category</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
              <FolderTree className="w-10 h-10 mb-3 text-muted-foreground/40" />
              <p className="text-sm font-semibold text-foreground">No Category Selected</p>
              <p className="text-xs mt-1">
                Click any category in the tree to inspect its metadata, child nodes, and SKU mappings.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Slide-over Drawer for Add Category */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingCategory ? `Edit Category: ${editingCategory.name}` : formData.parentId ? 'Add Subcategory' : 'Add Root Category'}
        description={editingCategory ? 'Modify category details and taxonomy hierarchy.' : 'Define category nomenclature, taxonomy hierarchy, and description.'}
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
              {isSubmitting ? 'Saving...' : editingCategory ? 'Update Category' : 'Save Category'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
              Category Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Basmati & Long Grain Rice"
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
              Category Code / Identifier <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="e.g. RICE-BASMATI"
              className={`w-full px-3.5 py-2.5 rounded-xl border font-mono bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                formErrors.code ? 'border-destructive' : 'border-border'
              }`}
            />
            {formErrors.code && (
              <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {formErrors.code}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
              Parent Category (Taxonomy Level)
            </label>
            <select
              value={formData.parentId}
              onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">-- None (Top-Level Root Department) --</option>
              {allFlatCategories.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.parentId ? '  ↳ ' : ''}{c.name} ({c.code})
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Leave blank to create a top-level department or select a parent to nest as a subcategory.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Scope of products included under this classification..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </form>
      </Drawer>
    </div>
  );
}
