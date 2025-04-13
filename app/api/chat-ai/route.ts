import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { openai } from '@ai-sdk/openai';
import { generateText, tool } from 'ai';
import { z } from 'zod';
import { TradeFilter, TradeRecordsResponse, SYSTEM_PROMPT, parseFilterJson } from '@/utils/openai';

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
              // フィルターをパースして検証
              const filterObj = parseFilterJson(filter);
              if ('error' in filterObj) {
                return filterObj;
              }

              // 取引記録をバックエンドから取得
              return await fetchTradeRecords(filterObj, accessToken!);
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

    // ツール呼び出し情報を取得
    const hasToolCalls = (result.toolCalls?.length || 0) > 0;

    // 空の応答の場合はフォールバックメッセージを設定
    if (!responseText || responseText.trim() === '') {
      // ツール呼び出しがあった場合は、そのことを伝えるメッセージを含める
      const fallback = hasToolCalls
        ? '取引データを検索しましたが、適切な回答を生成できませんでした。もう一度お試しください。'
        : 'ご質問ありがとうございます。申し訳ありませんが、現在サーバーが混雑しているか、応答の生成中に問題が発生しました。もう一度お試しください。';

      return NextResponse.json({
        message: fallback,
        hasToolCalls
      });
    }

    return NextResponse.json({
      message: responseText,
      hasToolCalls
    });
  } catch (error) {
    console.error('チャットルームの作成中にエラーが発生しました:', error);
    return NextResponse.json({ error: 'チャットルームの作成に失敗しました' }, { status: 500 });
  }
}

/**
 * バックエンドからフィルター条件に基づいて取引記録を取得する
 */
async function fetchTradeRecords(filterObj: TradeFilter, accessToken: string): Promise<TradeRecordsResponse> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
    const filter = encodeURIComponent(JSON.stringify(filterObj));
    const apiUrl = `${backendUrl}/api/trade-records?filter=${filter}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      cache: 'no-store'
    });

    // レスポンステキストを取得
    const responseText = await response.text();

    // 認証エラーの処理
    if (response.status === 401 || response.status === 403) {
      return {
        records: [],
        total: 0,
        page: 1,
        pageSize: 10,
        error: '認証が必要です。ログインしてください。',
        details: '認証セッションが期限切れまたは無効です。ログインページに移動して再認証を行ってください。'
      };
    }

    // HTMLレスポンスの処理（ログインページへのリダイレクト）
    if (response.headers.get('content-type')?.includes('text/html')) {
      return {
        records: [],
        total: 0,
        page: 1,
        pageSize: 10,
        error: '認証が必要です。ログインしてください。',
        details: 'ログインページにリダイレクトされました。セッションが期限切れの可能性があります。'
      };
    }

    if (!response.ok) {
      let errorMessage = '取引記録の取得に失敗しました';
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.error || errorMessage;
      } catch {
        // パースエラーは無視
      }
      return {
        records: [],
        total: 0,
        page: 1,
        pageSize: 10,
        error: errorMessage,
        details: `Status: ${response.status}`
      };
    }

    try {
      if (!responseText.trim()) {
        return {
          records: [],
          total: 0,
          page: 1,
          pageSize: 10,
          error: '空のレスポンスを受信しました'
        };
      }

      const data = JSON.parse(responseText);
      return data;
    } catch (e) {
      console.error('メッセージの送信中にエラーが発生しました:', e);
      return {
        records: [],
        total: 0,
        page: 1,
        pageSize: 10,
        error: 'メッセージの送信に失敗しました',
        details: e instanceof Error ? e.message : String(e)
      };
    }
  } catch (error) {
    return {
      records: [],
      total: 0,
      page: 1,
      pageSize: 10,
      error: 'API呼び出しエラー',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}
