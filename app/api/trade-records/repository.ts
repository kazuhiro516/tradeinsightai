import { PAGINATION } from '@/constants/pagination';
import {
  TradeFilter,
  TradeRecord,
  TradeRecordsResponse,
  CreateTradeRecordInput,
  WhereCondition
} from './models'
import { PrismaClient } from '@prisma/client'
import { ulid } from 'ulid';

// トレードレコードリポジトリのインターフェース
export interface TradeRecordRepository {
  // トレードレコードを取得する
  findMany(userId: string, filter: TradeFilter): Promise<TradeRecordsResponse>;

  // トレードレコードを作成する
  create(userId: string, data: CreateTradeRecordInput): Promise<TradeRecord>;

  // フィルター条件を構築する
  buildWhereCondition(userId: string, filter: TradeFilter): WhereCondition;

  // ソート条件を構築する
  buildOrderBy(filter: TradeFilter): Record<string, 'asc' | 'desc'>;

  findById(id: string): Promise<TradeRecord | null>;
  findByUserId(userId: string): Promise<TradeRecord[]>;
  update(id: string, record: Partial<Omit<NonNullable<TradeRecord>, 'id'>>): Promise<TradeRecord>;
  delete(id: string): Promise<void>;
}

export class PrismaTradeRecordRepository implements TradeRecordRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async create(userId: string, data: CreateTradeRecordInput): Promise<TradeRecord> {
    // tradeFileIdの必須チェック
    if (!data.tradeFileId) {
      throw new Error(`取引記録の作成には取引ファイルIDが必要です。チケット番号: ${data.ticket}`);
    }

    // ticketとuserIdの組み合わせで重複チェック
    const existingRecord = await this.prisma.tradeRecord.findFirst({
      where: {
        userId,
        ticket: data.ticket
      }
    });

    // 重複が存在する場合は、既存のレコードを返す
    if (existingRecord) {
      return existingRecord;
    }

    // 閉じた価格が未設定の場合はエラー
    if (data.closePrice === undefined) {
      throw new Error(`取引記録の作成には閉じた価格が必要です。チケット番号: ${data.ticket}`);
    }

    // 新しいレコードを作成
    return this.prisma.tradeRecord.create({
      data: {
        id: data.id || ulid(),
        ticket: data.ticket,
        openTime: data.openTime,
        type: data.type,
        item: data.item,
        size: data.size,
        openPrice: data.openPrice,
        stopLoss: data.stopLoss ?? null,
        takeProfit: data.takeProfit ?? null,
        closeTime: data.closeTime ?? null,
        closePrice: data.closePrice,
        commission: data.commission ?? null,
        taxes: data.taxes ?? null,
        swap: data.swap ?? null,
        profit: data.profit ?? null,
        userId,
        tradeFileId: data.tradeFileId
      }
    });
  }

  async findMany(userId: string, filter: TradeFilter): Promise<TradeRecordsResponse> {
    const where = this.buildWhereCondition(userId, filter);
    const orderBy = this.buildOrderBy(filter);
    const page = filter.page || PAGINATION.DEFAULT_PAGE;
    const limit = filter.limit || PAGINATION.DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      this.prisma.tradeRecord.findMany({
        where,
        orderBy,
        skip,
        take: limit
      }),
      this.prisma.tradeRecord.count({ where })
    ]);

    return {
      records,
      total,
      page,
      pageSize: limit
    };
  }

  async findById(id: string): Promise<TradeRecord | null> {
    return this.prisma.tradeRecord.findUnique({
      where: { id }
    });
  }

  async findByUserId(userId: string): Promise<TradeRecord[]> {
    return this.prisma.tradeRecord.findMany({
      where: { userId }
    });
  }

  async update(id: string, record: Partial<Omit<NonNullable<TradeRecord>, 'id'>>): Promise<TradeRecord> {
    return this.prisma.tradeRecord.update({
      where: { id },
      data: record
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.tradeRecord.delete({
      where: { id }
    });
  }

  buildWhereCondition(userId: string, filter: TradeFilter): WhereCondition {
    const where: WhereCondition = { userId };

    if (filter.startDate || filter.endDate) {
      where.openTime = {};
      if (filter.startDate) {
        // 開始日は日付の始まり (00:00:00.000) に設定
        const startDate = new Date(filter.startDate);
        startDate.setHours(0, 0, 0, 0);
        where.openTime.gte = startDate;
      }
      if (filter.endDate) {
        // 終了日は日付の終わり (23:59:59.999) に設定
        const endDate = new Date(filter.endDate);
        endDate.setHours(23, 59, 59, 999);
        where.openTime.lte = endDate;
      }
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

    if (filter.sizeMin !== undefined || filter.sizeMax !== undefined) {
      where.size = {};
      if (filter.sizeMin !== undefined) {
        where.size.gte = filter.sizeMin;
      }
      if (filter.sizeMax !== undefined) {
        where.size.lte = filter.sizeMax;
      }
    }

    if (filter.profitMin !== undefined || filter.profitMax !== undefined) {
      where.profit = {};
      if (filter.profitMin !== undefined) {
        where.profit.gte = filter.profitMin;
      }
      if (filter.profitMax !== undefined) {
        where.profit.lte = filter.profitMax;
      }
    }

    return where;
  }

  buildOrderBy(filter: TradeFilter): Record<string, 'asc' | 'desc'> {
    const orderBy: Record<string, 'asc' | 'desc'> = {};

    const sortField = filter.orderBy || filter.sortBy || 'openTime';
    const sortDirection = filter.orderDirection || filter.sortOrder || 'desc';

    orderBy[sortField] = sortDirection;

    return orderBy;
  }
}
