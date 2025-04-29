import { TradeFilter } from '@/types/trade';

/**
 * TradeFilterをAPI用に正規化する共通関数
 * - type=allならtypesはundefined
 * - typeがbuy/sellなら[それ]
 * - itemsはそのまま配列で扱う
 * - 日付はJST 0:00:00/23:59:59.999でISO8601文字列
 */
export function buildTradeFilterParams(userFilter: TradeFilter) {
  // type=allならtypesはundefined
  let types: string[] | undefined = undefined;
  if (typeof userFilter.type === 'string' && userFilter.type !== 'all') {
    types = [userFilter.type];
  }

  // itemsはそのまま配列で扱う
  const items = userFilter.items ?? [];

  // 日付をJST 0:00:00/23:59:59.999でISO8601
  const startDate = userFilter.startDate instanceof Date
    ? new Date(userFilter.startDate.getFullYear(), userFilter.startDate.getMonth(), userFilter.startDate.getDate(), 0, 0, 0, 0).toISOString()
    : userFilter.startDate;
  const endDate = userFilter.endDate instanceof Date
    ? new Date(userFilter.endDate.getFullYear(), userFilter.endDate.getMonth(), userFilter.endDate.getDate(), 23, 59, 59, 999).toISOString()
    : userFilter.endDate;

  return {
    ...userFilter,
    types,
    items,
    startDate,
    endDate,
  };
}
