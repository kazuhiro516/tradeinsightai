import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/utils/api';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, errorResponse } = await authenticateApiRequest(request);
    if (errorResponse) {
      return errorResponse;
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    const report = await prisma.analysisReport.findUnique({
      where: {
        id: params.id,
        userId,
      },
    });

    if (!report) {
      return NextResponse.json(
        { error: 'レポートが見つかりませんでした' },
        { status: 404 }
      );
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error('分析レポート詳細の取得エラー:', error);
    return NextResponse.json(
      { error: 'レポートの取得に失敗しました' },
      { status: 500 }
    );
  }
}
