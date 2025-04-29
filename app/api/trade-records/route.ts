import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest, createErrorResponse, parseJsonSafely } from '@/utils/api'
import { formatJST, parseXMServerTime } from '@/utils/date'
import { prisma } from '@/lib/prisma'
import { buildWhereCondition, convertPrismaRecord } from './models'
import { TradeFilter, CreateTradeRecordInput } from '@/types/trade'
import type { Prisma } from '@prisma/client'

/**
 * トレードレコードを取得するAPI
 */
export async function GET(request: NextRequest) {
  try {
    // APIリクエストの認証と、ユーザーIDの取得
    const { userId, errorResponse } = await authenticateApiRequest(request);
    if (errorResponse) {
      return errorResponse;
    }

    // クエリパラメータを取得
    const searchParams = request.nextUrl.searchParams;
    const filterStr = searchParams.get('filter');
    const filter: TradeFilter = filterStr ? parseJsonSafely(filterStr, {}) : {};

    // where条件とorderBy条件を構築
    const where = buildWhereCondition(userId!, filter);
    const orderBy = buildOrderByPrisma(filter);
    const page = filter.page || 1;
    const pageSize = filter.pageSize || 50;

    // データ取得
    const [records, total] = await Promise.all([
      prisma.tradeRecord.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.tradeRecord.count({ where })
    ]);

    // レスポンス整形
    const formattedRecords = records
      .filter((record): record is NonNullable<typeof record> => record !== null)
      .map(record => {
        const converted = convertPrismaRecord(record);
        return {
          ...converted,
          openTime: converted.openTime ? formatJST(parseXMServerTime(converted.openTime) || converted.openTime) : null,
          closeTime: converted.closeTime ? formatJST(parseXMServerTime(converted.closeTime) || converted.closeTime) : null,
          createdAt: formatJST(converted.createdAt),
          updatedAt: formatJST(converted.updatedAt)
        };
      });

    const response = {
      records: formattedRecords,
      total,
      page,
      pageSize
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('トレードレコード取得エラー:', error);
    return createErrorResponse('トレードレコードの取得に失敗しました');
  }
}

/**
 * トレードレコードを作成するAPI
 */
export async function POST(request: NextRequest) {
  try {
    // APIリクエストの認証と、ユーザーIDの取得
    const { userId, errorResponse } = await authenticateApiRequest(request);
    if (errorResponse) {
      return errorResponse;
    }

    // リクエストボディを取得
    const recordData: CreateTradeRecordInput = await request.json();

    // 必須パラメータの検証
    if (!recordData.ticket || !recordData.openTime || !recordData.type || !recordData.item) {
      return createErrorResponse('必須パラメータが不足しています: ticket, openTime, type, itemはすべて必須です');
    }

    // Prismaで作成（undefinedのプロパティは除外）
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
    } = recordData;
    const dataBase: Omit<Prisma.TradeRecordCreateInput, 'id'> = {
      ...rest,
      user: { connect: { id: userId! } },
      tradeFile: { connect: { id: tradeFileId! } },
      openTime: new Date(recordData.openTime),
      closeTime: closeTime ? new Date(closeTime) : null,
      stopLoss: stopLoss !== undefined ? stopLoss : null,
      takeProfit: takeProfit !== undefined ? takeProfit : null,
      commission: commission !== undefined ? commission : null,
      taxes: taxes !== undefined ? taxes : null,
      swap: swap !== undefined ? swap : null,
      profit: profit !== undefined ? profit : null,
      closePrice: closePrice !== undefined ? closePrice : 0,
      // createdAt, updatedAtは自動
    };
    const data: Prisma.TradeRecordCreateInput = id ? { ...dataBase, id } : dataBase;
    const created = await prisma.tradeRecord.create({ data });

    const converted = convertPrismaRecord(created);
    return NextResponse.json(converted, { status: 201 });
  } catch (error) {
    console.error('トレードレコード作成エラー:', error);
    return createErrorResponse('トレードレコードの作成に失敗しました');
  }
}

// sortBy値をPrismaのカラム名にマッピング
function buildOrderByPrisma(filter: { sortBy?: string, sortOrder?: 'asc' | 'desc' }) {
  let sortField = filter.sortBy || 'openTime';
  if (sortField === 'startDate') sortField = 'openTime';
  return { [sortField]: filter.sortOrder || 'desc' };
}
