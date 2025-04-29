import { prisma } from '@/lib/prisma'
import {
  TradeFilter,
  TradeRecord,
  TradeRecordsResponse,
  CreateTradeRecordInput,
  WhereCondition
} from './models'
import { TradeRecordRepository } from './repository'
import { PAGINATION } from '@/constants/pagination'

// Prismaを使用したトレードレコードリポジトリの実装
export class PrismaTradeRecordRepository implements TradeRecordRepository {
  // トレードレコードを取得する
  async findMany(userId: string, filter: TradeFilter): Promise<TradeRecordsResponse> {
    // ページネーション設定
    const page = filter.page || PAGINATION.DEFAULT_PAGE
    const limit = filter.pageSize || filter.limit || PAGINATION.DEFAULT_PAGE_SIZE
    const skip = (page - 1) * limit

    // フィルター条件を構築
    const where = this.buildWhereCondition(userId, filter)
    const orderBy = this.buildOrderBy(filter)

    // レコードを取得
    const [records, total] = await Promise.all([
      prisma.tradeRecord.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.tradeRecord.count({ where }),
    ])

    // レスポンスを返す
    return {
      records,
      total,
      page,
      pageSize: limit,
    }
  }

  // IDでトレードレコードを取得する
  async findById(id: string): Promise<TradeRecord | null> {
    return prisma.tradeRecord.findUnique({
      where: { id },
    })
  }

  // ユーザーIDでトレードレコードを取得する
  async findByUserId(userId: string): Promise<TradeRecord[]> {
    return prisma.tradeRecord.findMany({
      where: { userId },
    })
  }

  // トレードレコードを更新する
  async update(id: string, record: Partial<Omit<NonNullable<TradeRecord>, 'id'>>): Promise<TradeRecord> {
    return prisma.tradeRecord.update({
      where: { id },
      data: record,
    })
  }

  // トレードレコードを削除する
  async delete(id: string): Promise<void> {
    await prisma.tradeRecord.delete({
      where: { id },
    })
  }

  // トレードレコードを作成する
  async create(userId: string, data: CreateTradeRecordInput): Promise<TradeRecord> {
    if (data.id === undefined) {
      throw new Error('id is required')
    }
    if (data.tradeFileId === undefined) {
      throw new Error('tradeFileId is required')
    }
    // トレードレコードを作成
    return prisma.tradeRecord.create({
      data: {
        id: data.id,
        userId,
        ticket: data.ticket,
        openTime: new Date(data.openTime),
        type: data.type,
        size: data.size || 0,
        item: data.item,
        openPrice: data.openPrice || 0,
        stopLoss: data.stopLoss || 0,
        takeProfit: data.takeProfit || 0,
        closeTime: data.closeTime ? new Date(data.closeTime) : null,
        closePrice: data.closePrice || 0,
        commission: data.commission || 0,
        taxes: data.taxes || 0,
        swap: data.swap || 0,
        profit: data.profit || 0,
        tradeFileId: data.tradeFileId,
      },
    })
  }

  // フィルター条件を構築する
  buildWhereCondition(userId: string, filter: TradeFilter): WhereCondition {
    const where: WhereCondition = { userId }

    if (filter.startDate || filter.endDate) {
      where.openTime = {}
      if (filter.startDate) {
        // 文字列の場合はDate型に変換
        const start = typeof filter.startDate === 'string' ? new Date(filter.startDate) : filter.startDate;
        where.openTime.gte = start;
      }
      if (filter.endDate) {
        // 文字列の場合はDate型に変換
        const end = typeof filter.endDate === 'string' ? new Date(filter.endDate) : filter.endDate;
        where.openTime.lte = end;
      }
    }

    if (filter.ticket) {
      where.ticket = filter.ticket
    }

    if (filter.type) {
      where.type = filter.type
    }

    if (filter.items && Array.isArray(filter.items) && filter.items.length > 0) {
      where.item = { in: filter.items };
    }

    if (filter.sizeMin !== undefined || filter.sizeMax !== undefined) {
      where.size = {}
      if (filter.sizeMin !== undefined) {
        where.size.gte = filter.sizeMin
      }
      if (filter.sizeMax !== undefined) {
        where.size.lte = filter.sizeMax
      }
    }

    if (filter.profitType && filter.profitType !== 'all') {
      where.profit = {
        [filter.profitType === 'profit' ? 'gte' : 'lte']: filter.profitType === 'profit' ? 0 : 0
      }
    }

    return where
  }

  // ソート条件を構築する
  buildOrderBy(filter: TradeFilter): Record<string, 'asc' | 'desc'> {
    const orderBy: Record<string, 'asc' | 'desc'> = {}

    // startDateをopenTimeに変換
    const sortField = (filter.sortBy || 'openTime') === 'startDate' ? 'openTime' : (filter.sortBy || 'openTime')
    const sortDirection = filter.sortOrder || 'desc'

    orderBy[sortField] = sortDirection

    return orderBy
  }

  // 通貨ペアのユニークリストを取得
  async getUniqueCurrencyPairs(userId: string): Promise<string[]> {
    try {
      const uniquePairs = await prisma.tradeRecord.findMany({
        where: { userId },
        select: { item: true },
        distinct: ['item'],
        orderBy: { item: 'asc' }
      });
      return uniquePairs
        .map(record => record.item)
        .filter((item): item is string => item !== null && item !== undefined);
    } catch (error) {
      console.error('通貨ペア取得エラー:', error);
      throw error;
    }
  }
}
