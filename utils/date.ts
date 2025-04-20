/**
 * 日付をUTCに変換する
 * @param date 変換する日付
 * @returns UTC日付
 */
export const convertToUTC = (date: Date): Date => {
  return new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds()
  ));
};

/**
 * 日時を日本語フォーマットで表示する
 * @param dateStr 日付文字列
 * @returns フォーマットされた日時文字列
 */
export const formatDateTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  });
};

/**
 * 日付を月日のフォーマットで表示する
 * @param dateStr 日付文字列
 * @returns フォーマットされた月日文字列
 */
export const formatMonthDay = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: 'numeric',
    day: 'numeric'
  });
};

/**
 * 年月のフォーマットを変換する
 * @param yearMonth YYYY-MM形式の文字列
 * @returns YYYY/MM形式の文字列
 */
export const formatYearMonth = (yearMonth: string): string => {
  const [year, month] = yearMonth.split('-');
  return `${year}/${month}`;
};

/**
 * 年月を日本語表記に変換する
 * @param yearMonth YYYY-MM形式の文字列
 * @returns YYYY年MM月形式の文字列
 */
export const formatYearMonthJP = (yearMonth: string): string => {
  const [year, month] = yearMonth.split('-');
  return `${year}年${month}月`;
};
