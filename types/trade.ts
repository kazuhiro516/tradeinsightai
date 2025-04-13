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
  startDate?: string;
  endDate?: string;
  types?: string[];
  items?: string[];
  page?: number;
  pageSize?: number;
  ticketIds?: number[];
  sizeMin?: number;
  sizeMax?: number;
  profitMin?: number;
  profitMax?: number;
  openPriceMin?: number;
  openPriceMax?: number;
  sortBy?: string;
  sortOrder?: string;
  [key: string]: string | string[] | number[] | number | undefined;
}

/**
 * 取引記録の型定義
 */
export interface TradeRecord {
  id: number;
  ticketId: number;
  type: string;
  item: string;
  size: number;
  openPrice: number;
  closePrice: number;
  profit: number;
  startDate: string;
  endDate: string;
  userId: string;
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