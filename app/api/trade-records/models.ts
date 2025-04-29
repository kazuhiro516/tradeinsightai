import { PrismaClient } from '@prisma/client';

/**
 * 取引タイプの定義
 */
export type TradeType = 'buy' | 'sell';

/**
 * 利益タイプの定義
 */
export type ProfitType = 'profit' | 'loss' | 'all';

/**
 * トレードフィルターのインターフェース
 */
export interface TradeFilter {
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  ticket?: number;
  type?: TradeType;
  item?: string;
  sizeMin?: number;
  sizeMax?: number;
  profitType?: ProfitType;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
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

export const buildWhereCondition = (filter: TradeFilter): WhereCondition => {
  const where: WhereCondition = {};

  if (filter.userId) {
    where.userId = filter.userId;
  }

  if (filter.startDate) {
    where.openTime = {
      ...where.openTime,
      gte: filter.startDate,
    };
  }

  if (filter.endDate) {
    where.openTime = {
      ...where.openTime,
      lte: filter.endDate,
    };
  }

  if (filter.ticket) {
    where.ticket = filter.ticket;
  }

  if (filter.type) {
    where.type = filter.type;
  }

  if (filter.item) {
    where.item = filter.item;
  }

  if (filter.sizeMin !== undefined) {
    where.size = {
      ...where.size,
      gte: filter.sizeMin,
    };
  }

  if (filter.sizeMax !== undefined) {
    where.size = {
      ...where.size,
      lte: filter.sizeMax,
    };
  }

  if (filter.profitType && filter.profitType !== 'all') {
    where.profit = {
      ...where.profit,
      [filter.profitType === 'profit' ? 'gt' : 'lt']: 0,
    };
  }

  return where;
};
