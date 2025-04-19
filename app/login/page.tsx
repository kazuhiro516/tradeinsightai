'use client'

import { login, signup } from './actions'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRedirecting, setIsRedirecting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const formData = new FormData()
    formData.append('email', email)
    formData.append('password', password)

    if (isSignup && name) {
      formData.append('name', name)
    }

    try {
      if (isSignup) {
        const result = await signup(formData)
        if (result.error) {
          throw new Error(result.error)
        }
        if (result.success) {
          setIsRedirecting(true)
          router.push('/')
          router.refresh()
        }
      } else {
        const result = await login(formData)
        if (result.error) {
          throw new Error(result.error)
        }
        if (result.success) {
          setIsRedirecting(true)
          router.push('/')
          router.refresh()
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  if (isRedirecting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
        <p className="text-gray-600 dark:text-gray-400">
          {isSignup ? 'アカウント作成完了' : 'ログイン完了'}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          リダイレクト中...
        </p>
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        @keyframes fade-out {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        .fade-out {
          animation: fade-out 0.5s ease-out forwards;
        }
      `}</style>

      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-md">
          {/* エラーメッセージ */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-500 text-red-700 dark:text-red-400 rounded">
              {error}
            </div>
          )}

          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              {isSignup ? '新規アカウント作成' : 'ログイン'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {isSignup
                ? 'アカウントを作成してサービスを利用開始'
                : '既存のアカウントでログイン'}
            </p>
          </div>

          <div className="flex justify-center mb-6">
            <div className="inline-flex rounded-md shadow-sm" role="group">
              <button
                type="button"
                onClick={() => setIsSignup(false)}
                className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                  !isSignup
                    ? 'bg-blue-600 text-white dark:bg-blue-500'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600'
                }`}
              >
                ログイン
              </button>
              <button
                type="button"
                onClick={() => setIsSignup(true)}
                className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                  isSignup
                    ? 'bg-blue-600 text-white dark:bg-blue-500'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600'
                }`}
              >
                新規登録
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">メールアドレス</label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="example@example.com"
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">パスワード</label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            {isSignup && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">ユーザー名</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="表示名を入力"
                  className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 placeholder-gray-400 dark:placeholder-gray-500"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">この名前は他のユーザーに表示されます</p>
              </div>
            )}

            <div className="mt-6">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    {isSignup ? '作成中...' : 'ログイン中...'}
                  </>
                ) : (
                  isSignup ? 'アカウントを作成' : 'ログインする'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
