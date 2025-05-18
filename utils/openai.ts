import { OpenAI } from 'openai';
import { builAIParamsdFilter } from '@/utils/tradeFilter';
import { PAGINATION } from '@/constants/pagination';
import { SYSTEM_PROMPT } from './aiPrompt';
import { detectMarketZoneJST, toJSTDate } from '@/utils/date';

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
export const OPENAI_MODEL = 'gpt-4.1-nano-2025-04-14';

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
): Promise<AIResponse> {
  try {

    // ステップ2: OpenAIへのメッセージ配列を作成
    const messages: Array<OpenAI.Chat.Completions.ChatCompletionMessageParam> = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage }
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
          description: '取引記録を期間で取得する',
          parameters: {
            type: 'object',
            properties: {
              startDate: {
                type: 'string',
                description: '開始日（YYYY-MM-DD形式）'
              },
              endDate: {
                type: 'string',
                description: '終了日（YYYY-MM-DD形式）'
              },
            },
            required: [
              'startDate', 'endDate'
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
          // buildFilterでAI function calling用パラメータを正規化
          const filterParams = builAIParamsdFilter(params);
          const fetchParams: FetchTradeRecordsParams = {
            startDate: filterParams.startDate instanceof Date ? filterParams.startDate.toISOString() : filterParams.startDate || '',
            endDate: filterParams.endDate instanceof Date ? filterParams.endDate.toISOString() : filterParams.endDate || '',
            page: PAGINATION.DEFAULT_PAGE,
            pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
            sortBy: 'startDate',
            sortOrder: 'desc'
          };
          // ステップ9: サーバーAPIから取引記録を取得
          toolCallResults = await fetchTradeRecords(fetchParams, accessToken);

          // tool ロールに渡す内容を集計済みデータに変更
          const records = toolCallResults.records;
          const total = records.length;
          const wins = records.filter(r => r.profit > 0);
          const losses = records.filter(r => r.profit <= 0);

          const winCount = wins.length;
          const lossCount = losses.length;
          const winRate = total > 0 ? (winCount / total) * 100 : 0;

          const totalWinProfit = wins.reduce((sum, r) => sum + r.profit, 0);
          const totalLossProfit = losses.reduce((sum, r) => sum + r.profit, 0);
          const avgWinProfit = winCount > 0 ? totalWinProfit / winCount : 0;
          const avgLossProfit = lossCount > 0 ? totalLossProfit / lossCount : 0;

          const maxProfit = total > 0 ? Math.max(...records.map(r => r.profit)) : 0;
          const maxLoss = total > 0 ? Math.min(...records.map(r => r.profit)) : 0;

          const profitFactor = Math.abs(totalLossProfit) > 0 ? totalWinProfit / Math.abs(totalLossProfit) : null;
          const avgHoldTimeMs = total > 0
            ? records.reduce((sum, r) => sum + (new Date(r.endDate).getTime() - new Date(r.startDate).getTime()), 0) / total
            : 0;
          const avgHoldTimeMinutes = avgHoldTimeMs / (1000 * 60);

          const avgLotSize = total > 0 ? records.reduce((sum, r) => sum + r.size, 0) / total : 0;
          const maxLotSize = total > 0 ? Math.max(...records.map(r => r.size)) : 0;
          const minLotSize = total > 0 ? Math.min(...records.map(r => r.size)) : 0;

          // 通貨ペア別集計
          const pairStats: Record<string, {
            total: number;
            wins: number;
            losses: number;
            winRate: number;
            avgProfit: number;
          }> = {};
          records.forEach(r => {
            if (!pairStats[r.item]) {
              pairStats[r.item] = {
                total: 0,
                wins: 0,
                losses: 0,
                winRate: 0,
                avgProfit: 0
              };
            }
            pairStats[r.item].total += 1;
            if (r.profit > 0) {
              pairStats[r.item].wins += 1;
            } else {
              pairStats[r.item].losses += 1;
            }
            pairStats[r.item].avgProfit += r.profit;
          });
          Object.keys(pairStats).forEach(pair => {
            const p = pairStats[pair];
            p.winRate = p.total > 0 ? (p.wins / p.total) * 100 : 0;
            p.winRate = Number(p.winRate.toFixed(2));
            p.avgProfit = p.total > 0 ? p.avgProfit / p.total : 0;
            p.avgProfit = Number(p.avgProfit.toFixed(2));
          });

          // 曜日別集計
          const weekdayStats: Record<string, {
            total: number;
            wins: number;
            losses: number;
            winRate: number;
            avgProfit: number;
          }> = {};
          records.forEach(r => {
            const jstDate = toJSTDate(r.startDate) ?? new Date(r.startDate);
            const weekday = jstDate.toLocaleDateString('ja-JP', { weekday: 'long' });
            if (!weekdayStats[weekday]) {
              weekdayStats[weekday] = {
                total: 0,
                wins: 0,
                losses: 0,
                winRate: 0,
                avgProfit: 0
              };
            }
            weekdayStats[weekday].total += 1;
            if (r.profit > 0) {
              weekdayStats[weekday].wins += 1;
            } else {
              weekdayStats[weekday].losses += 1;
            }
            weekdayStats[weekday].avgProfit += r.profit;
          });
          Object.keys(weekdayStats).forEach(weekday => {
            const w = weekdayStats[weekday];
            w.winRate = w.total > 0 ? (w.wins / w.total) * 100 : 0;
            w.winRate = Number(w.winRate.toFixed(2));
            w.avgProfit = w.total > 0 ? w.avgProfit / w.total : 0;
            w.avgProfit = Number(w.avgProfit.toFixed(2));
          });

          // 市場時間帯別集計
          const sessionStats = {
            Tokyo: { total: 0, wins: 0, losses: 0, winRate: 0, avgProfit: 0 },
            London: { total: 0, wins: 0, losses: 0, winRate: 0, avgProfit: 0 },
            NewYork: { total: 0, wins: 0, losses: 0, winRate: 0, avgProfit: 0 },
          };
          records.forEach(r => {
            const jstDate = toJSTDate(r.startDate) ?? new Date(r.startDate);
            const zone = detectMarketZoneJST(jstDate);
            let sessionName: 'Tokyo' | 'London' | 'NewYork' | null = null;
            if (zone === 'tokyo') sessionName = 'Tokyo';
            if (zone === 'london') sessionName = 'London';
            if (zone === 'newyork') sessionName = 'NewYork';
            if (sessionName) {
              const stats = sessionStats[sessionName];
              stats.total += 1;
              if (r.profit > 0) {
                stats.wins += 1;
              } else {
                stats.losses += 1;
              }
              stats.avgProfit += r.profit;
            }
          });
          Object.keys(sessionStats).forEach(session => {
            const stats = sessionStats[session as keyof typeof sessionStats];
            if (stats.total > 0) {
              stats.winRate = Number(((stats.wins / stats.total) * 100).toFixed(2));
              stats.avgProfit = Number((stats.avgProfit / stats.total).toFixed(2));
            }
          });

          const summary = {
            total,
            wins: winCount,
            losses: lossCount,
            winRate: winRate.toFixed(2),
            avgWinProfit: avgWinProfit.toFixed(2),
            avgLossProfit: avgLossProfit.toFixed(2),
            maxProfit: maxProfit.toFixed(2),
            maxLoss: maxLoss.toFixed(2),
            profitFactor: profitFactor !== null ? profitFactor.toFixed(2) : 'N/A',
            avgHoldTimeMinutes: avgHoldTimeMinutes.toFixed(2),
            avgLotSize: avgLotSize.toFixed(2),
            maxLotSize: maxLotSize.toFixed(2),
            minLotSize: minLotSize.toFixed(2),
            pairStats,
            weekdayStats,
            sessionStats,
          };

          console.log(summary);

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
    const filterObj = {
      startDate: new Date(params.startDate),
      endDate: new Date(params.endDate),
      page: params.page,
      pageSize: params.pageSize,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder as 'asc' | 'desc',
    };

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
