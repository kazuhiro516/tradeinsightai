import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildWhereCondition, buildOrderBy, convertPrismaRecord } from '@/app/api/trade-records/models';
import { TradeRecordUseCase } from '@/app/api/trade-records/usecase';
import { generateAIResponse } from '@/utils/ai'
import { TradeFilter } from '@/types/trade';
import { authenticateApiRequest } from '@/utils/api';
import { PAGINATION } from '@/constants/pagination';
import { TradeRecord } from '@prisma/client';
import { ANALYSIS_REPORT_SYSTEM_PROMPT } from '@/utils/analysisReportPrompt';
import { generateULID } from '@/utils/ulid';

// 分析レポートの一覧を取得
export async function GET(request: NextRequest) {
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

    const reports = await prisma.analysisReport.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(reports);
  } catch (error) {
    console.error('分析レポート一覧の取得エラー:', error);
    return NextResponse.json(
      { error: 'レポート一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// 分析レポートの作成
export async function POST(request: NextRequest) {
  try {
    const { filter, title } = await request.json();
    const userFilter: TradeFilter = filter || {};

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

    // フィルター条件とソート条件を構築
    const where = buildWhereCondition(userId, userFilter);
    const orderBy = buildOrderBy(userFilter);
    const batchSize = PAGINATION.DEFAULT_PAGE_SIZE;
    let allRecords: TradeRecord[] = [];
    let skip = 0;

    // バッチ処理で全レコードを取得
    while (true) {
      const records = await prisma.tradeRecord.findMany({
        where,
        orderBy,
        skip,
        take: batchSize
      });

      if (records.length === 0) {
        break;
      }

      allRecords = [...allRecords, ...records];
      skip += batchSize;

      if (records.length < batchSize) {
        break;
      }
    }

    if (allRecords.length === 0) {
      return NextResponse.json({ error: 'トレードレコードが見つかりませんでした' }, { status: 404 });
    }

    const trades = allRecords.map(convertPrismaRecord);

    const userSettings = await prisma.aIModelSystemPrompt.findUnique({
      where: { userId },
    });

    const analysisData = {
      summary: {
        totalTrades: trades.length,
        winningTrades: trades.filter(t => t.profit && t.profit > 0).length,
        losingTrades: trades.filter(t => t.profit && t.profit < 0).length,
        totalProfit: trades.reduce((sum, t) => sum + (t.profit || 0), 0),
        averageProfit: trades.length > 0 ? trades.reduce((sum, t) => sum + (t.profit || 0), 0) / trades.length : 0,
        winRate: trades.length > 0 ? (trades.filter(t => t.profit && t.profit > 0).length / trades.length) * 100 : 0,
      },
      timeZoneStats: TradeRecordUseCase.getTimeZoneStats(trades),
      symbolStats: TradeRecordUseCase.getSymbolStats(trades),
      weekdayStats: TradeRecordUseCase.getWeekdayStats(trades),
      weekdayTimeZoneHeatmap: TradeRecordUseCase.getWeekdayTimeZoneHeatmap(trades)
    };

    const prompt = `
${userSettings?.systemPrompt || ANALYSIS_REPORT_SYSTEM_PROMPT}

分析データ：
${JSON.stringify(analysisData, null, 2)}
`;

    const aiResponse = await generateAIResponse(prompt);

    // 分析レポートを保存
    const report = await prisma.analysisReport.create({
      data: {
        id: generateULID(),
        title: title || `AI分析レポート ${new Date().toLocaleString()}`,
        content: aiResponse,
        userId,
      },
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error('分析レポート生成エラー:', error);
    return NextResponse.json(
      { error: 'レポートの生成に失敗しました' },
      { status: 500 }
    );
  }
}

// 分析レポートの削除
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('id');

    if (!reportId) {
      return NextResponse.json(
        { error: 'レポートIDが必要です' },
        { status: 400 }
      );
    }

    await prisma.analysisReport.delete({
      where: {
        id: reportId,
        userId,
      },
    });

    return NextResponse.json({ message: 'レポートを削除しました' });
  } catch (error) {
    console.error('分析レポート削除エラー:', error);
    return NextResponse.json(
      { error: 'レポートの削除に失敗しました' },
      { status: 500 }
    );
  }
}
