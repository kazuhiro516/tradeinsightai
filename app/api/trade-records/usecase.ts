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
import { TimeZoneStat, SymbolStat, WeekdayStat, WeekdayTimeZoneHeatmapCell } from '@/types/dashboard';
import { toJSTDate, detectMarketZoneJST } from '@/utils/date';

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

  /**
   * 時間帯（市場区分）別の成績を集計
   */
  static getTimeZoneStats(trades: TradeRecord[]): TimeZoneStat[] {
    const zones = [
      { zone: 'tokyo', label: '東京' },
      { zone: 'london', label: 'ロンドン' },
      { zone: 'newyork', label: 'ニューヨーク' },
      { zone: 'other', label: 'その他' },
    ];
    const stats: Record<string, TradeRecord[]> = { tokyo: [], london: [], newyork: [], other: [] };
    trades.forEach(trade => {
      const jst = toJSTDate(trade.openTime);
      if (!jst) return; // JST変換できない場合はスキップ
      const zone = detectMarketZoneJST(jst);
      stats[zone].push(trade);
    });
    return zones.map(z => {
      const arr = stats[z.zone];
      const wins = arr.filter(t => t.profit && t.profit > 0).length;
      const total = arr.length;
      const totalProfit = arr.reduce((sum, t) => sum + (t.profit || 0), 0);
      const winRate = total > 0 ? (wins / total) * 100 : 0;
      return {
        zone: z.zone as TimeZoneStat['zone'],
        label: z.label,
        trades: total,
        winRate,
        totalProfit,
      };
    });
  }

  /**
   * 通貨ペア別の成績を集計
   */
  static getSymbolStats(trades: TradeRecord[]): SymbolStat[] {
    const bySymbol: Record<string, TradeRecord[]> = {};
    trades.forEach(trade => {
      if (!bySymbol[trade.item]) bySymbol[trade.item] = [];
      bySymbol[trade.item].push(trade);
    });
    return Object.entries(bySymbol).map(([symbol, arr]) => {
      const wins = arr.filter(t => t.profit && t.profit > 0).length;
      const total = arr.length;
      const totalProfit = arr.reduce((sum, t) => sum + (t.profit || 0), 0);
      const winRate = total > 0 ? (wins / total) * 100 : 0;
      const profitRate = total > 0 ? (totalProfit / total) : 0;
      return {
        symbol,
        trades: total,
        winRate,
        profitRate,
        totalProfit,
      };
    });
  }

  /**
   * 曜日別の成績を集計
   */
  static getWeekdayStats(trades: TradeRecord[]): WeekdayStat[] {
    const week: Record<number, TradeRecord[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    trades.forEach(trade => {
      const jst = toJSTDate(trade.openTime);
      if (!jst) return;
      const wd = jst.getDay();
      if (isNaN(wd) || week[wd] === undefined) return;
      week[wd].push(trade);
    });
    const labels = ['日', '月', '火', '水', '木', '金', '土'];
    return Object.entries(week).map(([wd, arr]) => {
      const wins = arr.filter(t => t.profit && t.profit > 0).length;
      const total = arr.length;
      const totalProfit = arr.reduce((sum, t) => sum + (t.profit || 0), 0);
      const winRate = total > 0 ? (wins / total) * 100 : 0;
      const profitRate = total > 0 ? (totalProfit / total) : 0;
      return {
        weekday: Number(wd),
        label: labels[Number(wd)],
        trades: total,
        winRate,
        profitRate,
        totalProfit,
      };
    });
  }

  /**
   * 曜日×市場区分ヒートマップ集計
   */
  static getWeekdayTimeZoneHeatmap(trades: TradeRecord[]): WeekdayTimeZoneHeatmapCell[] {
    const zones = [
      { zone: 'tokyo' },
      { zone: 'london' },
      { zone: 'newyork' },
      { zone: 'other' },
    ];
    const map: Record<number, Record<string, TradeRecord[]>> = {};
    for (let wd = 0; wd < 7; wd++) {
      map[wd] = { tokyo: [], london: [], newyork: [], other: [] };
    }
    trades.forEach(trade => {
      const jst = toJSTDate(trade.openTime);
      if (!jst) return;
      const wd = jst.getDay();
      if (isNaN(wd) || map[wd] === undefined) return;
      const zone = detectMarketZoneJST(jst);
      if (!(zone in map[wd])) return;
      map[wd][zone].push(trade);
    });
    const result: WeekdayTimeZoneHeatmapCell[] = [];
    for (let wd = 0; wd < 7; wd++) {
      for (const z of zones) {
        const arr = map[wd][z.zone];
        const wins = arr.filter(t => t.profit && t.profit > 0).length;
        const total = arr.length;
        const totalProfit = arr.reduce((sum, t) => sum + (t.profit || 0), 0);
        const winRate = total > 0 ? (wins / total) * 100 : 0;
        const profitRate = total > 0 ? (totalProfit / total) : 0;
        result.push({
          weekday: wd,
          zone: z.zone as WeekdayTimeZoneHeatmapCell['zone'],
          winRate,
          profitRate,
          trades: total,
        });
      }
    }
    return result;
  }
}
