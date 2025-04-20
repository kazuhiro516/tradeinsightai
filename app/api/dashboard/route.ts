import { NextResponse } from 'next/server'
import { DashboardData } from '@/types/dashboard'
import { TradeRecord } from '@/types/trade'
import { PrismaTradeRecordRepository } from '@/app/api/trade-records/repository'

// 月別の勝率を計算する関数
function getMonthlyWinRates(trades: TradeRecord[]) {
  const monthlyStats: Record<string, { wins: number, total: number }> = {}

  trades.forEach(trade => {
    if (trade?.openTime) {
      const date = new Date(trade.openTime)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

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
  let cumulativeProfit = 0

  return trades
    .filter(trade => trade.openTime !== null && trade.profit !== null)
    .map(trade => {
      cumulativeProfit += trade.profit!
      return {
        date: new Date(trade.openTime).toISOString().split('T')[0],
        profit: trade.profit!,
        cumulativeProfit: cumulativeProfit
      }
    })
}

// ドローダウンの時系列データを取得する関数
function getDrawdownTimeSeries(trades: TradeRecord[]) {
  // 有効なトレードのみフィルタリングして日付順にソート
  const validTrades = trades
    .filter(trade => trade.openTime !== null && trade.profit !== null)
    .sort((a, b) => new Date(a.openTime!).getTime() - new Date(b.openTime!).getTime());

  if (validTrades.length === 0) {
    return [];
  }

  // 結果を格納する配列
  const result = [];

  // 初期値の設定
  let cumulativeProfit = 0;
  let peak = 0;
  let highWaterMark = 0; // 資金の最高到達点を記録

  // 各トレードごとにドローダウンを計算
  for (const trade of validTrades) {
    // 累積利益を更新
    cumulativeProfit += trade.profit!;

    // 資金曲線の最高値を更新
    highWaterMark = Math.max(highWaterMark, cumulativeProfit);

    // ドローダウンの計算
    const drawdown = highWaterMark - cumulativeProfit;

    // ドローダウン率の計算（最高値が0の場合は0%）
    let drawdownPercent = 0;
    if (highWaterMark > 0) {
      drawdownPercent = (drawdown / highWaterMark) * 100;
    }

    // ピーク値（資金曲線の各時点での最高到達値）を設定
    peak = highWaterMark;

    // 結果を配列に追加
    result.push({
      date: new Date(trade.openTime!).toISOString().split('T')[0],
      profit: trade.profit!,
      cumulativeProfit,
      peak,
      drawdown,
      drawdownPercent: Number(drawdownPercent.toFixed(2))
    });
  }

  return result;
}

// ダッシュボードサマリーを計算する関数
function calculateDashboardSummary(trades: TradeRecord[]) {
  const validTrades = trades.filter(trade =>
    trade.openTime !== null && trade.profit !== null
  );

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
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
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
  const drawdownSeries = getDrawdownTimeSeries(validTrades);

  // 最大ドローダウンと割合を計算
  const maxDrawdown = drawdownSeries.reduce((max, curr) => Math.max(max, curr.drawdown), 0);
  const maxDrawdownPercent = drawdownSeries.reduce((max, curr) => Math.max(max, curr.drawdownPercent), 0);

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
    maxDrawdown,
    maxDrawdownPercent,
    riskRewardRatio: losses.length > 0 && profits.length > 0 ?
      (grossProfit / profits.length) / (absGrossLoss / losses.length) : 0
  };
}

export async function GET(request: Request) {
  try {
    // URLからuserIdを取得
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      )
    }

    // リポジトリのインスタンスを作成
    const repository = new PrismaTradeRecordRepository()

    // ユーザーIDに基づいてトレード記録を取得
    const trades = await repository.findByUserId(userId) as unknown as TradeRecord[]

    // ダッシュボードデータの計算
    const dashboardData: DashboardData = {
      summary: calculateDashboardSummary(trades),
      graphs: {
        profitTimeSeries: getProfitTimeSeries(trades),
        monthlyWinRates: getMonthlyWinRates(trades),
        drawdownTimeSeries: getDrawdownTimeSeries(trades)
      }
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
