// drawdown time seriesの型定義を更新します
export interface DrawdownTimeSeriesData {
  date: string;
  drawdown: number;
  drawdownPercent: number;
  // 新しく追加したフィールド
  peak?: number;
  balance?: number;
  cumulativeProfit?: number;
  profit?: number;
}

export interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
}

export interface DashboardSummary {
  grossProfit: number;
  grossLoss: number;
  netProfit: number;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  avgProfit: number;
  avgLoss: number;
  largestProfit: number;
  largestLoss: number;
  maxWinStreak: number;
  maxLossStreak: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  riskRewardRatio: number;
}

export interface ProfitTimeSeriesData {
  date: string;
  profit: number;
  cumulativeProfit: number;
}

export interface MonthlyWinRateData {
  month: string;
  winRate: number;
  trades: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  graphs: {
    profitTimeSeries: ProfitTimeSeriesData[];
    monthlyWinRates: MonthlyWinRateData[];
    drawdownTimeSeries: DrawdownTimeSeriesData[];
  };
} 