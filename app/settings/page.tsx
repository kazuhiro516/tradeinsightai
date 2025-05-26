'use client'
import { useState, useEffect, useCallback } from 'react'
import Settings from '@/app/components/Settings'
import { useToast } from '@/hooks/use-toast'
import { checkAuthAndSetSession } from '@/utils/auth'
import { createClient } from '@/utils/supabase/client'


export default function SettingsPage() {
  const [systemPrompt, setSystemPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const { toast } = useToast()

  // useCallbackでラップして依存配列に安全に追加
  const fetchUserSettingsCallback = useCallback(async (token: string) => {
    try {
      const response = await fetch('/api/ai-model-system-prompt', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setSystemPrompt(data.systemPrompt || '')
      }
    } catch (error) {
      console.error('設定の取得に失敗しました:', error)
      toast({
        title: 'エラー',
        description: '設定の取得に失敗しました',
        variant: 'destructive',
      })
    }
  }, [toast]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await checkAuthAndSetSession()
        setIsAuthenticated(isAuth)

        if (isAuth) {
          const supabase = createClient()
          const { data: { session } } = await supabase.auth.getSession()

          if (session?.access_token) {
            setAccessToken(session.access_token)
            // 認証成功後に設定を取得
            await fetchUserSettingsCallback(session.access_token)
          }
        }
      } catch (err) {
        console.error('認証エラー:', err)
        setIsAuthenticated(false)
      }
    }

    checkAuth()
    // fetchUserSettingsCallbackを依存配列に追加
  }, [fetchUserSettingsCallback])

  // fetchUserSettingsは不要なので削除

  const handleSaveSettings = async (prompt: string) => {
    if (!isAuthenticated || !accessToken) {
      toast({
        title: 'エラー',
        description: '認証が必要です。再度ログインしてください。',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/ai-model-system-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ systemPrompt: prompt }),
      })

      if (response.ok) {
        toast({
          title: '成功',
          description: '設定を保存しました',
        })
      } else {
        throw new Error('設定の保存に失敗しました')
      }
    } catch (error) {
      console.error('設定の保存に失敗しました:', error)
      toast({
        title: 'エラー',
        description: '設定の保存に失敗しました',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Settings
      systemPrompt={systemPrompt}
      setSystemPrompt={setSystemPrompt}
      isLoading={isLoading}
      onSave={handleSaveSettings}
    />
  )
}
