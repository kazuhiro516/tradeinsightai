import { TradeFilter } from '@/types/trade';

/**
 * フィルター文字列をTradeFilterオブジェクトに変換する
 * @param filterStr JSONフォーマットのフィルター文字列
 * @throws {Error} パースに失敗した場合
 */
export function parseTradeFilter(filterStr: string): TradeFilter {
  try {
    const parsed = JSON.parse(filterStr);
    // 型安全のための基本的なバリデーション
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('フィルターはオブジェクトである必要があります');
    }
    return parsed as TradeFilter;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`フィルターのパースに失敗: ${error.message}`);
    }
    throw new Error('フィルターのパースに失敗しました');
  }
} 