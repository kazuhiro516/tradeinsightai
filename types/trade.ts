/**
 * トレードファイルの型定義
 */
export interface TradeFile {
  id: string;
  fileName: string;
  uploadDate: string;
  fileSize: number;
  status: string;
  recordsCount: number;
  errorMessage: string | null;
}

/**
 * フィルターオブジェクトの型定義
 */
export interface TradeFilter {
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  ticket?: number;
  type?: string;
  item?: string;
  sizeMin?: number;
  sizeMax?: number;
  profitMin?: number;
  profitMax?: number;
  openPriceMin?: number;
  openPriceMax?: number;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  symbol?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  limit?: number;
}

/**
 * 取引記録の型定義
 */
export interface TradeRecord {
  id: string;
  ticket: number;
  openTime: Date;
  type: string;
  size: number;
  item: string;
  openPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  closeTime?: Date;
  closePrice: number;
  commission?: number;
  taxes?: number;
  swap?: number;
  profit?: number;
  userId: string;
  tradeFileId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 取引記録のレスポンス型定義
 */
export interface TradeRecordsResponse {
  records: TradeRecord[];
  total: number;
  page: number;
  pageSize: number;
  error?: string;
  details?: string;
}
