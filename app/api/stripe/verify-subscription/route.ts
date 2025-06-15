import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return new NextResponse('Session ID is required', { status: 400 })
    }

    // セッションの取得
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (!session) {
      return new NextResponse('Session not found', { status: 404 })
    }

    // サブスクリプションの取得
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string)

    if (!subscription || subscription.status !== 'active') {
      return new NextResponse('Subscription is not active', { status: 400 })
    }

    // Supabaseクライアントの作成
    const supabase = await createClient()

    // ユーザーのサブスクリプション状態を更新
    const { error } = await supabase
      .from('users')
      .update({
        subscription_status: 'active',
        subscription_id: subscription.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.metadata?.userId)

    if (error) {
      console.error('Error updating user subscription:', error)
      return new NextResponse('Error updating user subscription', { status: 500 })
    }

    return new NextResponse('Subscription verified successfully', { status: 200 })
  } catch (error) {
    console.error('Error verifying subscription:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
