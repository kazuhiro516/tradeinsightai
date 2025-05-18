'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/utils/supabase/server'
import { PrismaUserRepository } from '@/app/api/users/database'
import { UserUseCase } from '@/app/api/users/usecase'

// エラーメッセージを日本語に変換
function translateError(error: string): string {
  const errorMessages: { [key: string]: string } = {
    'Invalid login credentials': 'メールアドレスまたはパスワードが正しくありません',
    'Email not confirmed': 'メールアドレスが確認されていません。確認メールをご確認ください',
    'User already registered': 'このメールアドレスは既に登録されています',
    'Password should be at least 6 characters': 'パスワードは6文字以上で入力してください',
    'Email is invalid': '有効なメールアドレスを入力してください',
    'Email rate limit exceeded': 'メール送信の制限回数を超えました。しばらく時間をおいて再度お試しください',
    'Too many requests': 'アクセスが集中しています。しばらく時間をおいて再度お試しください',
  }

  return errorMessages[error] || 'エラーが発生しました。もう一度お試しください'
}

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // 入力値のバリデーション
  if (!email || !password) {
    return { error: 'メールアドレスとパスワードを入力してください' }
  }

  if (password.length < 8) {
    return { error: 'パスワードは8文字以上必要です' }
  }

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return { error: translateError(error.message) }
    }

    revalidatePath('/', 'layout')
    return { success: true }
  } catch (error) {
    console.error('ログインエラー:', error)
    return { error: 'ログイン処理中にエラーが発生しました' }
  }
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { data: authData, error } = await supabase.auth.signUp(data)

  if (error) {
    console.error('サインアップエラー:', error)
    return { error: translateError(error.message) }
  }
  // ユーザーが作成された場合、データベースにもユーザーを作成
  if (authData.user) {
    try {
      const userRepository = new PrismaUserRepository()
      const userUseCase = new UserUseCase(userRepository)

      // 既存のユーザーを確認
      const existingUser = await userRepository.findBySupabaseId(authData.user.id)

      // ユーザーが存在しない場合は作成
      if (!existingUser) {
        // フォームからユーザー名を取得（存在しない場合はメールアドレスから生成）
        const userName = formData.get('name') as string || authData.user.email?.split('@')[0] || 'ユーザー'
        const result = await userUseCase.createUser({
          supabaseId: authData.user.id,
          name: userName
        })

        if (!result) {
          return { error: 'ユーザー作成に失敗しました' }
        } else if ('error' in result) {
          return { error: result.error }
        }
      }
    } catch (error) {
      console.error('ユーザー作成処理エラー:', error)
      return { error: 'ユーザー作成中にエラーが発生しました' }
    }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function signOut() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    redirect('/error')
  }

  revalidatePath('/', 'layout')
  redirect('/')
}
