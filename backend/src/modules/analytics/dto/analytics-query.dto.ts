export interface AnalyticsQueryDto {
  granularity?: 'day' | 'week' | 'month' | 'year' | string;
  from_date?: string;
  fromDate?: string;
  to_date?: string;
  toDate?: string;
  productId?: number;
  product_id?: number;
  customerId?: number;
  customer_id?: number;
}
