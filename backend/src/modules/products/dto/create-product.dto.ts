export interface CreateProductDto {
  sku: string;
  name: string;
  barcode?: string;
  categoryId?: number;
  unit?: string;
  minStockThreshold?: number;
  defaultSalePrice?: string;
  description?: string;
  embedding?: number[];
}

export interface UpdateProductDto extends Partial<CreateProductDto> {}
