'use client';

import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Plus,
  Layers,
  Tag,
  Package,
} from 'lucide-react';

export interface CategoryNode {
  id: number;
  name: string;
  code: string;
  description?: string;
  icon?: string;
  parentId?: number | null;
  productCount?: number;
  children?: CategoryNode[];
}

interface CategoryTreeProps {
  categories: CategoryNode[];
  selectedCategoryId?: number | null;
  onSelectCategory?: (category: CategoryNode) => void;
  onAddSubcategory?: (parentCategory: CategoryNode) => void;
}

export function CategoryTree({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onAddSubcategory,
}: CategoryTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Record<number, boolean>>({});

  const toggleExpand = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderNode = (node: CategoryNode, depth = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedIds[node.id] ?? true; // default expanded
    const isSelected = selectedCategoryId === node.id;

    return (
      <div key={node.id} className="select-none">
        <div
          onClick={() => onSelectCategory?.(node)}
          className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
            isSelected
              ? 'bg-primary/10 text-primary border border-primary/30 shadow-sm font-semibold'
              : 'hover:bg-muted/70 text-foreground border border-transparent'
          }`}
          style={{ paddingLeft: `${Math.max(12, depth * 24 + 12)}px` }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => toggleExpand(node.id, e)}
                className="p-1 -ml-1 text-muted-foreground hover:text-foreground rounded hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={isExpanded ? 'Collapse category' : 'Expand category'}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            ) : (
              <span className="w-4 h-4 inline-block -ml-1 text-muted-foreground/40 text-center">•</span>
            )}

            <div className="w-7 h-7 rounded-lg bg-card flex items-center justify-center border border-border shadow-xs shrink-0 text-primary">
              {hasChildren ? (
                isExpanded ? (
                  <FolderOpen className="w-4 h-4" />
                ) : (
                  <Folder className="w-4 h-4" />
                )
              ) : (
                <Tag className="w-4 h-4" />
              )}
            </div>

            <div className="truncate">
              <span className="text-sm font-medium tracking-tight truncate block">
                {node.name}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground block">
                {node.code}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {typeof node.productCount === 'number' && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-medium border border-border">
                <Package className="w-3 h-3 text-muted-foreground/70" />
                {node.productCount} items
              </span>
            )}

            {onAddSubcategory && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddSubcategory(node);
                }}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-opacity focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary"
                title={`Add subcategory under ${node.name}`}
                aria-label={`Add subcategory under ${node.name}`}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-0.5 space-y-0.5">
            {node.children!.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!categories || categories.length === 0) {
    return (
      <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-card/50">
        <Layers className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm font-medium text-foreground">No categories configured</p>
        <p className="text-xs text-muted-foreground mt-1">
          Create categories to organize your master product catalogue.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {categories.map((rootCategory) => renderNode(rootCategory, 0))}
    </div>
  );
}
