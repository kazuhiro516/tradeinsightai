'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function SubscriptionSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    const verifySubscription = async () => {
      try {
        // セッションIDを使用してサブスクリプションの状態を確認
        const response = await fetch(`/api/stripe/verify-subscription?session_id=${sessionId}`)

        if (response.ok) {
          // サブスクリプションが有効な場合はダッシュボードに遷移
          router.push('/dashboard')
        } else {
          // エラーの場合はエラーページに遷移
          router.push('/subscription/error')
        }
      } catch (error) {
        console.error('サブスクリプションの確認中にエラーが発生しました:', error)
        router.push('/subscription/error')
      }
    }

    if (sessionId) {
      verifySubscription()
    } else {
      router.push('/subscription/error')
    }
  }, [sessionId, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">サブスクリプションを確認中...</h1>
        <p className="text-gray-400">しばらくお待ちください</p>
      </div>
    </div>
  )
}
