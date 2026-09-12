'use client';

import React from 'react';
import {
  X,
  Printer,
  CheckCircle2,
  Receipt,
  DollarSign,
  TrendingUp,
  Layers,
  Sparkles,
} from 'lucide-react';

export interface CompletedSaleRecord {
  invoiceNo: string;
  customerName: string;
  saleDate: string;
  totalAmount: number;
  totalCogs: number;
  totalProfit: number;
  items: Array<{
    name: string;
    sku: string;
    qty: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
    totalCost: number;
    profit: number;
    lotsUsed?: Array<{
      batchCode: string;
      qty: number;
      unitCost: number;
    }>;
  }>;
}

interface InvoiceReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: CompletedSaleRecord | null;
}

export function InvoiceReceiptModal({
  isOpen,
  onClose,
  sale,
}: InvoiceReceiptModalProps) {
  if (!isOpen || !sale) return null;

  const marginPct = sale.totalAmount > 0 ? (sale.totalProfit / sale.totalAmount) * 100 : 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-modal-title"
    >
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-2xl max-h-[90vh] bg-card border border-border rounded-3xl shadow-2xl flex flex-col z-10 overflow-hidden animate-in zoom-in-95 duration-200 print:border-none print:shadow-none print:max-h-full print:w-full">
        {/* Header - Hidden during print */}
        <div className="px-6 py-4 border-b border-border bg-muted/40 flex items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 id="receipt-modal-title" className="text-lg font-bold tracking-tight text-foreground">
                Sale Completed Successfully
              </h2>
              <p className="text-xs text-muted-foreground">
                Multi-batch inventory lots deducted & transaction committed.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Invoice</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 print:p-0 print:overflow-visible">
          {/* Brand & Invoice Header */}
          <div className="flex items-start justify-between pb-6 border-b border-border">
            <div>
              <div className="flex items-center gap-2 font-black text-xl text-foreground">
                <Sparkles className="w-5 h-5 text-primary" />
                <span>Apex POS</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Enterprise Multi-Batch Inventory & Retail Engine
              </p>
            </div>
            <div className="text-right">
              <span className="font-mono text-xs font-bold text-muted-foreground block">
                INVOICE #
              </span>
              <span className="font-mono text-base font-black text-foreground">
                {sale.invoiceNo}
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">Date: {sale.saleDate}</p>
            </div>
          </div>

          {/* Customer & Billing Info */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="font-semibold text-muted-foreground uppercase tracking-wider block">
                Billed To:
              </span>
              <span className="text-sm font-bold text-foreground mt-0.5 block">
                {sale.customerName}
              </span>
            </div>
            <div className="text-right">
              <span className="font-semibold text-muted-foreground uppercase tracking-wider block">
                Payment Status:
              </span>
              <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3" />
                <span>Paid / Finalized</span>
              </span>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-border rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border font-bold uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Item Description</th>
                  <th className="px-3 py-3 text-center">Qty</th>
                  <th className="px-3 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sale.items.map((item, idx) => (
                  <React.Fragment key={idx}>
                    <tr className="hover:bg-muted/20">
                      <td className="px-4 py-2.5 font-medium text-foreground">
                        <div>{item.name}</div>
                        <span className="font-mono text-[11px] text-muted-foreground">{item.sku}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center font-bold">
                        {item.qty} {item.unit}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono">
                        ${item.unitPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-foreground">
                        ${item.totalPrice.toFixed(2)}
                      </td>
                    </tr>
                    {item.lotsUsed && item.lotsUsed.length > 0 && (
                      <tr className="bg-muted/10">
                        <td colSpan={4} className="px-4 py-1.5 text-[11px] text-muted-foreground">
                          <span className="font-semibold">Batch Allocation: </span>
                          {item.lotsUsed.map((lot, lIdx) => (
                            <span key={lIdx} className="mr-2 font-mono">
                              [{lot.batchCode}: {lot.qty} units @ ${lot.unitCost.toFixed(2)}]
                            </span>
                          ))}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Summary */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-muted/30 border border-border">
            <div className="space-y-1 text-xs">
              <div>
                <span className="text-muted-foreground">Cost of Goods Sold (COGS): </span>
                <strong className="font-mono font-semibold text-foreground">
                  ${sale.totalCogs.toFixed(2)}
                </strong>
              </div>
              <div>
                <span className="text-muted-foreground">Net Order Profit: </span>
                <strong className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  +${sale.totalProfit.toFixed(2)}
                </strong>{' '}
                <span className="text-[11px] text-muted-foreground">
                  ({marginPct.toFixed(1)}% margin)
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Total Amount Paid
              </span>
              <span className="text-2xl font-black text-foreground font-mono">
                ${sale.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Footer - Hidden in print */}
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-end gap-3 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-md shadow-primary/20 hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary transition-all cursor-pointer"
          >
            Start New Sale
          </button>
        </div>
      </div>
    </div>
  );
}
