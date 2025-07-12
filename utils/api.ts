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
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return null;
    }

    // Bearer トークンの抽出
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    const token = parts[1];
    if (!token || token.length < 10) { // 最小長のチェック
      return null;
    }

    return token;
  } catch (error) {
    console.error('トークン取得エラー:', error);
    return null;
  }
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
  const filter: TradeFilter = {};

  // typeは'buy'または'sell'のみ許容
  const typeParam = params.getAll('type[]');
  if (typeParam.length > 0) {
    const validTypes = ['buy', 'sell'];
    const filteredTypes = typeParam.filter(t => validTypes.includes(t));
    if (filteredTypes.length > 0) {
      filter.type = { in: filteredTypes };
    }
  }

  // startDate/endDateはDate型、endDateは終端補正
  const startDateStr = params.get('startDate');
  const endDateStr = params.get('endDate');
  if (startDateStr) {
    const d = new Date(startDateStr);
    if (!isNaN(d.getTime())) {
      d.setHours(0, 0, 0, 0);
      filter.startDate = d;
    }
  }
  if (endDateStr) {
    const d = new Date(endDateStr);
    if (!isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999);
      filter.endDate = d;
    }
  }

  // items配列を取得（items[]で統一）
  const itemsParam = params.getAll('items[]');
  const MAX_ITEM_LENGTH = 50; // 例: 50文字
  if (itemsParam.length > 0) {
    filter.items = itemsParam.map(item => item.substring(0, MAX_ITEM_LENGTH)).filter(item => item.length > 0);
  }

  if (params.get('userId')) {
    filter.userId = params.get('userId') as string;
  }
  if (params.get('ticket')) {
    const ticketNum = Number(params.get('ticket'));
    if (!isNaN(ticketNum)) filter.ticket = ticketNum;
  }
  if (params.get('sizeMin')) {
    const sizeMinNum = Number(params.get('sizeMin'));
    if (!isNaN(sizeMinNum)) filter.sizeMin = sizeMinNum;
  }
  if (params.get('sizeMax')) {
    const sizeMaxNum = Number(params.get('sizeMax'));
    if (!isNaN(sizeMaxNum)) filter.sizeMax = sizeMaxNum;
  }
  if (params.get('profitMin')) {
    const profitMinNum = Number(params.get('profitMin'));
    if (!isNaN(profitMinNum)) filter.profitMin = profitMinNum;
  }
  if (params.get('profitMax')) {
    const profitMaxNum = Number(params.get('profitMax'));
    if (!isNaN(profitMaxNum)) filter.profitMax = profitMaxNum;
  }
  if (params.get('openPriceMin')) {
    const openPriceMinNum = Number(params.get('openPriceMin'));
    if (!isNaN(openPriceMinNum)) filter.openPriceMin = openPriceMinNum;
  }
  if (params.get('openPriceMax')) {
    const openPriceMaxNum = Number(params.get('openPriceMax'));
    if (!isNaN(openPriceMaxNum)) filter.openPriceMax = openPriceMaxNum;
  }
  if (params.get('page')) {
    const pageNum = Number(params.get('page'));
    if (!isNaN(pageNum) && pageNum > 0) filter.page = pageNum;
  }
  if (params.get('pageSize')) {
    const pageSizeNum = Number(params.get('pageSize'));
    if (!isNaN(pageSizeNum) && pageSizeNum > 0) filter.pageSize = pageSizeNum;
  }

  // sortByのホワイトリスト
  const ALLOWED_SORT_BY = [
    'openTime', 'profit', 'ticket', 'item', 'size', 'openPrice',
    'closeTime', 'closePrice', 'commission', 'taxes', 'swap'
  ];
  const sortByParam = params.get('sortBy');
  if (sortByParam && ALLOWED_SORT_BY.includes(sortByParam)) {
    filter.sortBy = sortByParam;
  } else {
    filter.sortBy = 'openTime'; // デフォルト値
  }

  // sortOrderの検証
  const sortOrderParam = params.get('sortOrder');
  if (sortOrderParam === 'asc' || sortOrderParam === 'desc') {
    filter.sortOrder = sortOrderParam;
  } else {
    filter.sortOrder = 'desc'; // デフォルト値
  }

  // symbolの長さ制限
  const symbolParam = params.get('symbol');
  const MAX_SYMBOL_LENGTH = 50; // 例: 50文字
  if (symbolParam) {
    filter.symbol = symbolParam.substring(0, MAX_SYMBOL_LENGTH);
  }

  return filter;
}
