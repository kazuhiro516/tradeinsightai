// app/page.tsx
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function Home() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  // ログイン済みの場合はダッシュボードにリダイレクト
  if (session) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <header className="container mx-auto px-4 py-6">
        <nav className="flex justify-between items-center">
          <div className="text-2xl font-bold">TradeInsightAI</div>
          <div className="space-x-4">
            <Link href="/login" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors">
              ログイン
            </Link>
            <Link href="/signup" className="px-4 py-2 rounded-lg border border-blue-600 hover:bg-blue-600/10 transition-colors">
              新規登録
            </Link>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-8">
            トレード分析をAIで自動化
          </h1>
          <p className="text-xl text-gray-300 mb-12">
            TradeInsightAIは、あなたのトレード履歴をAIが分析し、<br />
            パフォーマンスの向上に役立つインサイトを提供します。
          </p>
          <div className="space-x-4">
            <Link href="/signup" className="px-8 py-4 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors text-lg font-semibold">
              無料で始める
            </Link>
            <Link href="#features" className="px-8 py-4 rounded-lg border border-blue-600 hover:bg-blue-600/10 transition-colors text-lg font-semibold">
              機能を見る
            </Link>
          </div>
        </div>

        <div id="features" className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-lg bg-gray-800/50">
            <h3 className="text-xl font-semibold mb-4">AI分析</h3>
            <p className="text-gray-300">
              最新のAI技術を使用して、あなたのトレードパターンを分析し、改善点を提案します。
            </p>
          </div>
          <div className="p-6 rounded-lg bg-gray-800/50">
            <h3 className="text-xl font-semibold mb-4">自動レポート</h3>
            <p className="text-gray-300">
              定期的なレポートを自動生成し、パフォーマンスの推移を簡単に把握できます。
            </p>
          </div>
          <div className="p-6 rounded-lg bg-gray-800/50">
            <h3 className="text-xl font-semibold mb-4">カスタマイズ可能</h3>
            <p className="text-gray-300">
              あなたのトレードスタイルに合わせて、分析の設定をカスタマイズできます。
            </p>
          </div>
        </div>
      </main>

      <footer className="container mx-auto px-4 py-12 mt-32 border-t border-gray-800">
        <div className="text-center text-gray-400">
          <p>&copy; 2024 TradeInsightAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
