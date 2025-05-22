/**
 * トレードファイルの型定義
 */
export interface TradeFile {
  id: string;
  fileName: string;
  uploadDate: string;
  fileSize: number;
  status: string;
  recordsCount: number;
  errorMessage: string | null;
}

/**
 * フィルターオブジェクトの型定義
 */
export interface TradeFilter {
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  ticket?: number;
  type?: string | { in: string[] };
  types?: string[];
  items?: string[];
  sizeMin?: number;
  sizeMax?: number;
  profitMin?: number;
  profitMax?: number;
  openPriceMin?: number;
  openPriceMax?: number;
  profitType?: ProfitType;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  symbol?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  limit?: number;
}

/**
 * 取引記録の型定義
 */
export interface TradeRecord {
  id: string;
  ticket: number;
  openTime: string;
  type: string;
  size: number;
  item: string;
  openPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  closeTime?: string;
  closePrice?: number;
  commission?: number;
  taxes?: number;
  swap?: number;
  profit?: number;
  userId: string;
  tradeFileId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 取引記録のレスポンス型定義
 */
export interface TradeRecordsResponse {
  records: TradeRecord[];
  total: number;
  page: number;
  pageSize: number;
  error?: string;
  details?: string;
}

/**
 * トレード分析の結果型定義
 */
export interface TradeAnalysis {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  totalProfit: number;
  maxDrawdown: number;
  sharpeRatio: number;
  expectancy: number;
  largestWin: number;
  largestLoss: number;
  averageHoldingTime: number;
  bestSymbol: string;
  worstSymbol: string;
  bestTimeOfDay: string;
  worstTimeOfDay: string;
}

/**
 * トレードサマリーの型定義
 */
export interface TradeSummary {
  period: string;
  totalTrades: number;
  netProfit: number;
  winRate: number;
  averageProfit: number;
  symbol?: string;
}

/**
 * トレード統計の型定義
 */
export interface TradeStats {
  daily: TradeSummary[];
  weekly: TradeSummary[];
  monthly: TradeSummary[];
  bySymbol: TradeSummary[];
}

/**
 * トレードパフォーマンスの型定義
 */
export interface TradePerformance {
  analysis: TradeAnalysis;
  stats: TradeStats;
  equityCurve: {
    date: string;
    balance: number;
    drawdown: number;
  }[];
}

export type TradeType = 'all' | 'buy' | 'sell';

export const TRADE_TYPE_LABELS: Record<TradeType, string> = {
  all: 'すべて',
  buy: '買い',
  sell: '売り'
};

/**
 * トレードの利益タイプ
 */
export type ProfitType = 'profit' | 'loss' | 'all';

export const PROFIT_TYPE_LABELS: Record<ProfitType, string> = {
  all: 'すべて',
  profit: '勝ち（プラス）',
  loss: '負け（マイナス）',
};

/**
 * データベース検索条件の型定義
 */
export type WhereCondition = {
  userId?: string;
  openTime?: {
    gte?: Date;
    lte?: Date;
  };
  size?: {
    gte?: number;
    lte?: number;
  };
  profit?: {
    gte?: number;
    lte?: number;
  };
  openPrice?: {
    gte?: number;
    lte?: number;
  };
  type?: string | { in: string[] };
  item?: { in: string[] };
  ticket?: number;
};

/**
 * トレードレコード作成入力の型定義
 */
export interface CreateTradeRecordInput {
  id?: string;
  tradeFileId?: string;
  ticket: number;
  openTime: Date;
  type: string;
  item: string;
  size: number;
  openPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  closeTime?: Date;
  closePrice?: number;
  commission?: number;
  taxes?: number;
  swap?: number;
  profit?: number;
  [key: string]: string | number | Date | undefined;
}

export interface DrawdownData {
  date: string;            // YYYY-MM-DD（日本時間）
  profit: number;          // 当該トレードの損益
  cumulativeProfit: number;// 累積損益
  peak: number;            // 直近までの最高累積損益
  drawdown: number;        // ドローダウン（金額）
  drawdownPercent: number; // ドローダウン率（%）
}
