import { PrismaClient } from '@prisma/client';

// フィルターのインターフェース
export interface TradeFilter {
  userId?: string;
  startDate?: string;
  endDate?: string;
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
}

// トレードレコードのインターフェース
export type TradeRecord = Awaited<ReturnType<PrismaClient['tradeRecord']['findUnique']>>;

// レスポンスのインターフェース
export interface TradeRecordsResponse {
  records: TradeRecord[];
  total: number;
  page: number;
  pageSize: number;
}

// データベース用のフィルター条件
export interface WhereCondition {
  userId: string;
  openTime?: {
    gte?: Date;
    lte?: Date;
  };
  type?: {
    in: string[];
  };
  item?: {
    in: string[];
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
  ticket?: {
    in: number[];
  };
}

// トレードレコード作成のインターフェース
export interface CreateTradeRecordRequest {
  userId: string;
  ticket: number;
  openTime: string;
  type: string;
  size: number;
  item: string;
  openPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  closeTime?: string;
  closePrice?: number;
  commission?: number;
  taxes?: number;
  swap?: number;
  profit?: number;
} 