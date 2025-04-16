'use client'
import { useState } from 'react'
import { signOut } from '@/app/login/actions'
import { useTheme } from '@/app/providers/theme-provider'

export default function Settings() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { theme, setTheme } = useTheme()

  const handleSignOut = async () => {
    try {
      setLoading(true)
      await signOut()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログアウトに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 p-8 rounded shadow">
        <h1 className="text-3xl font-bold mb-6 dark:text-white">設定</h1>
        
        {/* テーマ設定 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 dark:text-white">テーマ設定</h2>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setTheme('light')}
              className={`px-4 py-2 rounded ${
                theme === 'light'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
              }`}
            >
              ライトモード
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`px-4 py-2 rounded ${
                theme === 'dark'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
              }`}
            >
              ダークモード
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`px-4 py-2 rounded ${
                theme === 'system'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
              }`}
            >
              システム設定に従う
            </button>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-gray-700 dark:text-gray-300">
            ユーザー情報や各種オプションの設定をここで行えます。
          </p>
        </div>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <button
          onClick={handleSignOut}
          className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          disabled={loading}
        >
          {loading ? 'ログアウト中...' : 'ログアウト'}
        </button>
      </div>
    </div>
  )
}
