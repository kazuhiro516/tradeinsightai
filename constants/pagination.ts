/**
 * ページネーション関連の定数
 */
export const PAGINATION = {
  /**
   * デフォルトのページサイズ
   * @description ダッシュボードやトレード一覧で使用する1ページあたりの表示件数
   */
  DEFAULT_PAGE_SIZE: 200,

  /**
   * 最小ページサイズ
   * @description ページサイズの最小値
   */
  MIN_PAGE_SIZE: 10,

  /**
   * 最大ページサイズ
   * @description ページサイズの最大値
   */
  MAX_PAGE_SIZE: 1000,

  /**
   * デフォルトのページ番号
   */
  DEFAULT_PAGE: 1
} as const;
