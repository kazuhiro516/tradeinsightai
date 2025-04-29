import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { TradeFilter } from '@/types/trade';

/**
 * API認証エラーのレスポンスを作成する
 */
export function createAuthErrorResponse(message: string, details?: string, status = 401) {
  return NextResponse.json(
    {
      error: message,
      details: details
    },
    { status }
  );
}

/**
 * リクエストからトークンを取得
 */
export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return null;
  }

  // Bearer トークンの抽出
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1] || null;
}

/**
 * APIリクエストの認証を行い、ユーザーIDを取得する
 */
export async function authenticateApiRequest(request: NextRequest): Promise<{
  userId: string | null;
  errorResponse: NextResponse | null;
}> {
  try {
    const token = getTokenFromRequest(request);

    if (!token) {
      return {
        userId: null,
        errorResponse: createAuthErrorResponse(
          '認証が必要です',
          'Authorization ヘッダーは "Bearer {token}" の形式である必要があります'
        )
      };
    }

    // 認証ユーザーを取得
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return {
        userId: null,
        errorResponse: createAuthErrorResponse(
          '認証に失敗しました',
          authError?.message || 'ユーザー情報が取得できませんでした'
        )
      };
    }

    // ユーザーを取得
    const dbUser = await prisma.user.findUnique({
      where: {
        supabaseId: user.id,
      },
    });

    if (!dbUser) {
      return {
        userId: null,
        errorResponse: createAuthErrorResponse(
          'ユーザーが見つかりません',
          'データベースにユーザー情報がありません',
          404
        )
      };
    }

    return { userId: dbUser.id, errorResponse: null };
  } catch (error) {
    return {
      userId: null,
      errorResponse: createAuthErrorResponse(
        '認証処理中にエラーが発生しました',
        error instanceof Error ? error.message : undefined,
        500
      )
    };
  }
}

/**
 * 標準的なエラーレスポンスを作成する
 */
export function createErrorResponse(message: string, status = 500) {
  return NextResponse.json(
    { error: message },
    { status }
  );
}

/**
 * JSONをパースする (エラーハンドリング付き)
 */
export function parseJsonSafely<T>(jsonString: string, defaultValue: T): T {
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error('JSONパースエラー:', error);
    return defaultValue;
  }
}

/**
 * クエリパラメータからTradeFilterを生成する共通関数
 */
export function parseTradeFilterFromParams(params: URLSearchParams): TradeFilter {
  // typeは'"buy"'または'"sell"'のみ許容
  const typeParam = params.getAll('type[]');
  const type = typeParam.length > 0 ? { in: typeParam } : undefined;

  // startDate/endDateはDate型、endDateは終端補正
  const startDateStr = params.get('startDate');
  const endDateStr = params.get('endDate');
  const startDate = startDateStr ? new Date(startDateStr) : undefined;
  const endDate = endDateStr ? (() => {
    const d = new Date(endDateStr);
    d.setHours(23, 59, 59, 999);
    return d;
  })() : undefined;

  // items配列を取得（items[]で統一）
  const items = params.getAll('items[]');

  return {
    userId: params.get('userId') || undefined,
    startDate,
    endDate,
    ticket: params.get('ticket') ? Number(params.get('ticket')) : undefined,
    type,
    items: items.length > 0 ? items : undefined,
    sizeMin: params.get('sizeMin') ? Number(params.get('sizeMin')) : undefined,
    sizeMax: params.get('sizeMax') ? Number(params.get('sizeMax')) : undefined,
    profitMin: params.get('profitMin') ? Number(params.get('profitMin')) : undefined,
    profitMax: params.get('profitMax') ? Number(params.get('profitMax')) : undefined,
    openPriceMin: params.get('openPriceMin') ? Number(params.get('openPriceMin')) : undefined,
    openPriceMax: params.get('openPriceMax') ? Number(params.get('openPriceMax')) : undefined,
    page: params.get('page') ? Number(params.get('page')) : undefined,
    pageSize: params.get('pageSize') ? Number(params.get('pageSize')) : undefined,
    sortBy: params.get('sortBy') || undefined,
    sortOrder: params.get('sortOrder') as 'asc' | 'desc' || undefined,
    symbol: params.get('symbol') || undefined,
    orderBy: params.get('orderBy') || undefined,
    orderDirection: params.get('orderDirection') as 'asc' | 'desc' || undefined,
    limit: params.get('limit') ? Number(params.get('limit')) : undefined,
  };
}
