import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { openai } from '@ai-sdk/openai';
import { generateText, SYSTEM_PROMPT, tool } from '@/utils/openai';
import { fetchTradeRecords } from '@/utils/openai';
import { TradeFilter } from '@/types/trade';
import { z } from 'zod';

// リクエストの型定義
interface ChatAIRequest {
  message: string;
  accessToken?: string;
}

/**
 * AIチャット応答を生成するAPI
 */
export async function POST(req: NextRequest): Promise<Response> {
  try {
    // リクエストボディのパース
    const body: ChatAIRequest = await req.json();

    // 必須パラメータの検証
    if (!body.message) {
      return NextResponse.json({
        error: 'メッセージが必要です',
        details: 'message フィールドが空です'
      }, { status: 400 });
    }

    // アクセストークンの取得（リクエストからまたはセッションから）
    let accessToken = body.accessToken;

    // リクエストにトークンがない場合はセッションから取得
    if (!accessToken) {
      const supabase = await createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session || !session.access_token) {
        return NextResponse.json({
          error: '認証が必要です',
          details: 'アクセストークンが見つかりません'
        }, { status: 401 });
      }

      accessToken = session.access_token;
    }

    // OpenAIによるテキスト生成
    const result = await generateText({
      model: openai('gpt-3.5-turbo'),
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: body.message }],
      tools: {
        trade_records: tool({
          description: '取引記録をフィルター条件に基づいて取得する',
          parameters: z.object({
            filter: z.string().describe('JSONフォーマットのフィルター条件（例: {"types": ["buy"], "items": ["usdjpy","eurusd","gbpusd"], "startDate": "2025-01-01", "endDate": "2025-03-09", "page": 1, "pageSize": 10, }）'),
          }),
          execute: async ({ filter }) => {
            try {
              const filterObj = JSON.parse(filter) as TradeFilter;
              return await fetchTradeRecords(filterObj, accessToken);
            } catch (error) {
              return {
                error: '内部サーバーエラー',
                details: error instanceof Error ? error.message : String(error)
              };
            }
          },
        }),
      },
      maxSteps: 3,
    });

    // レスポンスが空かどうかを確認
    const responseText = result.text || '';

    // ツール呼び出し情報と結果を取得
    const hasToolCalls = (result.toolCalls?.length || 0) > 0;
    let toolCallResults = null;

    if (hasToolCalls && result.toolCalls[0].toolName === 'trade_records') {
      try {
        const filterJson = result.toolCalls[0].args.filter;
        const filter = JSON.parse(filterJson);

        // フィルターのフィールド名を変換
        const convertedFilter = {
          ...filter,
          // 日付フィールドはそのまま（データベース層で変換）
          startDate: filter.startDate,
          endDate: filter.endDate,
          // ソートフィールドを変換
          sortBy: filter.sortBy === 'startDate' ? 'openTime' : filter.sortBy,
          sortOrder: filter.sortOrder || 'desc',
          // ページネーション
          page: filter.page || 1,
          pageSize: filter.pageSize || 10
        };

        toolCallResults = await fetchTradeRecords(convertedFilter, accessToken);
      } catch (error) {
        console.error('取引データの取得に失敗しました:', error);
      }
    }

    // 空の応答の場合はフォールバックメッセージを設定
    if (!responseText || responseText.trim() === '') {
      // ツール呼び出しがあった場合は、そのことを伝えるメッセージを含める
      const fallback = hasToolCalls
        ? '取引データを検索しましたが、適切な回答を生成できませんでした。もう一度お試しください。'
        : 'ご質問ありがとうございます。申し訳ありませんが、現在サーバーが混雑しているか、応答の生成中に問題が発生しました。もう一度お試しください。';

      return NextResponse.json({
        message: fallback,
        hasToolCalls,
        toolCallResults
      });
    }

    return NextResponse.json({
      message: responseText,
      hasToolCalls,
      toolCallResults
    });
  } catch (error) {
    console.error('チャットルームの作成中にエラーが発生しました:', error);
    return NextResponse.json({ error: 'チャットルームの作成に失敗しました' }, { status: 500 });
  }
}
