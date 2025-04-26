import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
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
        id: params.id,
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
