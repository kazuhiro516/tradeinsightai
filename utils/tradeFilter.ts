import { PAGINATION } from '@/constants/pagination';
import { TradeFilter } from '@/types/trade';

/**
 * TradeFilterをAPI用に正規化する共通関数
 * - type=allならtypesはundefined
 * - typeがbuy/sellなら[それ]
 * - itemsはそのまま配列で扱う
 * - 日付はJST 0:00:00/23:59:59.999でISO8601文字列
 */
export function buildTradeFilterParams(userFilter: TradeFilter): TradeFilter {
  // 日付をJST 0:00:00/23:59:59.999でISO8601
  let startDate: Date | undefined = undefined;
  let endDate: Date | undefined = undefined;

  if (userFilter.startDate) {
    startDate = new Date(userFilter.startDate);
    startDate.setHours(0, 0, 0, 0);
  }

  if (userFilter.endDate) {
    endDate = new Date(userFilter.endDate);
    endDate.setHours(23, 59, 59, 999);
  }

  return {
    ...userFilter,
    startDate,
    endDate,
    sortBy: userFilter.sortBy || 'openTime',
    sortOrder: userFilter.sortOrder || 'desc',
    page: userFilter.page || PAGINATION.DEFAULT_PAGE,
    pageSize: userFilter.pageSize || PAGINATION.DEFAULT_PAGE_SIZE
  };
}

/**
 * AIアシスタントのツール呼び出し用フィルターパラメータを生成する関数
 * @param aiParams 期間パラメータ（startDate, endDate）
 * @returns AI function calling用のフィルターパラメータ
 */
export function buildAIParamsFilter(
  aiParams: { startDate?: string; endDate?: string }
) {
  // 日付をJST 0:00:00/23:59:59.999でISO8601
  const startDate: Date | undefined = aiParams.startDate ? new Date(aiParams.startDate) : undefined;
  const endDate: Date | undefined = aiParams.endDate ? new Date(aiParams.endDate) : undefined;

  if (startDate) {
    startDate.setHours(0, 0, 0, 0);
  }

  if (endDate) {
    endDate.setHours(23, 59, 59, 999);
  }

  return {
    startDate,
    endDate,
  };
}
