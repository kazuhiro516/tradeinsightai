/**
 * 金額を整数に丸めて3桁区切りのカンマ付き文字列に変換する
 * @param value 変換する数値
 * @returns フォーマットされた文字列
 */
export const formatCurrency = (value: number | undefined | null): string => {
  if (value === undefined || value === null) return '0';
  return Math.round(value).toLocaleString('ja-JP');
};

/**
 * パーセント値を小数点2桁までの文字列に変換する
 * @param value 変換する数値
 * @returns フォーマットされた文字列
 */
export const formatPercent = (value: number | undefined | null): string => {
  if (value === undefined || value === null) return '0.00';
  return value.toFixed(2);
};
