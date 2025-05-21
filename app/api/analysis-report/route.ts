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

export async function POST(request: NextRequest) {
  try {
    const { filter } = await request.json();
    const userFilter: TradeFilter = filter || {};

    // APIリクエストの認証と、ユーザーIDの取得
    const { userId, errorResponse } = await authenticateApiRequest(request);
    if (errorResponse) {
      return errorResponse;
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      )
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

      // 200件未満の場合は最後のバッチなので終了
      if (records.length < batchSize) {
        break;
      }
    }

    if (allRecords.length === 0) {
      return NextResponse.json({ error: 'トレードレコードが見つかりませんでした' }, { status: 404 });
    }

    // レコードを変換
    const trades = allRecords.map(convertPrismaRecord);

    // ユーザーのシステムプロンプトを取得
    const userSettings = await prisma.aIModelSystemPrompt.findUnique({
      where: { userId },
    });

    // 分析データを生成
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

    // AIに分析を依頼
    const prompt = `
${userSettings?.systemPrompt || ANALYSIS_REPORT_SYSTEM_PROMPT}

分析データ：
${JSON.stringify(analysisData, null, 2)}
`;

    const aiResponse = await generateAIResponse(prompt);

    return NextResponse.json({ report: aiResponse });
  } catch (error) {
    console.error('分析レポート生成エラー:', error);
    return NextResponse.json(
      { error: 'レポートの生成に失敗しました' },
      { status: 500 }
    );
  }
}
