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
 * チャットメッセージの型定義
 */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * チャットリクエストの型定義
 */
export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
}
