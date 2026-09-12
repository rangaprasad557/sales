export interface SearchProductQueryDto {
  query?: string;
  categoryId?: number;
  lowStockOnly?: boolean;
  fuzzy?: boolean;
}

export interface SemanticSearchDto {
  embedding?: number[];
  queryText?: string;
  limit?: number;
}
