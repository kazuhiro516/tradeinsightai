import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { ChatRequest, SYSTEM_PROMPT, fetchTradeRecords } from '@/utils/openai';
import { PAGINATION } from '@/constants/pagination';

export async function POST(req: Request): Promise<Response> {
  try {
    // セッション情報を取得
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return new Response(JSON.stringify({
        error: '認証が必要です。ログインしてください。',
        details: 'セッションが見つかりません。'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body: ChatRequest = await req.json();

    const result = await streamText({
      model: openai('gpt-3.5-turbo'),
      system: SYSTEM_PROMPT,
      messages: body.messages,
      tools: {
        trade_records: tool({
          description: '取引記録をフィルター条件に基づいて取得する',
          parameters: z.object({
            types: z.array(z.enum(['buy', 'sell'])).optional(),
            items: z.array(z.string()).optional(),
            startDate: z.string().optional().describe('ISO 8601形式の開始日時'),
            endDate: z.string().optional().describe('ISO 8601形式の終了日時'),
            profitMin: z.number().optional(),
            profitMax: z.number().optional(),
            page: z.number().min(PAGINATION.DEFAULT_PAGE).optional(),
            pageSize: z.number().min(1).max(PAGINATION.DEFAULT_PAGE_SIZE).optional(),
            sortBy: z.enum(['startDate', 'profit']).optional(),
            sortOrder: z.enum(['asc', 'desc']).optional(),
          }),
          execute: async (args) => {
            try {
              // 追加: AIが生成したフィルター条件(JSON)をログ出力
              console.log('[AI Function Calling] 受信フィルター:', args);
              // フィルターをパースして検証
              const filterObj = {
                ...args,
                // 日付をDate型に変換
                startDate: args.startDate ? new Date(args.startDate) : undefined,
                endDate: args.endDate ? new Date(args.endDate) : undefined,
              };
              // 追加: パース後のフィルターオブジェクトをログ出力
              console.log('[AI Function Calling] パース後フィルター:', filterObj);
              return await fetchTradeRecords(filterObj, session.access_token);
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
