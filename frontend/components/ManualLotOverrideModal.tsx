'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  Tag,
  DollarSign,
  Boxes,
  RotateCcw,
} from 'lucide-react';

export interface LotItem {
  id: number;
  batchCode: string;
  unitCost: number;
  remainingQty: number;
  procurementDate: string;
  source: string;
}

export interface LotAllocation {
  lotId: number;
  batchCode: string;
  unitCost: number;
  qty: number;
}

interface ManualLotOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  productId: number;
  requiredQty: number;
  unit: string;
  availableLots: LotItem[];
  currentAllocations: LotAllocation[];
  onSaveOverrides: (allocations: LotAllocation[]) => void;
  onResetToAutoLCF: () => void;
}

export function ManualLotOverrideModal({
  isOpen,
  onClose,
  productName,
  productId,
  requiredQty,
  unit,
  availableLots,
  currentAllocations,
  onSaveOverrides,
  onResetToAutoLCF,
}: ManualLotOverrideModalProps) {
  // lotId -> quantity allocated
  const [allocations, setAllocations] = useState<Record<number, number>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const initial: Record<number, number> = {};
      currentAllocations.forEach((alloc) => {
        initial[alloc.lotId] = alloc.qty;
      });
      setAllocations(initial);
      setError(null);
    }
  }, [isOpen, currentAllocations]);

  if (!isOpen) return null;

  const totalAllocated = Object.values(allocations).reduce((acc, q) => acc + (q || 0), 0);
  const remainingNeeded = requiredQty - totalAllocated;

  const handleQtyChange = (lotId: number, maxQty: number, valStr: string) => {
    const val = parseInt(valStr, 10);
    const qty = isNaN(val) ? 0 : Math.max(0, Math.min(val, maxQty));
    setAllocations((prev) => ({
      ...prev,
      [lotId]: qty,
    }));
    setError(null);
  };

  const handleSave = () => {
    if (totalAllocated !== requiredQty) {
      setError(
        `Total allocated quantity (${totalAllocated} ${unit}) must exactly equal required sale quantity (${requiredQty} ${unit}).`
      );
      return;
    }

    const result: LotAllocation[] = [];
    for (const lot of availableLots) {
      const q = allocations[lot.id] || 0;
      if (q > 0) {
        result.push({
          lotId: lot.id,
          batchCode: lot.batchCode,
          unitCost: lot.unitCost,
          qty: q,
        });
      }
    }

    onSaveOverrides(result);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="override-modal-title"
    >
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl flex flex-col z-10 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border bg-muted/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 id="override-modal-title" className="text-xl font-bold tracking-tight text-foreground">
                Manual Batch Selection Override
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Billing item: <strong className="text-foreground">{productName}</strong> ({requiredQty} {unit})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Summary Banner */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/50 border border-border text-xs">
            <div>
              <span className="text-muted-foreground">Required Quantity:</span>{' '}
              <strong className="text-foreground text-sm">{requiredQty} {unit}</strong>
            </div>
            <div>
              <span className="text-muted-foreground">Total Allocated:</span>{' '}
              <strong
                className={`text-sm ${
                  totalAllocated === requiredQty
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {totalAllocated} {unit}
              </strong>
            </div>
            <div>
              <span className="text-muted-foreground">Remaining:</span>{' '}
              <strong
                className={`text-sm ${
                  remainingNeeded === 0 ? 'text-foreground' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {remainingNeeded} {unit}
              </strong>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Lots List */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
              Available Inventory Lots (Ranked by Acquisition Cost)
            </span>

            {availableLots.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground rounded-2xl border border-dashed border-border">
                No active lots available for this product.
              </div>
            ) : (
              availableLots.map((lot) => {
                const allocated = allocations[lot.id] || 0;
                return (
                  <div
                    key={lot.id}
                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                      allocated > 0
                        ? 'bg-primary/5 border-primary/40 shadow-xs'
                        : 'bg-card border-border hover:bg-muted/30'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted text-foreground border border-border">
                          {lot.batchCode}
                        </span>
                        <span className="text-xs font-bold text-primary">
                          ${lot.unitCost.toFixed(2)} / {unit}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>Available: <strong>{lot.remainingQty} {unit}</strong></span>
                        <span>•</span>
                        <span>Source: {lot.source}</span>
                        <span>•</span>
                        <span>Date: {lot.procurementDate}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <label className="text-xs font-medium text-muted-foreground">Bill Qty:</label>
                      <input
                        type="number"
                        min="0"
                        max={lot.remainingQty}
                        value={allocated === 0 ? '' : allocated}
                        onChange={(e) => handleQtyChange(lot.id, lot.remainingQty, e.target.value)}
                        placeholder="0"
                        className="w-20 px-3 py-1.5 text-center text-sm font-bold rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              onResetToAutoLCF();
              onClose();
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Auto Lowest-Cost-First</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={totalAllocated !== requiredQty}
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-md shadow-primary/20 hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40 transition-all cursor-pointer"
            >
              Apply Batch Override
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
