import { SaleItemInputDto } from './simulate-sale.dto';

export interface CreateSaleDto {
  customerId?: number | null;
  customer_id?: number | null;
  saleDate?: string;
  sale_date?: string;
  paymentMethod?: string;
  payment_method?: string;
  invoiceNumber?: string;
  invoice_no?: string;
  notes?: string;
  items: SaleItemInputDto[];
}
