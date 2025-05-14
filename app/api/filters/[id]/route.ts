import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    // リクエストボディからユーザーIDを取得
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }
    // フィルターの削除（RLSのためにユーザーIDを条件に含める）
    const deletedFilter = await prisma.savedFilter.deleteMany({
      where: {
        id: id,
        userId: userId,
      },
    });

    if (deletedFilter.count === 0) {
      return NextResponse.json(
        { error: 'フィルターが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'フィルターを削除しました' });
  } catch (error) {
    console.error('フィルター削除エラー:', error);
    return NextResponse.json(
      { error: 'フィルターの削除に失敗しました' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { name, filter, userId } = await request.json();
    if (!name || !filter || !userId) {
      return NextResponse.json(
        { error: '必要な情報が不足しています' },
        { status: 400 }
      );
    }
    // フィルターの更新（RLSのためにユーザーIDを条件に含める）
    const updated = await prisma.savedFilter.updateMany({
      where: {
        id: id,
        userId: userId,
      },
      data: {
        name,
        filter,
        updatedAt: new Date(),
      },
    });
    if (updated.count === 0) {
      return NextResponse.json(
        { error: 'フィルターが見つかりません' },
        { status: 404 }
      );
    }
    return NextResponse.json({ message: 'フィルターを更新しました' });
  } catch (error) {
    console.error('フィルター更新エラー:', error);
    return NextResponse.json(
      { error: 'フィルターの更新に失敗しました' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
