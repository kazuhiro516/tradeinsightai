import { PrismaClient } from '@prisma/client';

// ユーザーのインターフェース
export type User = Awaited<ReturnType<PrismaClient['user']['findUnique']>>;

// エラーレスポンスのインターフェース
export interface ErrorResponse {
  error: string;
  details?: string;
}

// ユーザー作成リクエストのインターフェース
export interface CreateUserRequest {
  supabaseId: string;
  name: string;
}

// ユーザー更新リクエストのインターフェース
export interface UpdateUserRequest {
  name?: string;
} 