import { NextResponse } from 'next/server'
import { DashboardData } from '@/types/dashboard'
import { prisma } from '@/lib/prisma'
import { TradeRecord } from '@/types/trade'

// 月別の勝率を計算する関数
function getMonthlyWinRates(trades: TradeRecord[]) {
  const monthlyStats: Record<string, { wins: number, total: number }> = {}
  
  trades.forEach(trade => {
    if (trade?.openTime) {
      const date = trade.openTime
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
        date: trade.openTime.toISOString().split('T')[0],
        profit: trade.profit!,
        cumulativeProfit: cumulativeProfit
      }
    })
}

// ドローダウンの時系列データを取得する関数
function getDrawdownTimeSeries(trades: TradeRecord[]) {
  let peak = 0
  let balance = 0
  let currentDrawdown = 0
  
  return trades
    .filter(trade => trade.openTime !== null && trade.profit !== null)
    .map(trade => {
      balance += trade.profit!
      if (balance > peak) {
        peak = balance
        currentDrawdown = 0
      } else {
        currentDrawdown = peak - balance
      }
      
      return {
        date: trade.openTime.toISOString().split('T')[0],
        drawdown: currentDrawdown,
        drawdownPercent: peak > 0 ? (currentDrawdown / peak) * 100 : 0
      }
    })
}

// ダッシュボードサマリーを計算する関数
function calculateDashboardSummary(trades: TradeRecord[]) {
  const validTrades = trades.filter(trade => 
    trade.openTime !== null && trade.profit !== null
  )

  const profits = validTrades.filter(trade => trade.profit! > 0)
  const losses = validTrades.filter(trade => trade.profit! < 0)

  const grossProfit = profits.reduce((sum, trade) => sum + trade.profit!, 0)
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.profit!, 0))
  
  let maxWinStreak = 0
  let maxLossStreak = 0
  let currentWinStreak = 0
  let currentLossStreak = 0
  
  validTrades.forEach(trade => {
    if (trade.profit! > 0) {
      currentWinStreak++
      currentLossStreak = 0
      maxWinStreak = Math.max(maxWinStreak, currentWinStreak)
    } else {
      currentLossStreak++
      currentWinStreak = 0
      maxLossStreak = Math.max(maxLossStreak, currentLossStreak)
    }
  })

  return {
    grossProfit,
    grossLoss,
    netProfit: grossProfit - grossLoss,
    totalTrades: validTrades.length,
    winRate: (profits.length / validTrades.length) * 100,
    profitFactor: grossLoss === 0 ? 0 : grossProfit / grossLoss,
    avgProfit: profits.length > 0 ? grossProfit / profits.length : 0,
    avgLoss: losses.length > 0 ? grossLoss / losses.length : 0,
    largestProfit: Math.max(...validTrades.map(t => t.profit!)),
    largestLoss: Math.abs(Math.min(...validTrades.map(t => t.profit!))),
    maxWinStreak,
    maxLossStreak,
    maxDrawdown: getDrawdownTimeSeries(trades).reduce((max, curr) => Math.max(max, curr.drawdown), 0),
    maxDrawdownPercent: getDrawdownTimeSeries(trades).reduce((max, curr) => Math.max(max, curr.drawdownPercent), 0),
    riskRewardRatio: losses.length > 0 && profits.length > 0 ? 
      (grossProfit / profits.length) / (grossLoss / losses.length) : 0
  }
}

export async function GET() {
  try {
    // トレード記録をデータベースから取得
    const trades = await prisma.tradeRecord.findMany({
      select: {
        openTime: true,
        profit: true
      },
      orderBy: {
        openTime: 'asc'
      }
    }) as TradeRecord[]

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