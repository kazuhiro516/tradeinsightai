import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    const prisma = new PrismaClient();

    // ユーザーの取引履歴から一意の通貨ペアを取得
    const uniquePairs = await prisma.tradeRecord.findMany({
      where: { userId },
      select: { item: true },
      distinct: ['item'],
      orderBy: { item: 'asc' }
    });

    // nullやundefinedを除外し、文字列の配列に変換
    const currencyPairs = uniquePairs
      .map(record => record.item)
      .filter((item): item is string => item !== null && item !== undefined);

    return NextResponse.json(currencyPairs);
  } catch (error) {
    console.error('通貨ペア取得エラー:', error);
    return NextResponse.json(
      { error: '通貨ペアの取得に失敗しました' },
      { status: 500 }
    );
  }
}
