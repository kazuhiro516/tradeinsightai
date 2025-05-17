'use client'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '@/app/providers/theme-provider'

export default function Settings() {
  const { theme, setTheme, isMounted } = useTheme()
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
        <div className="mb-4">
          <p className="text-gray-700 dark:text-gray-300">
            ユーザー情報や各種オプションの設定をここで行えます。
          </p>
        </div>
      </div>
    </div>
  )
}
