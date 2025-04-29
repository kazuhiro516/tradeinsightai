import { NextResponse } from 'next/server'
import { analyzeDashboardDataWithAI } from '@/utils/openai'
import crypto from 'crypto'

// メモリキャッシュ（プロセス内）
const aiAnalysisCache = new Map<string, { aiComment: string, timestamp: number }>()
// キャッシュ有効期間（例: 6時間）
const CACHE_TTL_MS = 6 * 60 * 60 * 1000

function getCacheKey(dashboardData: unknown, systemPrompt: string) {
  const raw = JSON.stringify({ dashboardData, systemPrompt })
  return crypto.createHash('sha256').update(raw).digest('hex')
}

export async function POST(request: Request) {
  try {
    const { dashboardData, systemPrompt } = await request.json()
    if (!dashboardData || !systemPrompt) {
      return NextResponse.json({ error: 'dashboardDataとsystemPromptは必須です' }, { status: 400 })
    }
    const cacheKey = getCacheKey(dashboardData, systemPrompt)
    const now = Date.now()
    // キャッシュヒットかつ有効期限内ならキャッシュ返却
    const cached = aiAnalysisCache.get(cacheKey)
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({ aiComment: cached.aiComment, cached: true })
    }
    // キャッシュミス時はAI API実行
    const aiComment = await analyzeDashboardDataWithAI(dashboardData, systemPrompt)
    aiAnalysisCache.set(cacheKey, { aiComment, timestamp: now })
    return NextResponse.json({ aiComment, cached: false })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
