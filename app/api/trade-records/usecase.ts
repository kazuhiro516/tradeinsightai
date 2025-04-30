import { prisma } from '@/lib/prisma';
import {
  TradeFilter,
  TradeRecord,
  TradeRecordsResponse,
  CreateTradeRecordInput
} from '@/types/trade';
import { buildWhereCondition, convertPrismaRecord } from './models';
import type { Prisma } from '@prisma/client';
import { ulid } from 'ulid';

/**
 * トレードレコード関連のビジネスロジックを担当するユースケースクラス
 */
export class TradeRecordUseCase {
  /**
   * ユーザーIDとフィルター条件に基づいてトレードレコードを取得する
   * @param userId ユーザーID
   * @param filter フィルター条件
   * @returns 取得されたトレードレコードのレスポンス
   */
  async getTradeRecords(userId: string, filter: TradeFilter): Promise<TradeRecordsResponse> {
    const where = buildWhereCondition(userId, filter);
    const sortField = filter.sortBy || 'openTime';
    const sortOrder: 'asc' | 'desc' = filter.sortOrder || 'desc';
    const orderBy = { [sortField]: sortOrder } as { [key: string]: 'asc' | 'desc' };
    const page = filter.page || 1;
    const pageSize = filter.pageSize || 50;

    const [records, total] = await Promise.all([
      prisma.tradeRecord.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.tradeRecord.count({ where })
    ]);

    return {
      records: records.map(convertPrismaRecord),
      total,
      page,
      pageSize
    };
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
      throw new Error('必須パラメータが不足しています: ticket, openTime, type, itemはすべて必須です');
    }

    const {
      id,
      tradeFileId,
      closeTime,
      stopLoss,
      takeProfit,
      commission,
      taxes,
      swap,
      profit,
      closePrice,
      ...rest
    } = data;
    const dataBase: Omit<Prisma.TradeRecordCreateInput, 'id'> = {
      ...rest,
      user: { connect: { id: userId } },
      tradeFile: { connect: { id: tradeFileId! } },
      openTime: new Date(data.openTime),
      closeTime: closeTime ? new Date(closeTime) : null,
      stopLoss: stopLoss !== undefined ? stopLoss : null,
      takeProfit: takeProfit !== undefined ? takeProfit : null,
      commission: commission !== undefined ? commission : null,
      taxes: taxes !== undefined ? taxes : null,
      swap: swap !== undefined ? swap : null,
      profit: profit !== undefined ? profit : null,
      closePrice: closePrice !== undefined ? closePrice : 0,
    };
    // idがなければulidを生成
    const recordId = id ?? ulid();
    const createData: Prisma.TradeRecordCreateInput = { ...dataBase, id: recordId };
    const created = await prisma.tradeRecord.create({ data: createData });
    return convertPrismaRecord(created);
  }
}
