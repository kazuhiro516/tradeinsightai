import { TradeFilter, WhereCondition } from '@/types/trade';

/**
 * フィルター条件を構築する
 */
export const buildWhereCondition = (userId: string, filter: TradeFilter): WhereCondition => {
  const where: WhereCondition = { userId };

  if (filter.startDate || filter.endDate) {
    where.openTime = {};
    if (filter.startDate) {
      const startDate = new Date(filter.startDate);
      startDate.setHours(0, 0, 0, 0);
      where.openTime.gte = startDate;
    }
    if (filter.endDate) {
      const endDate = new Date(filter.endDate);
      endDate.setHours(23, 59, 59, 999);
      where.openTime.lte = endDate;
    }
  }

  if (filter.ticket) {
    where.ticket = filter.ticket;
  }

  if (filter.type) {
    if (Array.isArray(filter.type)) {
      where.type = { in: filter.type };
    } else {
      where.type = filter.type;
    }
  }

  if (filter.items && Array.isArray(filter.items) && filter.items.length > 0) {
    where.item = { in: filter.items };
  }

  if (filter.sizeMin !== undefined || filter.sizeMax !== undefined) {
    where.size = {};
    if (filter.sizeMin !== undefined) {
      where.size.gte = filter.sizeMin;
    }
    if (filter.sizeMax !== undefined) {
      where.size.lte = filter.sizeMax;
    }
  }

  console.log('Filter:', filter);
  console.log('Where condition:', where);

  return where;
};

/**
 * ソート条件を構築する
 */
export const buildOrderBy = (filter: TradeFilter): Record<string, 'asc' | 'desc'> => {
  const orderBy: Record<string, 'asc' | 'desc'> = {};

  const sortField = filter.sortBy || 'openTime';
  const sortDirection = filter.sortOrder || 'desc';

  orderBy[sortField] = sortDirection;

  return orderBy;
};

/**
 * Prismaのレコードを変換する
 */
export const convertPrismaRecord = (record: {
  id: string;
  ticket: number;
  openTime: Date;
  type: string;
  size: number;
  item: string;
  openPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  closeTime: Date | null;
  closePrice: number | null;
  commission: number | null;
  taxes: number | null;
  swap: number | null;
  profit: number | null;
  userId: string;
  tradeFileId: string;
  createdAt: Date;
  updatedAt: Date;
}) => {
  return {
    id: record.id,
    ticket: record.ticket,
    openTime: record.openTime.toISOString(),
    type: record.type,
    size: record.size,
    item: record.item,
    openPrice: record.openPrice,
    stopLoss: record.stopLoss ?? undefined,
    takeProfit: record.takeProfit ?? undefined,
    closeTime: record.closeTime?.toISOString() || undefined,
    closePrice: record.closePrice ?? undefined,
    commission: record.commission ?? undefined,
    taxes: record.taxes ?? undefined,
    swap: record.swap ?? undefined,
    profit: record.profit ?? undefined,
    userId: record.userId,
    tradeFileId: record.tradeFileId,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
};
