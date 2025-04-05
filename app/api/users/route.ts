import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { UserUseCase } from './usecase';
import { PrismaUserRepository } from './database';
import { CreateUserRequest, ErrorResponse } from './models';

// ユーザー一覧を取得するAPI
export async function GET() {
  try {
    // ユーザー認証
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // ユーザー取得
    const userRepository = new PrismaUserRepository();
    const userUseCase = new UserUseCase(userRepository);
    const result = await userUseCase.getCurrentUser(user.id);

    // エラーレスポンスの処理
    if ('error' in result) {
      const errorResponse = result as ErrorResponse;
      return NextResponse.json(
        { error: errorResponse.error, details: errorResponse.details },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error getting user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ユーザーを作成するAPI
export async function POST(request: NextRequest) {
  try {
    const data = await request.json() as CreateUserRequest;

    // ユーザー作成
    const userRepository = new PrismaUserRepository();
    const userUseCase = new UserUseCase(userRepository);
    const result = await userUseCase.createUser(data);

    // エラーレスポンスの処理
    if ('error' in result) {
      const errorResponse = result as ErrorResponse;
      return NextResponse.json(
        { error: errorResponse.error, details: errorResponse.details },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
