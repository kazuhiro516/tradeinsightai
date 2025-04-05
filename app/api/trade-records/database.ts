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
    const pageSize = filter.pageSize || 20
    const skip = (page - 1) * pageSize

    // フィルター条件を構築
    const where = this.buildWhereCondition(userId, filter)
    const orderBy = this.buildOrderBy(filter)

    // レコードを取得
    const [records, total] = await Promise.all([
      prisma.tradeRecord.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
      }),
      prisma.tradeRecord.count({ where }),
    ])

    // レスポンスを返す
    return {
      records: records.map((record: { 
        id: string;
        ticket: number;
        openTime: Date; 
        type: string;
        size: number;
        item: string;
        openPrice: number;
        stopLoss: number;
        takeProfit: number;
        closeTime: Date; 
        closePrice: number;
        commission: number;
        taxes: number;
        swap: number;
        profit: number;
        userId: string;
        createdAt: Date; 
        updatedAt: Date; 
      }) => ({
        ...record,
        openTime: record.openTime.toISOString(),
        closeTime: record.closeTime.toISOString(),
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    }
  }

  // トレードレコードを作成する
  async create(userId: string, data: CreateTradeRecordInput): Promise<TradeRecord> {
    // トレードレコードを作成
    const record = await prisma.tradeRecord.create({
      data: {
        ticket: data.ticket,
        openTime: new Date(data.openTime),
        type: data.type,
        size: data.size || 0,
        item: data.item,
        openPrice: data.openPrice || 0,
        stopLoss: data.stopLoss || 0,
        takeProfit: data.takeProfit || 0,
        closeTime: data.closeTime ? new Date(data.closeTime) : new Date(),
        closePrice: data.closePrice || 0,
        commission: data.commission || 0,
        taxes: data.taxes || 0,
        swap: data.swap || 0,
        profit: data.profit || 0,
        userId,
      },
    })

    // レスポンス形式に変換
    return {
      ...record,
      openTime: record.openTime.toISOString(),
      closeTime: record.closeTime.toISOString(),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    }
  }

  // フィルター条件を構築する
  buildWhereCondition(userId: string, filter: TradeFilter): WhereCondition {
    const where: WhereCondition = {
      userId,
    }

    // 日付フィルター
    if (filter.startDate) {
      where.openTime = {
        ...where.openTime,
        gte: new Date(filter.startDate),
      }
    }
    if (filter.endDate) {
      where.openTime = {
        ...where.openTime,
        lte: new Date(filter.endDate),
      }
    }

    // 取引タイプフィルター
    if (filter.types && filter.types.length > 0) {
      where.type = {
        in: filter.types,
      }
    }

    // 通貨ペアフィルター
    if (filter.items && filter.items.length > 0) {
      where.item = {
        in: filter.items,
      }
    }

    // サイズフィルター
    if (filter.sizeMin !== undefined) {
      where.size = {
        ...where.size,
        gte: filter.sizeMin,
      }
    }
    if (filter.sizeMax !== undefined) {
      where.size = {
        ...where.size,
        lte: filter.sizeMax,
      }
    }

    // 利益フィルター
    if (filter.profitMin !== undefined) {
      where.profit = {
        ...where.profit,
        gte: filter.profitMin,
      }
    }
    if (filter.profitMax !== undefined) {
      where.profit = {
        ...where.profit,
        lte: filter.profitMax,
      }
    }

    // オープン価格フィルター
    if (filter.openPriceMin !== undefined) {
      where.openPrice = {
        ...where.openPrice,
        gte: filter.openPriceMin,
      }
    }
    if (filter.openPriceMax !== undefined) {
      where.openPrice = {
        ...where.openPrice,
        lte: filter.openPriceMax,
      }
    }

    // チケット番号フィルター
    if (filter.ticketIds && filter.ticketIds.length > 0) {
      where.ticket = {
        in: filter.ticketIds,
      }
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