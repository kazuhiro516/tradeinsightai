import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { UserUseCase } from './usecase';
import { PrismaUserRepository } from './database';
import { CreateUserRequest, ErrorResponse } from './models';
import { createErrorResponse } from '@/utils/api';

/**
 * ユーザー情報を取得するAPI
 */
export async function GET(request: NextRequest) {
  try {
    // クエリパラメータからsupabaseIdを取得
    const searchParams = request.nextUrl.searchParams;
    const supabaseId = searchParams.get('supabaseId');

    const userRepository = new PrismaUserRepository();
    const userUseCase = new UserUseCase(userRepository);

    // 認証ユーザーを取得
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証されていません' },
        { status: 401 }
      );
    }

    // supabaseIdが指定されている場合は、認証ユーザーと一致するかチェック
    if (supabaseId) {
      if (supabaseId !== user.id) {
        return NextResponse.json(
          { error: '権限がありません' },
          { status: 403 }
        );
      }
      const result = await userUseCase.getCurrentUser(supabaseId);
      // エラーレスポンスの処理
      if (!result || 'error' in result) {
        const errorResponse = result as ErrorResponse || { error: 'ユーザーが見つかりません', details: 'ユーザー情報を取得できませんでした' };
        return NextResponse.json(
          { error: errorResponse.error, details: errorResponse.details },
          { status: 404 }
        );
      }
      return NextResponse.json(result);
    }

    // supabaseIdが指定されていない場合は認証ユーザーの情報を取得
    const result = await userUseCase.getCurrentUser(user.id);
    // エラーレスポンスの処理
    if (!result || 'error' in result) {
      const errorResponse = !result ? { error: 'ユーザーが見つかりません', details: 'ユーザー情報を取得できませんでした' } : result as ErrorResponse;
      return NextResponse.json(
        { error: errorResponse.error, details: errorResponse.details },
        { status: 404 }
      );
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error('ユーザー情報の取得中にエラーが発生しました:', error);
    return createErrorResponse('ユーザー情報の取得に失敗しました');
  }
}

/**
 * ユーザーを作成するAPI
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json() as CreateUserRequest;

    // ユーザー作成
    const userRepository = new PrismaUserRepository();
    const userUseCase = new UserUseCase(userRepository);
    const result = await userUseCase.createUser(data);

    // エラーレスポンスの処理
    if (!result || 'error' in result) {
      const errorResponse = !result ? { error: 'ユーザー作成に失敗しました', details: 'ユーザーを作成できませんでした' } : result as ErrorResponse;
      return NextResponse.json(
        { error: errorResponse.error, details: errorResponse.details },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('ユーザー情報の更新中にエラーが発生しました:', error);
    return createErrorResponse('ユーザー情報の更新に失敗しました');
  }
}
