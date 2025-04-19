import { prisma } from '@/lib/prisma'
import {
  TradeFilter,
  TradeRecord,
  TradeRecordsResponse,
  CreateTradeRecordInput,
  WhereCondition
} from './models'
import { TradeRecordRepository } from './repository'

// Prismaを使用したトレードレコードリポジトリの実装
export class PrismaTradeRecordRepository implements TradeRecordRepository {
  // トレードレコードを取得する
  async findMany(userId: string, filter: TradeFilter): Promise<TradeRecordsResponse> {
    // ページネーション設定
    const page = filter.page || 1
    const limit = filter.limit || 20
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
        where.openTime.gte = new Date(`${filter.startDate}T00:00:00.000Z`)
      }
      if (filter.endDate) {
        where.openTime.lte = new Date(`${filter.endDate}T23:59:59.999Z`)
      }
    }

    if (filter.ticket) {
      where.ticket = filter.ticket
    }

    if (filter.type) {
      where.type = filter.type
    }

    if (filter.item) {
      where.item = filter.item
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

    if (filter.profitMin !== undefined || filter.profitMax !== undefined) {
      where.profit = {}
      if (filter.profitMin !== undefined) {
        where.profit.gte = filter.profitMin
      }
      if (filter.profitMax !== undefined) {
        where.profit.lte = filter.profitMax
      }
    }

    return where
  }

  // ソート条件を構築する
  buildOrderBy(filter: TradeFilter): Record<string, 'asc' | 'desc'> {
    const orderBy: Record<string, 'asc' | 'desc'> = {}

    // startDateをopenTimeに変換
    const sortField = (filter.orderBy || filter.sortBy || 'openTime') === 'startDate' ? 'openTime' : (filter.orderBy || filter.sortBy || 'openTime')
    const sortDirection = filter.orderDirection || filter.sortOrder || 'desc'

    orderBy[sortField] = sortDirection

    return orderBy
  }
}
