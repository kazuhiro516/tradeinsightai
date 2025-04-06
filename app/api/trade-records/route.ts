import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/utils/supabase/server'
import { TradeRecordUseCase } from './usecase'
import { PrismaTradeRecordRepository } from './database'

// トレードレコードを取得するAPI
export async function GET(request: NextRequest) {
  try {
    // 認証ヘッダーの取得と検証
    const authHeader = request.headers.get('authorization')
    console.log('認証ヘッダー:', authHeader ? '存在します' : '存在しません')
    
    if (!authHeader) {
      console.log('認証ヘッダーがありません')
      return NextResponse.json({ 
        error: '認証が必要です', 
        details: 'Authorization ヘッダーが含まれていません' 
      }, { status: 401 })
    }

    // Bearer トークンの抽出
    const parts = authHeader.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      console.log('認証ヘッダーの形式が不正です:', authHeader)
      return NextResponse.json({ 
        error: '認証ヘッダーの形式が不正です', 
        details: 'Authorization ヘッダーは "Bearer {token}" の形式である必要があります' 
      }, { status: 401 })
    }

    const token = parts[1]
    console.log('トークン:', token ? '存在します' : '存在しません')
    
    if (!token) {
      console.log('トークンがありません')
      return NextResponse.json({ 
        error: '認証トークンが無効です', 
        details: 'トークンが空です' 
      }, { status: 401 })
    }

    // 認証ユーザーを取得
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError) {
      console.error('Supabase認証エラー:', authError)
      return NextResponse.json({ 
        error: '認証に失敗しました', 
        details: authError.message 
      }, { status: 401 })
    }

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
    let filter = {}
    if (filterStr) {
      try {
        filter = JSON.parse(filterStr)
      } catch (error) {
        console.error('フィルターのパースに失敗:', error)
        return NextResponse.json(
          { error: '無効なフィルター形式です' },
          { status: 400 }
        )
      }
    }

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
