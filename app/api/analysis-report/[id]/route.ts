import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/utils/api';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
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

    const params = await context.params;
    const reportId = params.id;
    if (!reportId) {
      return NextResponse.json(
        { error: 'レポートIDが必要です' },
        { status: 400 }
      );
    }

    const report = await prisma.analysisReport.findUnique({
      where: {
        id: reportId,
        userId: userId,
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

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
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

    const { title } = await request.json();

    if (!title) {
      return NextResponse.json(
        { error: 'タイトルが必要です' },
        { status: 400 }
      );
    }

    const params = await context.params;
    const reportId = params.id;
    if (!reportId) {
      return NextResponse.json(
        { error: 'レポートIDが必要です' },
        { status: 400 }
      );
    }

    const report = await prisma.analysisReport.update({
      where: {
        id: reportId,
        userId,
      },
      data: {
        title,
      },
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error('分析レポートの更新エラー:', error);
    return NextResponse.json(
      { error: 'レポートの更新に失敗しました' },
      { status: 500 }
    );
  }
}
