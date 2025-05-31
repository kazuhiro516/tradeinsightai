import { NextResponse } from 'next/server'
import { DashboardData } from '@/types/dashboard'
import { DrawdownData, TradeRecord } from '@/types/trade'
import { prisma } from '@/lib/prisma'
import { parseXMServerTime, toJSTDate } from '@/utils/date'
import { parseTradeFilterFromParams } from '@/utils/api'
import { buildWhereCondition, buildOrderBy, convertPrismaRecord } from '@/app/api/trade-records/models'
import { TradeRecordUseCase } from '@/app/api/trade-records/usecase'
import { PAGINATION } from '@/constants/pagination'
import { Prisma } from '@prisma/client'

// 月別の勝率を計算する関数
function getMonthlyWinRates(trades: TradeRecord[]) {
  const monthlyStats: Record<string, { wins: number, total: number }> = {}

  trades.forEach(trade  =>  {
    if (trade.openTime) {
      // XMサーバー時間から日本時間に変換
      const jstDate = parseXMServerTime(new Date(trade.openTime).toISOString()) || new Date(trade.openTime);
      const monthKey = `${jstDate.getFullYear()}-${String(jstDate.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = { wins: 0, total: 0 }
      }

      monthlyStats[monthKey].total++
      if (trade.profit && trade.profit > 0) {
        monthlyStats[monthKey].wins++
      }
    }
  })

  return Object.entries(monthlyStats).map(([month, stats]) => ({
    month,
    winRate: stats.total > 0 ? (stats.wins / stats.total) * 100 : 0,
    trades: stats.total
  })).sort((a, b) => a.month.localeCompare(b.month))
}

// 利益の時系列データを取得する関数
function getProfitTimeSeries(trades: TradeRecord[]) {
  interface ProfitPoint {
    date: string;
    profit: number;
    cumulativeProfit: number;
  }

  return trades
    .sort((a, b) => {
      // XMサーバー時間から日本時間に変換して比較
      const dateA = parseXMServerTime(new Date(a.openTime).toISOString()) || new Date(a.openTime);
      const dateB = parseXMServerTime(new Date(b.openTime).toISOString()) || new Date(b.openTime);
      return dateA.getTime() - dateB.getTime();
    })
    .reduce<ProfitPoint[]>((acc, trade) => {
      const jstDate = parseXMServerTime(new Date(trade.openTime).toISOString()) || new Date(trade.openTime);
      const date = jstDate.toISOString().split('T')[0];
      const lastCumulativeProfit = acc.length > 0 ? acc[acc.length - 1].cumulativeProfit : 0;
      return [...acc, {
        date,
        profit: trade.profit!,
        cumulativeProfit: lastCumulativeProfit + trade.profit!
      }];
    }, []);
}

// ドローダウンの時系列データを取得する関数
function getDrawdownTimeSeries(trades: TradeRecord[]): DrawdownData[] {
  // 1) profit が number のものだけ抽出
  const validTrades = trades
    .filter(t => typeof t.profit === 'number')
    .sort((a, b) => {
      const dateA = parseXMServerTime(a.openTime) ?? new Date(a.openTime);
      const dateB = parseXMServerTime(b.openTime) ?? new Date(b.openTime);
      return dateA.getTime() - dateB.getTime();
    });

  if (validTrades.length === 0) {
    return [];
  }

  let cumulativeProfit = 0;
  let highWaterMark = 0;  // これまでの累積損益の最高値
  const result: DrawdownData[] = [];

  for (const trade of validTrades) {
    // 2) 累積損益を更新
    cumulativeProfit += trade.profit!;

    // 3) 最高値を更新
    highWaterMark = Math.max(highWaterMark, cumulativeProfit);

    // 4) ドローダウン（金額）を計算
    const drawdown = highWaterMark - cumulativeProfit;

    // 5) ドローダウン率（%）を計算し、100% を超えないようクリップ
    const rawPercent =
      highWaterMark > 0
        ? (drawdown / highWaterMark) * 100
        : drawdown > 0
          ? 100
          : 0;
    const drawdownPercent = Number(Math.min(rawPercent, 100).toFixed(2));

    // 6) 表示用日付文字列（日本時間）
    const jstDate = toJSTDate(trade.openTime) ?? new Date(trade.openTime);
    const dateStr = jstDate.toISOString().split('T')[0]; // YYYY-MM-DD

    // 7) 結果を格納
    result.push({
      date: dateStr,
      profit: trade.profit!,
      cumulativeProfit,
      peak: highWaterMark,
      drawdown,
      drawdownPercent,
    });
  }

  return result;
}

// ダッシュボードサマリーを計算する関数
function calculateDashboardSummary(trades: TradeRecord[]) {
  const validTrades = trades.filter((trade): trade is TradeRecord => trade !== null && trade.openTime !== null && trade.profit !== null);

  if (validTrades.length === 0) {
    return {
      grossProfit: 0,
      grossLoss: 0,
      netProfit: 0,
      totalTrades: 0,
      winRate: 0,
      profitFactor: 0,
      avgProfit: 0,
      avgLoss: 0,
      largestProfit: 0,
      largestLoss: 0,
      maxWinStreak: 0,
      maxLossStreak: 0,
      // maxDrawdown: 0,
      // maxDrawdownPercent: 0,
      riskRewardRatio: 0
    };
  }

  const profits = validTrades.filter(trade => trade.profit! > 0);
  const losses = validTrades.filter(trade => trade.profit! < 0);

  const grossProfit = profits.reduce((sum, trade) => sum + trade.profit!, 0);
  const grossLoss = losses.reduce((sum, trade) => sum + trade.profit!, 0);
  const absGrossLoss = Math.abs(grossLoss);

  // 連勝・連敗の計算
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;

  validTrades.forEach(trade => {
    if (trade.profit! > 0) {
      currentWinStreak++;
      currentLossStreak = 0;
      maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
    } else {
      currentLossStreak++;
      currentWinStreak = 0;
      maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
    }
  });

  // ドローダウンデータを取得
  // const drawdownSeries = getDrawdownTimeSeries(validTrades);

  // 最大ドローダウンと割合を計算
  // const maxDrawdown = drawdownSeries.reduce((max, curr) => Math.max(max, curr.drawdown), 0);
  // const maxDrawdownPercent = drawdownSeries.reduce((max, curr) => Math.max(max, curr.drawdownPercent), 0);

  return {
    grossProfit,
    grossLoss: absGrossLoss,
    netProfit: grossProfit + grossLoss,
    totalTrades: validTrades.length,
    winRate: (profits.length / validTrades.length) * 100,
    profitFactor: absGrossLoss === 0 ? grossProfit : grossProfit / absGrossLoss,
    avgProfit: profits.length > 0 ? grossProfit / profits.length : 0,
    avgLoss: losses.length > 0 ? absGrossLoss / losses.length : 0,
    largestProfit: profits.length > 0 ? Math.max(...profits.map(t => t.profit!)) : 0,
    largestLoss: losses.length > 0 ? Math.abs(Math.min(...losses.map(t => t.profit!))) : 0,
    maxWinStreak,
    maxLossStreak,
    // maxDrawdown,
    // maxDrawdownPercent,
    riskRewardRatio: losses.length > 0 && profits.length > 0 ?
      (grossProfit / profits.length) / (absGrossLoss / losses.length) : 0
  };
}

export async function GET(request: Request) {
  try {
    // URLからuserIdとフィルターパラメータを取得
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      )
    }

    // フィルターパラメータの取得
    const filter = parseTradeFilterFromParams(searchParams);

    // フィルター条件とソート条件を構築
    const where = buildWhereCondition(userId, filter);
    const orderBy = buildOrderBy(filter);
    const batchSize = PAGINATION.DEFAULT_PAGE_SIZE;
    let allRecords: Prisma.TradeRecordGetPayload<object>[] = [];
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
    const trades = allRecords.map(record => convertPrismaRecord(record));
    // ダッシュボードデータの計算
    const dashboardData: DashboardData = {
      summary: calculateDashboardSummary(trades),
      graphs: {
        profitTimeSeries: getProfitTimeSeries(trades),
        monthlyWinRates: getMonthlyWinRates(trades),
        drawdownTimeSeries: getDrawdownTimeSeries(trades)
      },
      tradeRecords: trades,
      timeZoneStats: TradeRecordUseCase.getTimeZoneStats(trades),
      symbolStats: TradeRecordUseCase.getSymbolStats(trades),
      weekdayStats: TradeRecordUseCase.getWeekdayStats(trades),
      weekdayTimeZoneHeatmap: TradeRecordUseCase.getWeekdayTimeZoneHeatmap(trades)
    }

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error('ダッシュボードデータ取得エラー:', error)
    return NextResponse.json(
      { error: 'データ取得に失敗しました' },
      { status: 500 }
    )
  }
}
