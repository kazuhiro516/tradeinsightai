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
 * @param dateInput 日付文字列またはDateオブジェクト
 * @returns フォーマットされた日時文字列
 */
export const formatDateTime = (dateInput: string | Date): string => {
  try {
    // 日付オブジェクトを作成
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;

    // 無効な日付の場合は空文字を返す
    if (isNaN(date.getTime())) {
      console.error('無効な日付:', dateInput);
      return '';
    }

    // 日本時間に変換（UTC+9）
    const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);

    return jstDate.toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    });
  } catch (error) {
    console.error('日付のパースエラー:', error, dateInput);
    return '';
  }
};

/**
 * 日付を月日のフォーマットで表示する
 * @param dateStr 日付文字列
 * @returns フォーマットされた月日文字列
 */
export const formatMonthDay = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return '';
    }
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    return `${month}/${day}`;
  } catch (error) {
    console.error('日付のパースエラー:', error);
    return '';
  }
};

/**
 * 年月のフォーマットを変換する
 * @param yearMonth YYYY-MM形式の文字列
 * @returns YYYY/MM形式の文字列
 */
export const formatYearMonth = (yearMonth: string): string => {
  try {
    const [year, month] = yearMonth.split('-');
    return `${year}/${month}`;
  } catch (error) {
    console.error('日付のパースエラー:', error);
    return '';
  }
};

/**
 * 年月を日本語表記に変換する
 * @param yearMonth YYYY-MM形式の文字列
 * @returns YYYY年MM月形式の文字列
 */
export const formatYearMonthJP = (yearMonth: string): string => {
  try {
    const [year, month] = yearMonth.split('-');
    return `${year}年${month}月`;
  } catch (error) {
    console.error('日付のパースエラー:', error);
    return '';
  }
};

/**
 * XMのMT4/MT5サーバー時間と日本時間の変換ユーティリティ
 * XMサーバー時間から日本時間への変換：
 * - 冬時間期間：+7時間（JST = XM時間 + 7）
 * - 夏時間期間：+6時間（JST = XM時間 + 6）
 */

/**
 * XMのMT4/MT5サーバーの夏時間（DST）期間を判定
 * 3月最後の日曜日から10月最後の日曜日まで
 * @param date 判定する日付（UTC）
 * @returns 夏時間の場合true、冬時間の場合false
 */
export const isXMServerDST = (date: Date): boolean => {
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
 * XMのMT4/MT5サーバー時間（文字列）をDateオブジェクトに変換
 * @param dateStr YYYY.MM.DD HH:MM:SS 形式またはISO形式の文字列
 * @returns Dateオブジェクト（UTC）、無効な形式の場合はundefined
 */
export const parseXMServerTime = (dateStr: string): Date | undefined => {
  if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === '') {
    return undefined;
  }

  try {
    let date: Date;

    // ISO形式の場合（YYYY-MM-DDTHH:mm:ss.sssZ）
    if (dateStr.includes('T')) {
      date = new Date(dateStr);
    }
    // XM形式の場合（YYYY.MM.DD HH:MM:SS）
    else {
      const [datePart, timePart] = dateStr.split(' ');
      const [year, month, day] = datePart.split(/[-.]/).map(Number);
      const [hours, minutes, seconds] = timePart.split(':').map(Number);
      date = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
    }

    if (isNaN(date.getTime())) {
      return undefined;
    }

    return date;
  } catch (error) {
    console.error('Invalid date format:', dateStr, error);
    return undefined;
  }
};

/**
 * UTCの日時をXMのMT4/MT5サーバー時間の文字列に変換
 * @param date UTCのDateオブジェクト
 * @returns YYYY.MM.DD HH:MM:SS 形式の文字列
 */
export const formatXMServerTime = (date: Date): string => {
  const offset = isXMServerDST(date) ? -6 : -7; // 日本時間からXM時間への変換
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
 * UTCの日時文字列を日本時間（JST）の文字列に変換
 * @param dateStr 日時文字列またはDateオブジェクト
 * @returns 日本時間の文字列（YYYY年MM月DD日 HH:mm:ss）
 */
export const formatJST = (dateStr: string | Date): string => {
  try {
    // 日付オブジェクトを作成
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(date.getTime())) {
      return '';
    }

    // UTCの時刻を取得
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    let hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    const seconds = date.getUTCSeconds();

    // 9時間（JST）を加算
    hours = (hours + 9) % 24;
    let newDay = day;
    let newMonth = month;
    let newYear = year;

    // 日付の繰り上げ
    if (hours < 9) {
      newDay += 1;
      const lastDayOfMonth = new Date(year, month, 0).getUTCDate();
      if (newDay > lastDayOfMonth) {
        newDay = 1;
        newMonth += 1;
        if (newMonth > 12) {
          newMonth = 1;
          newYear += 1;
        }
      }
    }

    // 日本時間フォーマットで表示
    return `${newYear}年${newMonth}月${newDay}日 ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  } catch (error) {
    console.error('日付のパースエラー:', error);
    return '';
  }
};

/**
 * 日付の文字列から時間部分を取り除き、日付のみを表示する
 * @param dateStr 日付文字列またはDateオブジェクト
 * @returns 日付のみの文字列（YYYY年MM月DD日）
 */
export const formatDateOnly = (dateStr: string | Date): string => {
  try {
    // 日付オブジェクトを作成
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(date.getTime())) {
      return '';
    }

    // UTCの時刻を取得
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();

    // 日本時間の日付はUTCの日付+9時間なので
    // 時間が15時以降なら日本時間では翌日になる
    let newDay = day;
    let newMonth = month;
    let newYear = year;

    const hours = date.getUTCHours();
    if (hours >= 15) { // UTC 15時 = JST 0時
      newDay += 1;
      const lastDayOfMonth = new Date(year, month, 0).getUTCDate();
      if (newDay > lastDayOfMonth) {
        newDay = 1;
        newMonth += 1;
        if (newMonth > 12) {
          newMonth = 1;
          newYear += 1;
        }
      }
    }

    // 日付のみフォーマットで表示
    return `${newYear}年${newMonth}月${newDay}日`;
  } catch (error) {
    console.error('日付のパースエラー:', error);
    return '';
  }
};

/**
 * XMのMT4/MT5サーバー時間の文字列を日本時間の文字列に変換
 * @param xmTimeStr YYYY.MM.DD HH:MM:SS 形式のXMサーバー時間文字列
 * @returns 日本時間の文字列（YYYY年MM月DD日 HH:mm:ss）、無効な形式の場合はundefined
 * @example
 * // 冬時間の場合（日本時間との時差：7時間）
 * convertXMToJST('2024.01.15 10:00:00') // '2024年1月15日 17:00:00'
 * // 夏時間の場合（日本時間との時差：6時間）
 * convertXMToJST('2024.07.15 10:00:00') // '2024年7月15日 16:00:00'
 */
export const convertXMToJST = (xmTimeStr: string): string | undefined => {
  try {
    const utcDate = parseXMServerTime(xmTimeStr);
    if (!utcDate) return undefined;

    // XM時間が夏時間か冬時間かを判定
    const isDST = isXMServerDST(utcDate);

    // 日本時間への変換（冬時間: +7時間、夏時間: +6時間）
    const jstHourOffset = isDST ? 6 : 7;
    const jstDate = new Date(utcDate.getTime() + (jstHourOffset * 60 * 60 * 1000));

    // 日本時間フォーマットで表示
    const year = jstDate.getUTCFullYear();
    const month = jstDate.getUTCMonth() + 1;
    const day = jstDate.getUTCDate();
    const hours = String(jstDate.getUTCHours()).padStart(2, '0');
    const minutes = String(jstDate.getUTCMinutes()).padStart(2, '0');
    const seconds = String(jstDate.getUTCSeconds()).padStart(2, '0');

    return `${year}年${month}月${day}日 ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.error('Failed to convert XM time to JST:', xmTimeStr, error);
    return undefined;
  }
};

/**
 * ロンドン市場の夏時間（サマータイム）判定
 * 英国の夏時間：3月最終日曜日～10月最終日曜日
 * @param date UTC基準
 * @returns 夏時間ならtrue
 */
export const isLondonDST = (date: Date): boolean => {
  const year = date.getUTCFullYear();
  // 3月の最終日曜日
  const marchLastDay = new Date(Date.UTC(year, 2, 31));
  const marchLastSunday = new Date(Date.UTC(
    year,
    2,
    31 - ((marchLastDay.getUTCDay() + 7) % 7)
  ));
  // 10月の最終日曜日
  const octoberLastDay = new Date(Date.UTC(year, 9, 31));
  const octoberLastSunday = new Date(Date.UTC(
    year,
    9,
    31 - ((octoberLastDay.getUTCDay() + 7) % 7)
  ));
  return date >= marchLastSunday && date < octoberLastSunday;
};

/**
 * ニューヨーク市場の夏時間（サマータイム）判定
 * 米国の夏時間：3月第2日曜日～11月第1日曜日
 * @param date UTC基準
 * @returns 夏時間ならtrue
 */
export const isNewYorkDST = (date: Date): boolean => {
  const year = date.getUTCFullYear();
  // 3月第2日曜日
  let secondSunday = 0;
  for (let i = 0, sundayCount = 0; i < 31; i++) {
    const d = new Date(Date.UTC(year, 2, 1 + i));
    if (d.getUTCDay() === 0) {
      sundayCount++;
      if (sundayCount === 2) {
        secondSunday = 1 + i;
        break;
      }
    }
  }
  const marchSecondSunday = new Date(Date.UTC(year, 2, secondSunday));
  // 11月第1日曜日
  let firstSunday = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(Date.UTC(year, 10, 1 + i));
    if (d.getUTCDay() === 0) {
      firstSunday = 1 + i;
      break;
    }
  }
  const novemberFirstSunday = new Date(Date.UTC(year, 10, firstSunday));
  return date >= marchSecondSunday && date < novemberFirstSunday;
};

/**
 * DB保存のUTC日時をXMサーバーの夏時間/冬時間ルールでJSTに変換
 * @param dateStr ISO文字列 or Date（UTC基準）
 * @returns JSTのDateオブジェクト（夏時間は+6h、冬時間は+7h）
 */
export const toJSTDate = (dateStr: string | Date): Date | undefined => {
  let date: Date | undefined;
  if (typeof dateStr === 'string') {
    date = new Date(dateStr);
  } else if (dateStr instanceof Date) {
    date = dateStr;
  }
  if (!date || isNaN(date.getTime())) return undefined;
  const isDST = isXMServerDST(date);
  const offset = isDST ? 6 : 7;
  return new Date(date.getTime() + offset * 60 * 60 * 1000);
};

/**
 * JSTの時刻から市場区分を判定（アプリ独自仕様）
 * - 東京時間: 8:00 ~ 14:59
 * - ロンドン時間: 15:00 ~ 20:59
 * - ニューヨーク時間: 21:00 ~ 翌2:00
 * - その他: 2:00 ~ 7:59
 * @param jst JSTのDateオブジェクト
 * @returns 'tokyo' | 'london' | 'newyork' | 'other'
 */
export function detectMarketZoneJST(jst: Date): 'tokyo' | 'london' | 'newyork' | 'other' {
  const h = jst.getUTCHours();
  // 東京時間: 8:00 ~ 14:59
  if (h >= 8 && h < 15) return 'tokyo';
  // ロンドン時間: 15:00 ~ 20:59
  if (h >= 15 && h < 21) return 'london';
  // ニューヨーク時間: 21:00 ~ 翌2:00
  if (h >= 21 || h < 2) return 'newyork';
  // その他: 2:00 ~ 7:59
  return 'other';
}
