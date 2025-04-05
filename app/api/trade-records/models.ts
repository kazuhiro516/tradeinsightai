import { PrismaClient } from '@prisma/client';

// フィルターのインターフェース
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

// トレードレコードのインターフェース
export type TradeRecord = Awaited<ReturnType<PrismaClient['tradeRecord']['findUnique']>>;

// レスポンスのインターフェース
export interface TradeRecordsResponse {
  records: TradeRecord[];
  total: number;
  page: number;
  limit: number;
}

// データベース用のフィルター条件
export type WhereCondition = Record<string, any>;

// トレードレコード作成のインターフェース
export interface CreateTradeRecordRequest {
  tradeFileId: string;
  ticket?: number;
  openTime?: Date;
  type?: string;
  symbol?: string;
  size?: number;
  openPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  closeTime?: Date;
  closePrice?: number;
  commission?: number;
  taxes?: number;
  swap?: number;
  profit?: number;
  [key: string]: string | number | Date | undefined;
} 