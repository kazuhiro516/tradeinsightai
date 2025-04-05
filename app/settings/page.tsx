'use client'
import { useState } from 'react'
import { signOut } from '@/app/login/actions'

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded shadow">
        <h1 className="text-3xl font-bold mb-6">設定</h1>
        {/* ここにその他の設定項目を追加できます */}
        <div className="mb-4">
          <p className="text-gray-700">
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
