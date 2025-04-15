import { prisma } from '@/lib/prisma'
import { 
  TradeFilter, 
  TradeRecord, 
  TradeRecordsResponse, 
  WhereCondition,
  CreateTradeRecordInput
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
  async update(id: string, data: Partial<Omit<TradeRecord, 'id'>>): Promise<TradeRecord> {
    return prisma.tradeRecord.update({
      where: { id },
      data,
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
    const where: WhereCondition = {
      userId,
    }

    // 日付フィルター
    if (filter.startDate) {
      where.openTime = {
        gte: new Date(filter.startDate),
        ...(filter.endDate && { lte: new Date(filter.endDate) })
      }
    } else if (filter.endDate) {
      where.openTime = {
        lte: new Date(filter.endDate)
      }
    }

    // 取引タイプフィルター
    if (filter.type) {
      where.type = filter.type
    }

    // 通貨ペアフィルター
    if (filter.item) {
      where.item = filter.item
    }

    // サイズフィルター
    if (filter.sizeMin !== undefined) {
      where.size = {
        gte: filter.sizeMin,
        ...(filter.sizeMax !== undefined && { lte: filter.sizeMax })
      }
    } else if (filter.sizeMax !== undefined) {
      where.size = {
        lte: filter.sizeMax
      }
    }

    // 利益フィルター
    if (filter.profitMin !== undefined) {
      where.profit = {
        gte: filter.profitMin,
        ...(filter.profitMax !== undefined && { lte: filter.profitMax })
      }
    } else if (filter.profitMax !== undefined) {
      where.profit = {
        lte: filter.profitMax
      }
    }

    // オープン価格フィルター
    if (filter.openPriceMin !== undefined) {
      where.openPrice = {
        gte: filter.openPriceMin,
        ...(filter.openPriceMax !== undefined && { lte: filter.openPriceMax })
      }
    } else if (filter.openPriceMax !== undefined) {
      where.openPrice = {
        lte: filter.openPriceMax
      }
    }

    // チケット番号フィルター
    if (filter.ticket) {
      where.ticket = filter.ticket
    }

    return where
  }

  // ソート条件を構築する
  buildOrderBy(filter: TradeFilter): Record<string, 'asc' | 'desc'> {
    const orderBy: Record<string, 'asc' | 'desc'> = {}
    if (filter.sortBy) {
      orderBy[filter.sortBy] = filter.sortOrder || 'desc'
    } else {
      orderBy.openTime = 'desc' // デフォルトはオープン時間の降順
    }
    return orderBy
  }
} 