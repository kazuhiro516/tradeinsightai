import {
  TradeFilter,
  TradeRecord,
  TradeRecordsResponse,
  CreateTradeRecordInput
} from './models'
import { TradeRecordRepository } from './repository'

/**
 * トレードレコード関連のビジネスロジックを担当するユースケースクラス
 */
export class TradeRecordUseCase {
  constructor(private repository: TradeRecordRepository) {}

  /**
   * ユーザーIDとフィルター条件に基づいてトレードレコードを取得する
   * @param userId ユーザーID
   * @param filter フィルター条件
   * @returns 取得されたトレードレコードのレスポンス
   */
  async getTradeRecords(userId: string, filter: TradeFilter): Promise<TradeRecordsResponse> {
    return this.repository.findMany(userId, filter)
  }

  /**
   * 新しいトレードレコードを作成する
   * @param userId ユーザーID
   * @param data トレードレコード作成に必要なデータ
   * @returns 作成されたトレードレコード
   */
  async createTradeRecord(userId: string, data: CreateTradeRecordInput): Promise<TradeRecord> {
    // 必須パラメータの検証
    if (!data.ticket || !data.openTime || !data.type || !data.item) {
      throw new Error('必須パラメータが不足しています: ticket, openTime, type, itemはすべて必須です')
    }

    return this.repository.create(userId, data)
  }
}
