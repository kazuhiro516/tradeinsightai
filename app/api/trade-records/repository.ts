import { 
  TradeFilter, 
  TradeRecord, 
  TradeRecordsResponse, 
  CreateTradeRecordRequest,
  WhereCondition
} from './models'
import { PrismaClient } from '@prisma/client'
import { ulid } from 'ulid';

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
        id: data.id || ulid(),
        userId,
        ticket: data.ticket,
        openTime: data.openTime,
        type: data.type,
        item: data.item,
        size: data.size,
        openPrice: data.openPrice,
        stopLoss: data.stopLoss,
        takeProfit: data.takeProfit,
        closeTime: data.closeTime,
        closePrice: data.closePrice,
        commission: data.commission,
        taxes: data.taxes,
        swap: data.swap,
        profit: data.profit
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