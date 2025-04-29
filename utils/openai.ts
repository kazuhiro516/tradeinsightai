import { OpenAI } from 'openai';
import { TradeFilter } from '@/types/trade';

// 環境変数のバリデーション
const BACKEND_URL = process.env.BACKEND_URL;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (BACKEND_URL === undefined) {
  throw new Error('BACKEND_URL environment variable is not defined');
}

if (OPENAI_API_KEY === undefined) {
  throw new Error('OPENAI_API_KEY environment variable is not defined');
}

// OpenAIクライアントのインスタンス
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// システムプロンプトを定数として定義
export const SYSTEM_PROMPT = `あなたは取引データアナリストアシスタントです。
ユーザーの質問に応じて、取引記録のデータを取得・分析し、適切な回答を提供してください。

重要な指示:
1. 取引データを参照する際は trade_records ツールを使用してデータを取得してください。
2. 直接データを参照せず、必ずツールを介してデータにアクセスしてください。
3. 取引データに関する質問には、必ずツールを使用して実際のデータを取得してから回答してください。
4. ツールを使用せずに取引データについて回答することは禁止されています。

【重要】
- 取引記録の profit（損益）は「円（JPY）」単位で保存されています。AIは損益に関する質問や応答時、必ず「円（JPY）」であることを前提としてください。

【期間指定の解釈ルール】
- 「直近一か月」「過去一か月」などの表現は、必ず「今日から過去1か月分（例：2025/3/26〜2025/4/26）」でフィルターしてください。
- 例：「直近一か月のドル円取引履歴を教えて」→ trade_records ツールを使用し、フィルター: {"items": ["usdjpy"], "startDate": "2025-03-26", "endDate": "2025-04-26"}

取引データには以下のフィルタリング条件を使用できます：
- 日付範囲（startDate, endDate）: 例 "2024-01-01", "2024-12-31"
- 取引タイプ（types）: 例 ["buy", "sell"]
- 取引商品（items）: 例 ["usdjpy", "eurusd"]
- サイズ範囲（sizeMin, sizeMax）: 例 0.1, 10.0
- 損益範囲（profitMin, profitMax）: 例 -100, 500（単位は円）
- 価格範囲（openPriceMin, openPriceMax）: 例 100.0, 150.0
- ページング（page, pageSize）: 例 1, 10
- ソート（sortBy, sortOrder）: 例 "startDate", "desc"

複数の条件を組み合わせて検索できます。例えば：
- 「2024年1月のUSD/JPYの買いポジションを教えて」
  → trade_records ツールを使用し、フィルター: {"types": ["buy"], "items": ["usdjpy"], "startDate": "2024-01-01", "endDate": "2024-01-31"}

- 「損益が100円以上のトレードを表示して」
  → trade_records ツールを使用し、フィルター: {"profitMin": 100}（単位は円）

- 「最近の5件のトレードを見せて」
  → trade_records ツールを使用し、フィルター: {"page": 1, "pageSize": 5, "sortBy": "startDate", "sortOrder": "desc"}

必ず以下の手順で応答を生成してください：
1. ユーザーの質問を分析し、必要なフィルター条件を特定する
2. trade_records ツールを使用してデータを取得する
3. 取得したデータを分析し、ユーザーに分かりやすく説明する

データがない場合や質問に答えられない場合は、その旨を伝えてください。

認証エラーが発生した場合（エラーメッセージに「認証が必要です」が含まれる場合）は、以下のように対応してください：
1. ユーザーに「ログインが必要です」と伝える
2. ログインページに移動するよう促す
3. ログイン後にもう一度質問するよう案内する`;

// 取引記録の型定義
export interface TradeRecord {
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
export interface TradeRecordsResponse {
  records: TradeRecord[];
  total: number;
  page: number;
  pageSize: number;
  error?: string;
  details?: string;
}

// メッセージの型定義
export type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool' | 'function';
  content: string;
  tool_call_id?: string;
  tool_calls?: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[];
};

// リクエストの型定義
export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
}

// レスポンスの型定義を追加
interface AIResponse {
  message: string;
  toolCallResults?: TradeRecordsResponse;
}

/**
 * 取引記録を取得する関数の引数の型定義
 */
interface FetchTradeRecordsParams {
  types: string[];
  items: string[];
  startDate: string;
  endDate: string;
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: string;
}

/**
 * OpenAI APIを使用して応答を生成する
 */
export async function generateAIResponse(
  userMessage: string,
  accessToken: string,
  userFilter?: TradeFilter
): Promise<AIResponse> {
  try {
    // フィルター情報をJSON文字列として追加
    let filterJson = '';
    if (userFilter && Object.keys(userFilter).length > 0) {
      const filterObj = {
        type: userFilter.type,
        item: userFilter.item,
        startDate: userFilter.startDate instanceof Date ? userFilter.startDate.toISOString() : userFilter.startDate,
        endDate: userFilter.endDate instanceof Date ? userFilter.endDate.toISOString() : userFilter.endDate,
        page: userFilter.page,
        pageSize: userFilter.pageSize,
        sortBy: userFilter.sortBy,
        sortOrder: userFilter.sortOrder
      };

      filterJson = `\n\n[フィルター条件]\n${JSON.stringify(filterObj, null, 2)}`;
    }

    const messages: Array<OpenAI.Chat.Completions.ChatCompletionMessageParam> = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage + filterJson }
    ];

    let toolCallResults: TradeRecordsResponse | undefined;

    // OpenAI APIの呼び出し
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-nano-2025-04-14',
      messages,
      tools: [{
        type: "function",
        function: {
          name: 'trade_records',
          description: '取引記録をフィルター条件に基づいて取得する',
          parameters: {
            type: 'object',
            properties: {
              types: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['buy', 'sell']
                }
              },
              items: {
                type: 'array',
                items: {
                  type: 'string'
                }
              },
              startDate: {
                type: 'string',
                description: 'ISO 8601形式の開始日時'
              },
              endDate: {
                type: 'string',
                description: 'ISO 8601形式の終了日時'
              },
              profitType: {
                type: 'string',
                enum: ['win', 'lose', 'all']
              },
              page: {
                type: 'integer'
              },
              pageSize: {
                type: 'integer'
              },
              sortBy: {
                type: 'string',
                enum: ['startDate', 'profit']
              },
              sortOrder: {
                type: 'string',
                enum: ['asc', 'desc']
              }
            },
            required: [
              'types', 'items', 'startDate', 'endDate', 'profitType', 'page', 'pageSize', 'sortBy', 'sortOrder'
            ],
            additionalProperties: false
          },
          strict: true
        }
      }] as OpenAI.Chat.Completions.ChatCompletionTool[],
      tool_choice: "auto",
      store: true,
    });

    // function callの結果を処理
    const toolCalls = completion.choices[0].message.tool_calls;
    if (toolCalls) {
      // モデルのfunction callメッセージを追加
      messages.push(completion.choices[0].message);

      for (const toolCall of toolCalls) {
        if (toolCall.function.name === 'trade_records') {
          const params = JSON.parse(toolCall.function.arguments) as FetchTradeRecordsParams;
          toolCallResults = await fetchTradeRecords(params, accessToken);
          console.log("toolCallResults:", JSON.stringify(toolCallResults, null, 2));

          // 結果をメッセージに追加
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolCallResults, null, 2)
          });
          break;
        }
      }

      // 結果を含めて再度モデルに問い合わせ
      const completion2 = await openai.chat.completions.create({
        model: 'gpt-4.1-nano-2025-04-14',
        messages,
        store: true,
      });

      // 最終的な応答を取得
      const responseText = completion2.choices[0]?.message?.content || '';

      // 空の応答の場合はフォールバックメッセージを設定
      if (!responseText || responseText.trim() === '') {
        return {
          message: 'ご質問ありがとうございます。申し訳ありませんが、現在サーバーが混雑しているか、応答の生成中に問題が発生しました。もう一度お試しください。'
        };
      }

      return {
        message: responseText,
        toolCallResults
      };
    }

    // function callがない場合は最初の応答を返す
    const responseText = completion.choices[0]?.message?.content || '';

    // 空の応答の場合はフォールバックメッセージを設定
    if (!responseText || responseText.trim() === '') {
      return {
        message: 'ご質問ありがとうございます。申し訳ありませんが、現在サーバーが混雑しているか、応答の生成中に問題が発生しました。もう一度お試しください。'
      };
    }

    return {
      message: responseText,
      toolCallResults
    };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 取引記録を取得する関数
 * @param params フィルター条件
 * @param accessToken アクセストークン
 */
async function fetchTradeRecords(params: FetchTradeRecordsParams, accessToken: string): Promise<TradeRecordsResponse> {
  try {
    // フィルターオブジェクトを作成
    const filterObj: TradeFilter = {
      type: params.types[0], // 現在のAPIは単一の type のみサポート
      item: params.items[0], // 現在のAPIは単一の item のみサポート
      startDate: new Date(params.startDate),
      endDate: new Date(params.endDate),
      page: params.page,
      pageSize: params.pageSize,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder as 'asc' | 'desc'
    };

    // 日付オブジェクトをISO文字列に変換
    const serializedFilter = {
      ...filterObj,
      startDate: filterObj.startDate instanceof Date ? filterObj.startDate.toISOString() : filterObj.startDate,
      endDate: filterObj.endDate instanceof Date ? filterObj.endDate.toISOString() : filterObj.endDate,
    };

    const filter = encodeURIComponent(JSON.stringify(serializedFilter));
    const apiUrl = `${BACKEND_URL}/api/trade-records?filter=${filter}`;

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'X-Client-Info': 'trade-insight-ai/1.0.0'
    };

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: headers,
      cache: 'no-store',
      credentials: 'include'
    });

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

    // HTMLレスポンスの処理
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
      } catch (e) {
        // エラーレスポンスのパースに失敗
        console.error('エラーレスポンスのパースに失敗しました', e);
      }

      return {
        records: [],
        total: 0,
        page: 1,
        pageSize: 10,
        error: errorMessage
      };
    }

    if (!responseText.trim()) {
      return {
        records: [],
        total: 0,
        page: 1,
        pageSize: 10,
        error: '空のレスポンスを受信しました'
      };
    }

    try {
      return JSON.parse(responseText) as TradeRecordsResponse;
    } catch (e) {
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
