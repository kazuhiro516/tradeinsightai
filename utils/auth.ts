import { createClient } from '@/utils/supabase/client';

/**
 * 認証状態を確認し、必要に応じてセッションを更新する
 * @returns 認証されているかどうか
 */
export async function checkAuthAndSetSession(): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 現在のユーザーIDを取得する
 * @returns ユーザーIDとSupabase ID
 */
export async function getCurrentUserId(): Promise<{ userId: string | null; supabaseId: string | null }> {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session || !session.user) {
      return { userId: null, supabaseId: null };
    }

    const supabaseId = session.user.id;

    // ユーザーIDを取得
    const response = await fetch(`/api/users?supabaseId=${supabaseId}`);

    if (response.status !== 200) {
      return { userId: null, supabaseId };
    }

    const userData = await response.json();
    return { userId: userData.id, supabaseId };
  } catch (error) {
    return { userId: null, supabaseId: null };
  }
}

/**
 * ユーザーを認証して必要なIDを取得する
 * @returns 認証情報とユーザーID
 */
export async function authenticateUser(): Promise<{
  isAuthenticated: boolean;
  userId: string | null;
  supabaseId: string | null;
  accessToken: string | null;
}> {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session || !session.user) {
      return {
        isAuthenticated: false,
        userId: null,
        supabaseId: null,
        accessToken: null
      };
    }

    const supabaseId = session.user.id;
    const accessToken = session.access_token;

    // ユーザーIDを取得
    const response = await fetch(`/api/users?supabaseId=${supabaseId}`);

    if (response.status !== 200) {
      return {
        isAuthenticated: true,
        userId: null,
        supabaseId,
        accessToken
      };
    }

    const userData = await response.json();
    return {
      isAuthenticated: true,
      userId: userData.id,
      supabaseId,
      accessToken
    };
  } catch (error) {
    return {
      isAuthenticated: false,
      userId: null,
      supabaseId: null,
      accessToken: null
    };
  }
}
