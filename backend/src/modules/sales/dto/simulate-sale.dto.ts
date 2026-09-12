export interface ManualLotAllocationDto {
  lotId?: number;
  lot_id?: number;
  quantity?: number;
  qty?: number;
}

export interface SaleItemInputDto {
  productId?: number;
  product_id?: number;
  quantity?: number;
  qty?: number;
  unitSalePrice?: number;
  unit_sale_price?: number;
  allocationType?: string; // 'AUTO_LOWEST_COST' | 'MANUAL_OVERRIDE' | 'AUTO' | 'MANUAL'
  allocation_mode?: string;
  selectedLotId?: number;
  selected_lot_id?: number;
  manualLots?: ManualLotAllocationDto[];
  manual_lots?: ManualLotAllocationDto[];
}

export interface SimulateSaleDto {
  items: SaleItemInputDto[];
}
