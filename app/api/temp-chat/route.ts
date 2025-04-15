import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { SYSTEM_PROMPT, fetchTradeRecords } from '@/utils/openai';
import { parseTradeFilter } from '@/utils/parser';

//クエストの型定義
interface ChatRequest {
  messages: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    name?: string;
    parts?: Record<string, unknown>[];
  }[];
  model?: string;
}

export async function POST(req: Request): Promise<Response> {
  try {
    // セッション情報を取得
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return new Response(JSON.stringify({
        error: '認証が必要です。ログインしてください。',
        details: 'セッションが見つかりません。'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body: ChatRequest = await req.json();

    // ai-sdk形式のシンプルなメッセージ形式に変換
    const messages = body.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const result = await streamText({
      model: openai('gpt-3.5-turbo'),
      system: SYSTEM_PROMPT,
      messages,
      tools: {
        trade_records: tool({
          description: '取引記録をフィルター条件に基づいて取得する',
          parameters: z.object({
            filter: z.string().describe('JSONフォーマットのフィルター条件（例: {"types": ["buy"], "items": ["usdjpy","eurusd","gbpusd"], "startDate": "2025-01-01", "endDate": "2025-03-09", "page": 1, "pageSize": 10, }）'),
          }),
          execute: async ({ filter }) => {
            try {
              // フィルターをパースして検証
              const filterObj = parseTradeFilter(filter);
              if ('error' in filterObj) {
                return filterObj;
              }

              // 取引記録をバックエンドから取得
              const response = await fetchTradeRecords(filterObj, session.access_token);
              
              // 認証エラーの場合、ユーザーにログインを促すメッセージを返す
              if (response.error === '認証が必要です。ログインしてください。') {
                return {
                  records: [],
                  total: 0,
                  page: 1,
                  pageSize: 10,
                  error: '認証が必要です。ログインしてください。',
                  details: '取引記録を表示するにはログインが必要です。ログインページに移動して認証を行ってください。'
                };
              }
              
              return response;
            } catch (error) {
              console.error('バックエンドからの取引記録取得に失敗:', error);
              return {
                error: '内部サーバーエラー',
                details: error instanceof Error ? error.message : String(error)
              };
            }
          },
        }),
      },
      maxSteps: 2,
    });

    // AI-SDKのtoDataStreamResponseを使用して、ツール呼び出し情報も含めた完全なレスポンスを返す
    return result.toDataStreamResponse();
  } catch (error) {
    console.error('チャットAPIエラー:', error);
    return new Response(JSON.stringify({
      error: 'チャットの処理中にエラーが発生しました',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
