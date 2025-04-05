// エラーレスポンスのインターフェース
export interface ErrorResponse {
  error: string;
  details?: string;
}

// トレードファイルのステータス
export type TradeFileStatus = 'pending' | 'processing' | 'completed' | 'failed';

// トレードファイルのインターフェース
export interface TradeFile {
  id: number;
  fileName: string;
  uploadDate: string;
  fileSize: number;
  fileType: string;
  status: TradeFileStatus;
  recordsCount: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

// トレードレコードのインターフェース
export interface TradeRecord {
  ticket: number;
  openTime: string;
  type: string;
  size: number;
  item: string;
  openPrice: number;
  stopLoss: number;
  takeProfit: number;
  closeTime: string;
  closePrice: number;
  commission: number;
  taxes: number;
  swap: number;
  profit: number;
} 