/**
 * ダッシュボードのデータ型定義
 */
export interface DashboardData {
  summary: DashboardSummary
  graphs: DashboardGraphs
}

/**
 * ダッシュボードのサマリーデータ型定義
 */
export interface DashboardSummary {
  grossProfit: number
  grossLoss: number
  netProfit: number
  totalTrades: number
  winRate: number
  profitFactor: number
  avgProfit: number
  avgLoss: number
  largestProfit: number
  largestLoss: number
  maxWinStreak: number
  maxLossStreak: number
  maxDrawdown: number
  maxDrawdownPercent: number
  riskRewardRatio: number
}

/**
 * ダッシュボードのグラフデータ型定義
 */
export interface DashboardGraphs {
  profitTimeSeries: ProfitTimeSeriesData[]
  monthlyWinRates: MonthlyWinRateData[]
  drawdownTimeSeries: DrawdownTimeSeriesData[]
}

/**
 * 利益推移データの型定義
 */
export interface ProfitTimeSeriesData {
  date: string
  profit: number
  cumulativeProfit: number
}

/**
 * 月別勝率データの型定義
 */
export interface MonthlyWinRateData {
  month: string
  winRate: number
  trades: number
}

/**
 * ドローダウン推移データの型定義
 */
export interface DrawdownTimeSeriesData {
  date: string
  drawdown: number
  drawdownPercent: number
}

/**
 * 統計カードのプロパティ型定義
 */
export interface StatCardProps {
  title: string
  value: number | string
  unit?: string
} 