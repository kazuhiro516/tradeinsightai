'use client'
import { Sun, Moon, Monitor, Save } from 'lucide-react'
import { useTheme } from '@/app/providers/theme-provider'
import { useState, useEffect } from 'react'
import { Button } from '@/app/components/ui/button'
import { Textarea } from '@/app/components/ui/textarea'
import { useToast } from '@/app/components/ui/use-toast'

export default function Settings() {
  const { theme, setTheme, isMounted } = useTheme()
  const [systemPrompt, setSystemPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchUserSettings()
  }, [])

  const fetchUserSettings = async () => {
    try {
      const response = await fetch('/api/ai-model-system-prompt')
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
  }

  const handleSaveSettings = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/ai-model-system-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ systemPrompt }),
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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-lg mx-auto bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md border border-border flex flex-col gap-8">
        <div className="flex items-center gap-2 mb-4">
          <Monitor className="w-6 h-6 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">設定</h1>
        </div>
        {/* テーマ設定 */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sun className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">テーマ設定</h2>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setTheme('light')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-input transition-colors
                ${isMounted
                  ? (theme === 'light'
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600')
                  : 'bg-gray-100 text-gray-800 border-input'}
              `}
              aria-label="ライトモードに切り替え"
            >
              <Sun className="w-4 h-4" /> ライトモード
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-input transition-colors
                ${isMounted
                  ? (theme === 'dark'
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600')
                  : 'bg-gray-100 text-gray-800 border-input'}
              `}
              aria-label="ダークモードに切り替え"
            >
              <Moon className="w-4 h-4" /> ダークモード
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-input transition-colors
                ${isMounted
                  ? (theme === 'system'
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600')
                  : 'bg-gray-100 text-gray-800 border-input'}
              `}
              aria-label="システム設定に従う"
            >
              <Monitor className="w-4 h-4" /> システム設定に従う
            </button>
          </div>
        </div>

        {/* AI分析設定 */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Monitor className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AI分析設定</h2>
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="systemPrompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                システムプロンプト
              </label>
              <Textarea
                id="systemPrompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="AI分析のためのシステムプロンプトを入力してください"
                className="w-full h-48"
              />
            </div>
            <Button
              onClick={handleSaveSettings}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isLoading ? '保存中...' : '設定を保存'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
