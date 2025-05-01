import { OpenAI } from 'openai';
import { TradeFilter } from '@/types/trade';
import { buildTradeFilterParams, builAIParamsdFilter } from '@/utils/tradeFilter';
import { PAGINATION } from '@/constants/pagination';
import { SYSTEM_PROMPT } from './aiPrompt';

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

// OpenAIモデル名を定数として共通化
const OPENAI_MODEL = 'gpt-4.1-nano-2025-04-14';

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

/**
 * ChatMessageのrole使い分けガイド
 *
 * OpenAI function callingやChat APIでは、roleによってメッセージの意味・用途が異なります。
 *
 * - system: チャット全体の前提やルールをAIに伝える。最初に1回だけ送ることが多い。
 *   例: { role: 'system', content: 'あなたはFXトレード履歴の分析を担当するアシスタントです。...' }
 *
 * - user: ユーザー（人間）がAIに投げる質問や指示。
 *   例: { role: 'user', content: '先月のUSDJPYの負けトレードを見せて' }
 *
 * - assistant: AI（ChatGPTなど）がユーザーに返す自然言語の応答。
 *   例: { role: 'assistant', content: '2025年3月のUSDJPYの負けトレードは1件です。...' }
 *
 * - tool: function callingで外部ツール（APIや関数）を呼び出した結果をAIに返すためのメッセージ。
 *   例: { role: 'tool', tool_call_id: 'abc123', content: '{ "records": [...], ... }' }
 *
 * 典型的な流れ:
 *   1. system: AIの前提・ルールをセット
 *   2. user: ユーザーの質問
 *   3. assistant: AIが解析し、必要ならfunction callingを発動
 *   4. tool: ツール呼び出しの実行結果
 *   5. assistant: 結果を自然言語で返答
 *
 * 通常のQAチャットでは system→user→assistant の繰り返し。
 * function callingを使う場合のみ tool が登場します。
 */
export type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
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
    // ステップ1: ユーザーのフィルター条件をJSON文字列として付加
    let filterJson = '';
    if (userFilter && Object.keys(userFilter).length > 0) {
      const filterObj = buildTradeFilterParams(userFilter);
      filterJson = `\n\n[フィルター条件]\n${JSON.stringify(filterObj, null, 2)}`;
    }

    // ステップ2: OpenAIへのメッセージ配列を作成
    const messages: Array<OpenAI.Chat.Completions.ChatCompletionMessageParam> = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage + filterJson }
    ];

    let toolCallResults: TradeRecordsResponse | undefined;

    // ステップ3: OpenAI Function Callingでtrade_records関数を呼び出す
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
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
                  enum: ['buy', 'sell', 'all']
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
            },
            required: [
              'types', 'items', 'startDate', 'endDate', 'profitType'
            ],
            additionalProperties: false
          },
          strict: true
        }
      }] as OpenAI.Chat.Completions.ChatCompletionTool[],
      tool_choice: "auto",
      store: true,
    });

    // ステップ4: function callの結果を処理
    const toolCalls = completion.choices[0].message.tool_calls;
    if (toolCalls) {
      // モデルのfunction callメッセージを追加
      messages.push(completion.choices[0].message);

      for (const toolCall of toolCalls) {
        if (toolCall.function.name === 'trade_records') {
          const params = JSON.parse(toolCall.function.arguments);
          console.log('params', params);
          // buildFilterでAI function calling用パラメータを正規化（items前処理不要）
          const filterParams = builAIParamsdFilter(params);
          const fetchParams: FetchTradeRecordsParams = {
            types: filterParams.types ?? [],
            items: filterParams.items ?? [],
            startDate: filterParams.startDate || '',
            endDate: filterParams.endDate || '',
            page: PAGINATION.DEFAULT_PAGE,
            pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
            sortBy: 'startDate',
            sortOrder: 'desc'
          };
          // ステップ9: サーバーAPIから取引記録を取得
          toolCallResults = await fetchTradeRecords(fetchParams, accessToken);

          // tool ロールに渡す内容を集計済みデータに変更
          const summary = {
            total: toolCallResults.records.length,
            wins: toolCallResults.records.filter(r => r.profit > 0).length,
            losses: toolCallResults.records.filter(r => r.profit <= 0).length,
            winRate: toolCallResults.records.filter(r => r.profit > 0).length / toolCallResults.records.length * 100,
          };
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(summary, null, 2)
          });
        }
      }

      // ステップ5: 結果を含めて再度OpenAIに問い合わせ、最終応答を取得
      const completion2 = await openai.chat.completions.create({
        model: OPENAI_MODEL,
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

    // ステップ11: function callがない場合は最初の応答を返す
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
    // ステップ12: エラーハンドリング
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
    // ステップA: フィルター条件を正規化
    const filterObj = buildTradeFilterParams({
      type: (params.types && params.types.length === 1) ? params.types[0] : undefined,
      items: params.items,
      startDate: new Date(params.startDate),
      endDate: new Date(params.endDate),
      page: params.page,
      pageSize: params.pageSize,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder as 'asc' | 'desc',
    });

    // ステップB: 日付オブジェクトをISO文字列に変換
    const serializedFilter = {
      ...filterObj,
      startDate: (typeof filterObj.startDate === 'object' && filterObj.startDate !== null && (filterObj.startDate as unknown) instanceof Date)
        ? (filterObj.startDate as unknown as Date).toISOString()
        : (typeof filterObj.startDate === 'string' ? filterObj.startDate : ''),
      endDate: (typeof filterObj.endDate === 'object' && filterObj.endDate !== null && (filterObj.endDate as unknown) instanceof Date)
        ? (filterObj.endDate as unknown as Date).toISOString()
        : (typeof filterObj.endDate === 'string' ? filterObj.endDate : ''),
    };

    // ステップC: APIリクエスト用のURLとヘッダーを構築
    const filter = encodeURIComponent(JSON.stringify(serializedFilter));
    const apiUrl = `${BACKEND_URL}/api/trade-records?filter=${filter}`;

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'X-Client-Info': 'trade-insight-ai/1.0.0'
    };

    // ステップD: APIリクエストを送信
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: headers,
      cache: 'no-store',
      credentials: 'include'
    });

    const responseText = await response.text();

    // ステップE: 認証エラーやHTMLレスポンスの処理
    if (response.status === 401 || response.status === 403) {
      return {
        records: [],
        total: 0,
        page: PAGINATION.DEFAULT_PAGE,
        pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
        error: '認証が必要です。ログインしてください。',
        details: '認証セッションが期限切れまたは無効です。ログインページに移動して再認証を行ってください。'
      };
    }

    if (response.headers.get('content-type')?.includes('text/html')) {
      return {
        records: [],
        total: 0,
        page: PAGINATION.DEFAULT_PAGE,
        pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
        error: '認証が必要です。ログインしてください。',
        details: 'ログインページにリダイレクトされました。セッションが期限切れの可能性があります。'
      };
    }

    // ステップF: APIエラー時の処理
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
        page: PAGINATION.DEFAULT_PAGE,
        pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
        error: errorMessage
      };
    }

    // ステップG: 空レスポンス時の処理
    if (!responseText.trim()) {
      return {
        records: [],
        total: 0,
        page: PAGINATION.DEFAULT_PAGE,
        pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
        error: '空のレスポンスを受信しました'
      };
    }

    // ステップH: レスポンスのパース
    try {
      return JSON.parse(responseText) as TradeRecordsResponse;
    } catch (e) {
      return {
        records: [],
        total: 0,
        page: PAGINATION.DEFAULT_PAGE,
        pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
        error: 'レスポンスのパースに失敗しました',
        details: e instanceof Error ? e.message : String(e)
      };
    }
  } catch (error) {
    // ステップI: API呼び出しエラー時の処理
    return {
      records: [],
      total: 0,
      page: PAGINATION.DEFAULT_PAGE,
      pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
      error: 'API呼び出しエラー',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * ダッシュボードデータをAIで分析する関数
 * @param dashboardData ダッシュボードデータ
 * @param systemPrompt システムプロンプト
 * @returns AIによる分析コメント
 */
export async function analyzeDashboardDataWithAI(
  dashboardData: unknown,
  systemPrompt: string
): Promise<string> {
  try {
    // dashboardDataをJSON文字列化（大きすぎる場合は要約も検討）
    const dashboardJson = JSON.stringify(dashboardData, null, 2);
    const userMessage = `以下はFXトレードダッシュボードの集計データです。内容を分析し、重要な特徴や傾向、注意点を日本語で簡潔にまとめてください。\n\n[ダッシュボードデータ]\n${dashboardJson}`;

    const messages: Array<OpenAI.Chat.Completions.ChatCompletionMessageParam> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ];

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages,
      store: true,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    if (!responseText || responseText.trim() === '') {
      return 'AIによる分析コメントの生成に失敗しました。';
    }
    return responseText;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}
