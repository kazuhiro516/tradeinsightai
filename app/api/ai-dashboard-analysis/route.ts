import { NextResponse } from 'next/server'
import { analyzeDashboardDataWithAI } from '@/utils/openai'

export async function POST(request: Request) {
  try {
    const { dashboardData, systemPrompt } = await request.json()
    if (!dashboardData || !systemPrompt) {
      return NextResponse.json({ error: 'dashboardDataとsystemPromptは必須です' }, { status: 400 })
    }
    const aiComment = await analyzeDashboardDataWithAI(dashboardData, systemPrompt)
    return NextResponse.json({ aiComment })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
