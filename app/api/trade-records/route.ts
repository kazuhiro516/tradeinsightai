import { NextRequest, NextResponse } from 'next/server'
import { TradeRecordUseCase } from './usecase'
import { PrismaTradeRecordRepository } from './database'
import { authenticateApiRequest, createErrorResponse, parseJsonSafely } from '@/utils/api'
import { formatJST } from '@/utils/date'

/**
 * トレードレコードを取得するAPI
 */
export async function GET(request: NextRequest) {
  try {
    // APIリクエストの認証と、ユーザーIDの取得
    const { userId, errorResponse } = await authenticateApiRequest(request);
    if (errorResponse) {
      return errorResponse;
    }

    // クエリパラメータを取得
    const searchParams = request.nextUrl.searchParams;
    const filterStr = searchParams.get('filter');

    // ユースケースを初期化
    const repository = new PrismaTradeRecordRepository();
    const useCase = new TradeRecordUseCase(repository);

    // フィルターを解析
    const filter = filterStr
      ? parseJsonSafely(filterStr, {})
      : {};

    // トレードレコードを取得
    const response = await useCase.getTradeRecords(userId!, filter);

    // 日時を日本時間に変換
    const formattedResponse = {
      ...response,
      records: response.records
        .filter((record): record is NonNullable<typeof record> => record !== null)
        .map(record => ({
          ...record,
          openTime: formatJST(record.openTime),
          closeTime: record.closeTime ? formatJST(record.closeTime) : null,
          createdAt: formatJST(record.createdAt),
          updatedAt: formatJST(record.updatedAt)
        }))
    };

    return NextResponse.json(formattedResponse);
  } catch (error) {
    console.error('トレードレコード取得エラー:', error);
    return createErrorResponse('トレードレコードの取得に失敗しました');
  }
}

/**
 * トレードレコードを作成するAPI
 */
export async function POST(request: NextRequest) {
  try {
    // APIリクエストの認証と、ユーザーIDの取得
    const { userId, errorResponse } = await authenticateApiRequest(request);
    if (errorResponse) {
      return errorResponse;
    }

    // リクエストボディを取得
    const recordData = await request.json();

    // ユースケースを初期化
    const repository = new PrismaTradeRecordRepository();
    const useCase = new TradeRecordUseCase(repository);

    // トレードレコードを作成
    const record = await useCase.createTradeRecord(userId!, recordData);

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error('トレードレコード作成エラー:', error);
    return createErrorResponse('トレードレコードの作成に失敗しました');
  }
}
