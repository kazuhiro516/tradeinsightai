import { PrismaClient } from '@prisma/client';

/**
 * トレードフィルターのインターフェース
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
 * トレードレコードの型定義
 */
export type TradeRecord = Awaited<ReturnType<PrismaClient['tradeRecord']['findUnique']>>;

/**
 * トレードレコードのページネーションレスポンス
 */
export interface TradeRecordsResponse {
  records: TradeRecord[];
  total: number;
  page: number;
  pageSize: number;
  error?: string;
  details?: string;
}

/**
 * データベース検索条件の型定義
 */
export type WhereCondition = {
  userId?: string;
  openTime?: {
    gte?: Date;
    lte?: Date;
  };
  size?: {
    gte?: number;
    lte?: number;
  };
  profit?: {
    gte?: number;
    lte?: number;
  };
  openPrice?: {
    gte?: number;
    lte?: number;
  };
  type?: string;
  item?: string;
  ticket?: number;
};

/**
 * トレードレコード作成入力の型定義
 */
export interface CreateTradeRecordInput {
  id?: string;
  tradeFileId?: string;
  ticket: number;
  openTime: Date;
  type: string;
  item: string;
  size: number;
  openPrice: number;
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
