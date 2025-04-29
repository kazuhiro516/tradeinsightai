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

/**
 * AIアシスタントのツール呼び出し用フィルターパラメータを生成する関数
 * @param aiParams TradeFilter型またはAI function callingのparams
 * @returns AI function calling用のフィルターパラメータ
 */
export function builAIParamsdFilter(
  aiParams: Partial<TradeFilter> & { types?: string[]; items?: string[] }
) {
  // types
  let types: string[] | undefined = aiParams.types;
  if (types?.includes('all')) {
    types = undefined;
  }
  // itemsはそのまま配列で扱う
  const items = aiParams.items ?? [];

  // 日付をJST 0:00:00/23:59:59.999でISO8601
  const startDate = aiParams.startDate instanceof Date
    ? new Date(aiParams.startDate.getFullYear(), aiParams.startDate.getMonth(), aiParams.startDate.getDate(), 0, 0, 0, 0).toISOString()
    : aiParams.startDate;
  const endDate = aiParams.endDate instanceof Date
    ? new Date(aiParams.endDate.getFullYear(), aiParams.endDate.getMonth(), aiParams.endDate.getDate(), 23, 59, 59, 999).toISOString()
    : aiParams.endDate;

  return {
    ...aiParams,
    types,
    items,
    startDate,
    endDate,
  };
}
