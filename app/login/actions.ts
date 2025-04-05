'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/utils/supabase/server'
import { PrismaUserRepository } from '@/app/api/users/database'
import { UserUseCase } from '@/app/api/users/usecase'

export async function login(formData: FormData) {
  const supabase = await createClient()

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect('/error')
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  console.log('サインアップ処理開始:', data.email)

  const { data: authData, error } = await supabase.auth.signUp(data)

  if (error) {
    console.error('サインアップエラー:', error)
    redirect('/error')
  }

  console.log('認証成功:', authData.user?.id)

  // ユーザーが作成された場合、データベースにもユーザーを作成
  if (authData.user) {
    try {
      const userRepository = new PrismaUserRepository()
      const userUseCase = new UserUseCase(userRepository)
      
      // 既存のユーザーを確認
      const existingUser = await userRepository.findBySupabaseId(authData.user.id)
      console.log('既存ユーザー確認:', existingUser ? '存在します' : '存在しません')
      
      // ユーザーが存在しない場合は作成
      if (!existingUser) {
        // フォームからユーザー名を取得（存在しない場合はメールアドレスから生成）
        const userName = formData.get('name') as string || authData.user.email?.split('@')[0] || 'ユーザー'
        
        console.log('ユーザー作成開始:', { supabaseId: authData.user.id, name: userName })
        
        const result = await userUseCase.createUser({
          supabaseId: authData.user.id,
          name: userName
        })
        
        if ('error' in result) {
          console.error('ユーザー作成エラー:', result.error, result.details)
        } else {
          console.log('ユーザー作成成功:', result.id)
        }
      }
    } catch (error) {
      console.error('ユーザー作成処理エラー:', error)
      // エラーが発生してもサインアッププロセスは続行
    }
  }

  revalidatePath('/', 'layout')
  redirect('/')
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
