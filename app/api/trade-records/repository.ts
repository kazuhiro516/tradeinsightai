import { 
  TradeFilter, 
  TradeRecord, 
  TradeRecordsResponse, 
  CreateTradeRecordRequest,
  WhereCondition
} from './models'
import { PrismaClient } from '@prisma/client'

// トレードレコードリポジトリのインターフェース
export interface TradeRecordRepository {
  // トレードレコードを取得する
  findMany(userId: string, filter: TradeFilter): Promise<TradeRecordsResponse>;
  
  // トレードレコードを作成する
  create(userId: string, data: CreateTradeRecordRequest): Promise<TradeRecord>;
  
  // フィルター条件を構築する
  buildWhereCondition(userId: string, filter: TradeFilter): WhereCondition;
  
  // ソート条件を構築する
  buildOrderBy(filter: TradeFilter): Record<string, 'asc' | 'desc'>;

  findById(id: string): Promise<TradeRecord | null>;
  findByUserId(userId: string): Promise<TradeRecord[]>;
  update(id: string, record: Partial<TradeRecord>): Promise<TradeRecord>;
  delete(id: string): Promise<void>;
}

export class PrismaTradeRecordRepository implements TradeRecordRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async create(userId: string, data: CreateTradeRecordRequest): Promise<TradeRecord> {
    return this.prisma.tradeRecord.create({
      data: {
        ...data,
        userId
      }
    });
  }

  async findMany(userId: string, filter: TradeFilter): Promise<TradeRecordsResponse> {
    const where = this.buildWhereCondition(userId, filter);
    const orderBy = this.buildOrderBy(filter);
    const page = filter.page || 1;
    const limit = filter.limit || 10;
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
      limit
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

  async update(id: string, record: Partial<TradeRecord>): Promise<TradeRecord> {
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
        where.openTime.gte = filter.startDate;
      }
      if (filter.endDate) {
        where.openTime.lte = filter.endDate;
      }
    }

    if (filter.symbol) {
      where.symbol = filter.symbol;
    }

    return where;
  }

  buildOrderBy(filter: TradeFilter): Record<string, 'asc' | 'desc'> {
    const orderBy: Record<string, 'asc' | 'desc'> = {};
    const field = filter.orderBy || 'openTime';
    const direction = filter.orderDirection || 'desc';
    orderBy[field] = direction;
    return orderBy;
  }
} 