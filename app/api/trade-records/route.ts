import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/utils/supabase/server'
import { TradeRecordUseCase } from './usecase'
import { PrismaTradeRecordRepository } from './database'

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

    // ユースケースを初期化
    const repository = new PrismaTradeRecordRepository()
    const useCase = new TradeRecordUseCase(repository)

    // フィルターを解析
    const filter = useCase.parseFilterJson(filterStr)

    // トレードレコードを取得
    const response = await useCase.getTradeRecords(dbUser.id, filter)

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

    // ユースケースを初期化
    const repository = new PrismaTradeRecordRepository()
    const useCase = new TradeRecordUseCase(repository)

    // トレードレコードを作成
    const record = await useCase.createTradeRecord(dbUser.id, recordData)

    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error('トレードレコード作成エラー:', error)
    return NextResponse.json(
      { error: 'トレードレコードの作成に失敗しました' },
      { status: 500 }
    )
  }
}
