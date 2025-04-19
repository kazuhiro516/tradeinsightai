import { NextResponse } from 'next/server';
import { ulid } from 'ulid';
import { prisma } from '@/lib/prisma'

// フィルター一覧の取得
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'ユーザーIDが必要です' }, { status: 400 });
    }

    // フィルターの取得
    const filters = await prisma.savedFilter.findMany({
      where: {
        userId,
        type: type || undefined,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(filters);
  } catch (error) {
    console.error('フィルター取得エラー:', error);
    return NextResponse.json(
      { error: 'フィルターの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// フィルターの保存
export async function POST(request: Request) {
  try {
    const { name, type, filter, isDefault, userId } = await request.json();

    // バリデーション
    if (!name || !type || !filter || !userId) {
      return NextResponse.json(
        { error: '必要な情報が不足しています' },
        { status: 400 }
      );
    }

    // トランザクション開始
    const savedFilter = await prisma.$transaction(async (prisma) => {
      // デフォルトフィルターが設定される場合、既存のデフォルトを解除
      if (isDefault) {
        await prisma.savedFilter.updateMany({
          where: {
            userId,
            type,
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });
      }

      // 新しいフィルターを保存
      return await prisma.savedFilter.create({
        data: {
          id: ulid(),
          name,
          type,
          filter,
          isDefault,
          userId,
        },
      });
    });

    return NextResponse.json(savedFilter);
  } catch (error) {
    console.error('フィルター保存エラー:', error);
    return NextResponse.json(
      { error: 'フィルターの保存に失敗しました' },
      { status: 500 }
    );
  }
}

// フィルターの削除
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filterId = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!filterId || !userId) {
      return NextResponse.json(
        { error: '必要なパラメータが不足しています' },
        { status: 400 }
      );
    }

    // フィルターの削除
    await prisma.savedFilter.deleteMany({
      where: {
        id: filterId,
        userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('フィルター削除エラー:', error);
    return NextResponse.json(
      { error: 'フィルターの削除に失敗しました' },
      { status: 500 }
    );
  }
}
