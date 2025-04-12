import { NextResponse } from 'next/server';
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

export async function POST(req: Request): Promise<Response> {
  try {
    // セッション情報を取得
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({
        error: '認証が必要です。ログインしてください。',
        details: 'セッションが見つかりません。'
      }, { status: 401 });
    }

    const body: ChatAIRequest = await req.json();
    
    // 必須パラメータの検証
    if (!body.message) {
      return NextResponse.json({
        error: 'メッセージが必要です',
        details: 'message フィールドが空です'
      }, { status: 400 });
    }

    // アクセストークンを取得
    const accessToken = body.accessToken || session.access_token;
    
    if (!accessToken) {
      return NextResponse.json({
        error: 'アクセストークンが見つかりません',
        details: 'セッションにアクセストークンがありません'
      }, { status: 401 });
    }

    console.log('OpenAI呼び出し開始:', body.message.substring(0, 50) + (body.message.length > 50 ? '...' : ''));

    // streamTextではなくgenerateTextを使用して完全な応答を一度に取得（ストリーミングなし）
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
              console.log('ツール呼び出し - trade_records:', filter);
              // フィルターをパースして検証
              const filterObj = parseFilterJson(filter);
              if ('error' in filterObj) {
                console.error('フィルターパースエラー:', filterObj.error);
                return filterObj;
              }

              // 取引記録をバックエンドから取得
              const response = await fetchTradeRecords(filterObj, accessToken);
              
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
              
              console.log('取引記録取得成功:', { 
                recordCount: response.records?.length || 0,
                total: response.total
              });
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
      maxSteps: 3,
    });

    // レスポンスが空かどうかを確認
    const responseText = result.text || '';
    console.log('OpenAI応答取得:', { 
      length: responseText.length,
      preview: responseText.substring(0, 100) + (responseText.length > 100 ? '...' : ''),
      toolCalls: result.toolCalls?.length || 0
    });
    
    // ツール呼び出し情報を取得
    const toolCalls = result.toolCalls?.map(call => ({
      type: call.type,
      toolName: call.toolName,
      args: call.args
    })) || [];

    // 空の応答の場合はフォールバックメッセージを設定
    if (!responseText || responseText.trim() === '') {
      console.warn('空の応答を検出しました。フォールバックメッセージを使用します。');
      
      // ツール呼び出しがあった場合は、そのことを伝えるメッセージを含める
      const fallback = toolCalls.length > 0 
        ? '取引データを検索しましたが、適切な回答を生成できませんでした。もう一度お試しください。' 
        : 'ご質問ありがとうございます。申し訳ありませんが、現在サーバーが混雑しているか、応答の生成中に問題が発生しました。もう一度お試しください。';
      
      return NextResponse.json({
        message: fallback,
        hasToolCalls: toolCalls.length > 0
      });
    }

    return NextResponse.json({
      message: responseText,
      hasToolCalls: toolCalls.length > 0
    });
  } catch (error) {
    console.error('チャットAPIエラー:', error);
    return NextResponse.json({
      error: 'チャットの処理中にエラーが発生しました',
      details: error instanceof Error ? error.message : String(error)
    }, {
      status: 500
    });
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

    const responseText = await response.text();

    // 認証エラーの処理
    if (response.status === 401 || response.status === 403) {
      console.error('認証エラーが発生しました:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        url: apiUrl,
        timestamp: new Date().toISOString(),
        errorType: response.status === 401 ? 'Unauthorized' : 'Forbidden',
        details: 'セッションが期限切れまたは無効です。ユーザーは再ログインが必要です。'
      });
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
      console.error('HTMLレスポンスを受信（ログインページへのリダイレクト）:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        url: apiUrl,
        timestamp: new Date().toISOString(),
        errorType: 'HTMLRedirect',
        details: 'APIがHTMLレスポンスを返しました。ログインページへのリダイレクトが発生している可能性があります。'
      });
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
      console.error('APIエラー:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        body: responseText.substring(0, 500)
      });

      let errorMessage = '取引記録の取得に失敗しました';
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        console.error('エラーレスポンスのパースに失敗:', e);
        console.error('エラーレスポンスの内容:', responseText.substring(0, 500));
      }
      return {
        records: [],
        total: 0,
        page: 1,
        pageSize: 10,
        error: errorMessage,
        details: `Status: ${response.status}, Content-Type: ${response.headers.get('content-type')}`
      };
    }

    try {
      if (!responseText.trim()) {
        console.error('空のレスポンスを受信');
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
      console.error('レスポンスのパースに失敗:', e);
      console.error('レスポンステキスト（最初の500文字）:', responseText.substring(0, 500));
      return {
        records: [],
        total: 0,
        page: 1,
        pageSize: 10,
        error: 'レスポンスのパースに失敗しました',
        details: e instanceof Error ? e.message : String(e)
      };
    }
  } catch (error) {
    console.error('API呼び出しエラー:', error);
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