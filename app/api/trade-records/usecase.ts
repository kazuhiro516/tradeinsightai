import { 
  TradeFilter, 
  TradeRecord, 
  TradeRecordsResponse, 
  CreateTradeRecordInput
} from './models'
import { TradeRecordRepository } from './repository'

// トレードレコードのユースケース
export class TradeRecordUseCase {
  constructor(private repository: TradeRecordRepository) {}

  // フィルター文字列をJSONオブジェクトに変換する
  parseFilterJson(filterStr: string | null): TradeFilter {
    if (!filterStr) return {}
    try {
      return JSON.parse(filterStr)
    } catch (error) {
      console.error('フィルターの解析エラー:', error)
      return {}
    }
  }

  // トレードレコードを取得する
  async getTradeRecords(userId: string, filter: TradeFilter): Promise<TradeRecordsResponse> {
    return this.repository.findMany(userId, filter)
  }

  // トレードレコードを作成する
  async createTradeRecord(userId: string, data: CreateTradeRecordInput): Promise<TradeRecord> {
    // 必須パラメータの検証
    if (!data.ticket || !data.openTime || !data.type || !data.item) {
      throw new Error('必須パラメータが不足しています')
    }

    return this.repository.create(userId, data)
  }
} 