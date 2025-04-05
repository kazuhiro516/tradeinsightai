// エラーレスポンスのインターフェース
export interface ErrorResponse {
  error: string;
  details?: string;
}

// ユーザーのインターフェース
export interface User {
  id: number;
  supabaseId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// ユーザー作成のリクエストインターフェース
export interface CreateUserRequest {
  email: string;
  supabase_id: string;
  name: string;
} 