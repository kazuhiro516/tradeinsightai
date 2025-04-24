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

/**
 * MT4サーバー時間と日本時間の変換ユーティリティ
 */

/**
 * MT4サーバーの夏時間（DST）期間を判定
 * 3月最後の日曜日から10月最後の日曜日まで
 */
export const isMT4ServerDST = (date: Date): boolean => {
  const year = date.getUTCFullYear();

  // 3月の最後の日曜日を計算
  const marchLastDay = new Date(Date.UTC(year, 2, 31));
  const marchLastSunday = new Date(Date.UTC(
    year,
    2,
    31 - ((marchLastDay.getUTCDay() + 7) % 7)
  ));

  // 10月の最後の日曜日を計算
  const octoberLastDay = new Date(Date.UTC(year, 9, 31));
  const octoberLastSunday = new Date(Date.UTC(
    year,
    9,
    31 - ((octoberLastDay.getUTCDay() + 7) % 7)
  ));

  return date >= marchLastSunday && date < octoberLastSunday;
};

/**
 * MT4サーバー時間（文字列）をDateオブジェクトに変換
 * @param dateStr YYYY.MM.DD HH:MM:SS 形式の文字列
 * @returns Dateオブジェクト（UTC）
 */
export const parseMT4ServerTime = (dateStr: string): Date | undefined => {
  if (!dateStr || dateStr.trim() === '') return undefined;

  // 日付形式: YYYY.MM.DD HH:MM:SS
  const dateParts = dateStr.trim().split(' ');
  if (dateParts.length !== 2) return undefined;

  const dateStr2 = dateParts[0].replace(/\./g, '-');
  const timeStr = dateParts[1];

  // いったんローカル時間として解析
  const localDate = new Date(`${dateStr2}T${timeStr}`);
  if (isNaN(localDate.getTime())) return undefined;

  // MT4サーバー時間（GMT+2 or GMT+3）からUTCに変換
  const offset = isMT4ServerDST(localDate) ? 3 : 2;
  return new Date(localDate.getTime() - offset * 60 * 60 * 1000);
};

/**
 * UTCの日時をMT4サーバー時間の文字列に変換
 * @param date UTCのDateオブジェクト
 * @returns YYYY.MM.DD HH:MM:SS 形式の文字列
 */
export const formatMT4ServerTime = (date: Date): string => {
  const offset = isMT4ServerDST(date) ? 3 : 2;
  const serverTime = new Date(date.getTime() + offset * 60 * 60 * 1000);

  const year = serverTime.getUTCFullYear();
  const month = String(serverTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(serverTime.getUTCDate()).padStart(2, '0');
  const hours = String(serverTime.getUTCHours()).padStart(2, '0');
  const minutes = String(serverTime.getUTCMinutes()).padStart(2, '0');
  const seconds = String(serverTime.getUTCSeconds()).padStart(2, '0');

  return `${year}.${month}.${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * UTCの日時を日本時間（JST）の文字列に変換
 * @param date UTCのDateオブジェクト
 * @returns 日本時間の文字列（YYYY年MM月DD日 HH:mm:ss）
 */
export const formatJST = (date: Date): string => {
  return date.toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });
};

/**
 * MT4サーバー時間の文字列を日本時間の文字列に変換
 * @param mt4TimeStr YYYY.MM.DD HH:MM:SS 形式のMT4サーバー時間文字列
 * @returns 日本時間の文字列（YYYY年MM月DD日 HH:mm:ss）
 */
export const convertMT4ToJST = (mt4TimeStr: string): string | undefined => {
  const utcDate = parseMT4ServerTime(mt4TimeStr);
  if (!utcDate) return undefined;
  return formatJST(utcDate);
};
