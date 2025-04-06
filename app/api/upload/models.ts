import { PrismaClient } from '@prisma/client';

// エラーレスポンスのインターフェース
export interface ErrorResponse {
  error: string;
  details?: string;
}

// トレードファイルのステータス
export type TradeFileStatus = 'pending' | 'processing' | 'completed' | 'failed';

// トレードファイルのインターフェース
export type TradeFile = Awaited<ReturnType<PrismaClient['tradeFile']['findUnique']>>;

// トレードレコードのインターフェース
export type TradeRecord = Awaited<ReturnType<PrismaClient['tradeRecord']['findUnique']>>;

// ファイルアップロードリクエストのインターフェース
export interface UploadFileRequest {
  userId: string;
  file: File;
}

// ファイルアップロードレスポンスのインターフェース
export interface UploadFileResponse {
  id: string;
  fileName: string;
  status: TradeFileStatus;
  recordsCount: number;
} 