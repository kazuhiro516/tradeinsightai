import { PrismaClient } from '@prisma/client';
import { ApiErrorResponse } from '@/types/api';

/**
 * ユーザーの型定義
 */
export type User = Awaited<ReturnType<PrismaClient['user']['findUnique']>>;

/**
 * エラーレスポンスの型定義
 * 共通型のApiErrorResponseを再エクスポート
 */
export type ErrorResponse = ApiErrorResponse;

/**
 * ユーザー作成リクエストの型定義
 */
export interface CreateUserRequest {
  supabaseId: string;
  name: string;
}

/**
 * ユーザー更新リクエストの型定義
 */
export interface UpdateUserRequest {
  name?: string;
}
