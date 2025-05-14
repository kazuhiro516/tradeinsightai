import { PrismaClient } from '@prisma/client';
import { ApiErrorResponse } from '@/types/api';

/**
 * エラーレスポンスの型定義
 * 共通型のApiErrorResponseを再エクスポート
 */
export type ErrorResponse = ApiErrorResponse;

/**
 * トレードファイルのステータス
 */
export type TradeFileStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * トレードファイルの型定義
 */
export type TradeFile = Awaited<ReturnType<PrismaClient['tradeFile']['findUnique']>>;

/**
 * トレードレコードの型定義
 */
export type TradeRecord = Awaited<ReturnType<PrismaClient['tradeRecord']['findUnique']>>;

/**
 * ファイルアップロードリクエストの型定義
 */
export interface UploadFileRequest {
  userId: string;
  file: File;
}

/**
 * ファイルアップロードレスポンスの型定義
 * recordsCount: 今回新規に保存された取引記録の件数
 * skippedCount: 重複により保存されなかった件数
 */
export interface UploadFileResponse {
  id: string;
  fileName: string;
  status: TradeFileStatus;
  recordsCount: number; // 新規保存件数
  skippedCount: number; // 重複除外件数
  success?: boolean;
  error?: string;
  details?: string;
}

/**
 * トレードファイル作成の入力型定義
 */
export interface CreateTradeFileInput {
  id: string;
  fileName: string;
  uploadDate: Date;
  fileSize: number;
  fileType: string;
  status: TradeFileStatus;
  recordsCount: number;
  userId: string;
}
