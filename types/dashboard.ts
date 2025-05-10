import { TradeRecord } from "./trade"

/**
 * ダッシュボードのデータ型定義
 */
export interface DashboardData {
  summary: DashboardSummary
  graphs: DashboardGraphs
  tradeRecords: TradeRecord[]
  timeZoneStats?: TimeZoneStat[]
  symbolStats?: SymbolStat[]
  weekdayStats?: WeekdayStat[]
  weekdayTimeZoneHeatmap?: WeekdayTimeZoneHeatmapCell[]
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
  profit: number
  cumulativeProfit: number
  peak: number
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

// --- 追加: 時間帯別・通貨ペア別・曜日別の集計用型定義 ---

export interface TimeZoneStat {
  zone: 'tokyo' | 'london' | 'newyork' | 'other';
  label: string;
  trades: number;
  winRate: number;
  totalProfit: number;
}

export interface SymbolStat {
  symbol: string;
  trades: number;
  winRate: number;
  totalProfit: number;
}

export interface WeekdayStat {
  weekday: number; // 0:日, 1:月, ... 6:土
  label: string;
  trades: number;
  winRate: number;
  totalProfit: number;
}

// --- 追加: 曜日×市場区分ヒートマップ用型定義 ---
export interface WeekdayTimeZoneHeatmapCell {
  weekday: number; // 0:日, 1:月, ...
  zone: 'tokyo' | 'london' | 'newyork' | 'other';
  winRate: number;
  trades: number;
}
