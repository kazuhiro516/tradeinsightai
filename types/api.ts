/**
 * APIエラーレスポンスの共通型定義
 */
export interface ApiErrorResponse {
  error: string;
  details?: string;
}

/**
 * API成功レスポンスの共通型定義
 */
export interface ApiSuccessResponse<T> {
  data: T;
  message?: string;
}

/**
 * ページネーション情報の共通型定義
 */
export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
}

/**
 * ページネーション付きレスポンスの共通型定義
 */
export interface PaginatedResponse<T> extends PaginationInfo {
  data: T[];
}

/**
 * トレードファイルの型定義
 */
export interface TradeFile {
  id: string;
  fileName: string;
  uploadDate: string;
  fileSize: number;
  status: string;
  recordsCount: number;
  errorMessage: string | null;
}
