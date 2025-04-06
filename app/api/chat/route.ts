import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';

// フィルターオブジェクトの型定義
interface TradeFilter {
  startDate?: string;
  endDate?: string;
  types?: string[];
  items?: string[];
  page?: number;
  pageSize?: number;
  ticketIds?: number[];
  sizeMin?: number;
  sizeMax?: number;
  profitMin?: number;
  profitMax?: number;
  openPriceMin?: number;
  openPriceMax?: number;
  sortBy?: string;
  sortOrder?: string;
  [key: string]: unknown;
}

// システムプロンプトを定数として定義
const SYSTEM_PROMPT = `あなたは取引データアナリストアシスタントです。
ユーザーの質問に応じて、取引記録のデータを取得・分析し、適切な回答を提供してください。

取引データには以下のフィルタリング条件を使用できます：
- チケット番号（ticketIds）: 例 [1001, 1002]
- 日付範囲（startDate, endDate）: 例 "2025-01-01", "2025-03-09"
- 取引タイプ（types）: 例 ["buy", "sell"]
- 取引商品（items）: 例 ["usdjpy", "eurusd"]
- サイズ範囲（sizeMin, sizeMax）: 例 0.1, 10.0
- 損益範囲（profitMin, profitMax）: 例 -100, 500
- 価格範囲（openPriceMin, openPriceMax）: 例 100.0, 150.0
- ページング（page, pageSize）: 例 1, 10
- ソート（sortBy, sortOrder）: 例 "startDate", "desc"

複数の条件を組み合わせて検索できます。例えば：
- 「2025年1月のUSD/JPYの買いポジションを教えて」
- 「損益が100ドル以上のトレードを表示して」
- 「最近の5件のトレードを見せて」

データがない場合や質問に答えられない場合は、その旨を伝えてください。

認証エラーが発生した場合（エラーメッセージに「認証が必要です」が含まれる場合）は、以下のように対応してください：
1. ユーザーに「ログインが必要です」と伝える
2. ログインページに移動するよう促す
3. ログイン後にもう一度質問するよう案内する`;

// メッセージの型定義
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// リクエストの型定義
interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
}

// 取引記録の型定義
interface TradeRecord {
  id: number;
  ticketId: number;
  type: string;
  item: string;
  size: number;
  openPrice: number;
  closePrice: number;
  profit: number;
  startDate: string;
  endDate: string;
  userId: string;
}

// 取引記録のレスポンス型定義
interface TradeRecordsResponse {
  records: TradeRecord[];
  total: number;
  page: number;
  pageSize: number;
  error?: string;
  details?: string;
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
    const result = await streamText({
      model: openai('gpt-3.5-turbo'),
      system: SYSTEM_PROMPT,
      messages: body.messages,
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

/**
 * フィルター文字列をJSONオブジェクトにパースする
 */
function parseFilterJson(filterStr: string): TradeFilter | { error: string } {
  try {
    const filterObj = JSON.parse(filterStr);
    return filterObj;
  } catch {
    return { error: "無効なフィルターJSONです" };
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