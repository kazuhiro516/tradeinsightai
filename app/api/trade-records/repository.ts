import { 
  TradeFilter, 
  TradeRecord, 
  TradeRecordsResponse, 
  CreateTradeRecordInput,
  WhereCondition
} from './models'

// トレードレコードリポジトリのインターフェース
export interface TradeRecordRepository {
  // トレードレコードを取得する
  findMany(userId: string, filter: TradeFilter): Promise<TradeRecordsResponse>;
  
  // トレードレコードを作成する
  create(userId: string, data: CreateTradeRecordInput): Promise<TradeRecord>;
  
  // フィルター条件を構築する
  buildWhereCondition(userId: string, filter: TradeFilter): WhereCondition;
  
  // ソート条件を構築する
  buildOrderBy(filter: TradeFilter): Record<string, 'asc' | 'desc'>;
} 