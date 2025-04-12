import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';

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
    return defaultValue;
  }
}
