import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildWhereCondition, convertPrismaRecord } from '@/app/api/trade-records/models';
import { TradeRecordUseCase } from '@/app/api/trade-records/usecase';
import { generateAIResponse } from '@/utils/ai'
import { TradeFilter } from '@/types/trade';
import { authenticateApiRequest } from '@/utils/api';

export async function POST(request: NextRequest) {
  try {
    const { filter } = await request.json();
    const userFilter: TradeFilter = filter || {};

    // APIリクエストの認証と、ユーザーIDの取得
    const { userId, errorResponse } = await authenticateApiRequest(request);
    if (errorResponse) {
      return errorResponse;
    }


    // フィルター条件を構築
    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      )
    }
    const where = buildWhereCondition(userId, userFilter);

    // トレードレコードを取得
    const records = await prisma.tradeRecord.findMany({
      where,
      orderBy: { openTime: 'asc' }
    });

    // レコードを変換
    const trades = records.map(convertPrismaRecord);

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

    console.log(analysisData);

    // AIに分析を依頼
    const prompt = `
以下のトレード分析データに基づいて、詳細な分析レポートを作成してください。
レポートは以下の形式で作成してください：

1. 総評
- 期間内のトレードパフォーマンスの概要
- 主要な特徴や傾向

2. 詳細分析
- エントリー精度の評価
- エグジット精度の評価
- ポジションサイジングとリスク管理の評価

3. 改善提案
- 継続すべき良好なトレード行動
- 改善が必要な点と具体的なアドバイス

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
