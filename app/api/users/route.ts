import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';

// ユーザー一覧を取得するAPI
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: '認証されていません' },
        { status: 401 }
      );
    }

    // Supabase IDでユーザーを検索
    const dbUser = await prisma.user.findUnique({
      where: {
        supabaseId: user.id,
      },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json(dbUser);
  } catch (error) {
    console.error('ユーザー取得エラー:', error);
    return NextResponse.json(
      { error: 'ユーザー取得に失敗しました' },
      { status: 500 }
    );
  }
}

// ユーザーを作成するAPI
export async function POST(request: NextRequest) {
  try {
    const { email, supabase_id, name } = await request.json();

    // 必須パラメータの検証
    if (!email || !supabase_id || !name) {
      return NextResponse.json(
        { error: '必須パラメータが不足しています' },
        { status: 400 }
      );
    }

    // ユーザー作成
    const user = await prisma.user.create({
      data: {
        supabaseId: supabase_id,
        name: name,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('ユーザー作成エラー:', error);
    return NextResponse.json(
      { error: 'ユーザー作成に失敗しました' },
      { status: 500 }
    );
  }
}
