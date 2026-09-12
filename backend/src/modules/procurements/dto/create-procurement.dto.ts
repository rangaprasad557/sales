export const VALID_SOURCES = [
  'Wholesale Shop',
  'Quick Commerce',
  'E-Commerce',
  'Other',
] as const;

export type ProcurementSource = typeof VALID_SOURCES[number];

export interface ProcurementItemDto {
  productId: number;
  quantity: number;
  unitCost: string | number;
  batchNumber?: string;
  expiryDate?: string;
}

export interface CreateProcurementDto {
  supplierId?: number;
  source: ProcurementSource | string;
  invoiceNumber?: string;
  procurementDate?: string;
  notes?: string;
  items: ProcurementItemDto[];
}
