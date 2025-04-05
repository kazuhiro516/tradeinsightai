// トレードレコードのフィルタリング用インターフェース
export interface TradeFilter {
  ticketIds?: number[]
  startDate?: string
  endDate?: string
  types?: string[]
  items?: string[]
  sizeMin?: number
  sizeMax?: number
  profitMin?: number
  profitMax?: number
  openPriceMin?: number
  openPriceMax?: number
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// トレードレコードのドメインモデル
export interface TradeRecord {
  id: string
  ticket: number
  openTime: string
  type: string
  size: number
  item: string
  openPrice: number
  stopLoss: number
  takeProfit: number
  closeTime: string
  closePrice: number
  commission: number
  taxes: number
  swap: number
  profit: number
  userId: string
  createdAt: string
  updatedAt: string
}

// トレードレコードのレスポンス用インターフェース
export interface TradeRecordsResponse {
  records: TradeRecord[]
  total: number
  page: number
  pageSize: number
}

// データベース用のフィルター条件
export interface WhereCondition {
  userId: string;
  openTime?: {
    gte?: Date;
    lte?: Date;
  };
  type?: {
    in: string[];
  };
  item?: {
    in: string[];
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
  ticket?: {
    in: number[];
  };
}

// トレードレコード作成用インターフェース
export interface CreateTradeRecordInput {
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
} 