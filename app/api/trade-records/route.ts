import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/utils/supabase/server'

// トレードレコードのフィルタリング用インターフェース
interface TradeFilter {
  ticketIds?: number[]
  startDate?: string
  endDate?: string
  types?: string[]
  items?: string[]
  sizeMin?: number
  sizeMax?: number
  profitMin?: number
  profitMax?: number
  openPriceMin?: number
  openPriceMax?: number
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// トレードレコードのレスポンス用インターフェース
interface TradeRecord {
  id: string
  ticket: number
  openTime: string
  type: string
  size: number
  item: string
  openPrice: number
  stopLoss: number
  takeProfit: number
  closeTime: string
  closePrice: number
  commission: number
  taxes: number
  swap: number
  profit: number
  userId: string
  createdAt: string
  updatedAt: string
}

// トレードレコードのレスポンス用インターフェース
interface TradeRecordsResponse {
  records: TradeRecord[]
  total: number
  page: number
  pageSize: number
}

// フィルター条件を構築
interface WhereCondition {
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

// フィルター文字列をJSONオブジェクトに変換する関数
function parseFilterJson(filterStr: string | null): TradeFilter {
  if (!filterStr) return {}
  try {
    return JSON.parse(filterStr)
  } catch (error) {
    console.error('フィルターの解析エラー:', error)
    return {}
  }
}

// トレードレコードを取得するAPI
export async function GET(request: NextRequest) {
  try {
    // 認証ユーザーを取得
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: '認証されていません' },
        { status: 401 }
      )
    }

    // ユーザーを取得
    const dbUser = await prisma.user.findUnique({
      where: {
        supabaseId: user.id,
      },
    })

    if (!dbUser) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // クエリパラメータを取得
    const searchParams = request.nextUrl.searchParams
    const filterStr = searchParams.get('filter')
    const filter = parseFilterJson(filterStr)

    // ページネーション設定
    const page = filter.page || 1
    const pageSize = filter.pageSize || 20
    const skip = (page - 1) * pageSize

    // フィルター条件を構築
    const where: WhereCondition = {
      userId: dbUser.id,
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

    // ソート設定
    const orderBy: Record<string, 'asc' | 'desc'> = {}
    if (filter.sortBy) {
      orderBy[filter.sortBy] = filter.sortOrder || 'desc'
    } else {
      orderBy.openTime = 'desc' // デフォルトはオープン時間の降順
    }

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
    const response: TradeRecordsResponse = {
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

    return NextResponse.json(response)
  } catch (error) {
    console.error('トレードレコード取得エラー:', error)
    return NextResponse.json(
      { error: 'トレードレコードの取得に失敗しました' },
      { status: 500 }
    )
  }
}

// トレードレコードを作成するAPI
export async function POST(request: NextRequest) {
  try {
    // 認証ユーザーを取得
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: '認証されていません' },
        { status: 401 }
      )
    }

    // ユーザーを取得
    const dbUser = await prisma.user.findUnique({
      where: {
        supabaseId: user.id,
      },
    })

    if (!dbUser) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // リクエストボディを取得
    const recordData = await request.json()

    // 必須パラメータの検証
    if (!recordData.ticket || !recordData.openTime || !recordData.type || !recordData.item) {
      return NextResponse.json(
        { error: '必須パラメータが不足しています' },
        { status: 400 }
      )
    }

    // トレードレコードを作成
    const record = await prisma.tradeRecord.create({
      data: {
        ticket: recordData.ticket,
        openTime: new Date(recordData.openTime),
        type: recordData.type,
        size: recordData.size || 0,
        item: recordData.item,
        openPrice: recordData.openPrice || 0,
        stopLoss: recordData.stopLoss || 0,
        takeProfit: recordData.takeProfit || 0,
        closeTime: recordData.closeTime ? new Date(recordData.closeTime) : new Date(),
        closePrice: recordData.closePrice || 0,
        commission: recordData.commission || 0,
        taxes: recordData.taxes || 0,
        swap: recordData.swap || 0,
        profit: recordData.profit || 0,
        userId: dbUser.id,
      },
    })

    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error('トレードレコード作成エラー:', error)
    return NextResponse.json(
      { error: 'トレードレコードの作成に失敗しました' },
      { status: 500 }
    )
  }
}
