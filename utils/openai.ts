import { openai } from '@ai-sdk/openai';
import { generateText as _generateText, tool as _tool } from 'ai';
import { z } from 'zod';
import { TradeFilter } from '@/types/trade';

export const generateText = _generateText;
export const tool = _tool;

// 環境変数のバリデーション
const BACKEND_URL = process.env.BACKEND_URL;
if (BACKEND_URL === undefined) {
  throw new Error('BACKEND_URL environment variable is not defined');
}

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
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

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
 * バックエンドからフィルター条件に基づいて取引記録を取得する
 */
export async function fetchTradeRecords(filterObj: TradeFilter, accessToken: string): Promise<TradeRecordsResponse> {
  try {
    // startDate, endDateをISO8601文字列に変換
    const filterToSend = {
      ...filterObj,
      startDate: filterObj.startDate instanceof Date ? filterObj.startDate.toISOString() : filterObj.startDate,
      endDate: filterObj.endDate instanceof Date ? filterObj.endDate.toISOString() : filterObj.endDate,
    };
    const filter = encodeURIComponent(JSON.stringify(filterToSend));
    const apiUrl = `${BACKEND_URL as string}/api/trade-records?filter=${filter}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Client-Info': 'trade-insight-ai/1.0.0'
      },
      cache: 'no-store',
      credentials: 'include'
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
        errorType: response.status === 401 ? 'Unauthorized' : 'Forbidden'
      });
      return createErrorResponse('認証が必要です。ログインしてください。', '認証セッションが期限切れまたは無効です。ログインページに移動して再認証を行ってください。');
    }

    // HTMLレスポンスの処理
    if (response.headers.get('content-type')?.includes('text/html')) {
      console.error('HTMLレスポンスを受信:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        url: apiUrl,
        timestamp: new Date().toISOString(),
        errorType: 'HTMLRedirect'
      });
      return createErrorResponse('認証が必要です。ログインしてください。', 'ログインページにリダイレクトされました。セッションが期限切れの可能性があります。');
    }

    if (!response.ok) {
      let errorMessage = '取引記録の取得に失敗しました';
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        console.error('エラーレスポンスのパースに失敗:', e);
      }
      return createErrorResponse(errorMessage);
    }

    if (!responseText.trim()) {
      return createErrorResponse('空のレスポンスを受信しました');
    }

    try {
      return JSON.parse(responseText) as TradeRecordsResponse;
    } catch (e) {
      console.error('レスポンスのパースに失敗:', e);
      return createErrorResponse(
        'レスポンスのパースに失敗しました',
        e instanceof Error ? e.message : String(e)
      );
    }
  } catch (error) {
    console.error('API呼び出しエラー:', error);
    return createErrorResponse(
      'API呼び出しエラー',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * エラーレスポンスを作成する
 */
function createErrorResponse(message: string, details?: string): TradeRecordsResponse {
  return {
    records: [],
    total: 0,
    page: 1,
    pageSize: 10,
    error: message,
    details
  };
}

/**
 * OpenAI APIを使用して応答を生成する
 */
export async function generateAIResponse(userMessage: string, accessToken: string): Promise<AIResponse> {
  try {
    console.log('AI応答生成開始:', userMessage.substring(0, 50) + (userMessage.length > 50 ? '...' : ''));

    const messages: ChatMessage[] = [
      { role: 'user', content: userMessage }
    ];

    let toolCallResults: TradeRecordsResponse | undefined;

    // ストリーミングなしでレスポンスを一度に取得
    const result = await generateText({
      model: openai('gpt-4.1-nano-2025-04-14'),
      system: SYSTEM_PROMPT,
      messages: messages,
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
            page: z.number().min(1).optional(),
            pageSize: z.number().min(1).max(100).optional(),
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
              const response = await fetchTradeRecords(filterObj, accessToken);
              toolCallResults = response;
              return response;
            } catch (error) {
              const errorResponse = {
                error: '内部サーバーエラー',
                details: error instanceof Error ? error.message : String(error)
              };
              toolCallResults = errorResponse as TradeRecordsResponse;
              return errorResponse;
            }
          },
        }),
      },
      maxSteps: 3,
    });

    // レスポンステキストを取得
    const responseText = result.text || '';

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
