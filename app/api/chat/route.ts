import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';

// フィルターオブジェクトの型定義
interface TradeFilter {
  startDate?: string;
  endDate?: string;
  types?: string[];
  items?: string[];
  page?: number;
  pageSize?: number;
  [key: string]: any;
}

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = await streamText({
    model: openai('gpt-3.5-turbo'),
    messages,
    tools: {
      trade_records: tool({
        description: '取引記録をフィルター条件に基づいて取得する',
        parameters: z.object({
          filter: z.string().describe('JSONフォーマットのフィルター条件（例: {"types": ["BUY"], "startDate": "2025-01-01", "endDate": "2025-03-09", "page": 1, "pageSize": 10}）'),
        }),
        execute: async ({ filter }) => {
          try {
            console.log('Filter received:', filter);

            // フィルターをパースして検証
            const filterObj = parseFilterJson(filter);
            if ('error' in filterObj) {
              return filterObj;
            }

            // 取引記録をバックエンドから取得
            return await fetchTradeRecords(filterObj);
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
}

/**
 * フィルター文字列をJSONオブジェクトにパースする
 */
function parseFilterJson(filterStr: string): TradeFilter | { error: string } {
  try {
    const filterObj = JSON.parse(filterStr);
    console.log('Parsed filter:', filterObj);
    return filterObj;
  } catch (error) {
    console.error('Filter parsing error:', error);
    return { error: "無効なフィルターJSONです" };
  }
}

/**
 * バックエンドからフィルター条件に基づいて取引記録を取得する
 */
async function fetchTradeRecords(filterObj: TradeFilter): Promise<any> {
  try {
    // クエリパラメータを構築
    const params = buildQueryParams(filterObj);

    // バックエンドのGo APIに接続
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
    const apiUrl = `${backendUrl}/api/trade-records?${params.toString()}`;

    console.log('Requesting URL:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    console.log('Response status:', response.status);

    // レスポンスの処理
    return await handleApiResponse(response);
  } catch (error) {
    console.error('API呼び出しエラー:', error);
    return {
      error: 'API呼び出しエラー',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * フィルターオブジェクトからクエリパラメータを構築
 */
function buildQueryParams(filterObj: TradeFilter): URLSearchParams {
  const params = new URLSearchParams();

  // 各フィルター条件をクエリパラメータに変換
  Object.entries(filterObj).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      // 配列の場合は複数のパラメータとして追加
      if (Array.isArray(value)) {
        value.forEach(item => {
          params.append(key, String(item));
        });
      } else {
        params.append(key, String(value));
      }
    }
  });

  return params;
}

/**
 * APIレスポンスを処理してデータまたはエラーを返す
 */
async function handleApiResponse(response: Response): Promise<any> {
  const responseText = await response.text();
  console.log('Response body:', responseText);

  if (!response.ok) {
    let errorMessage = '取引記録の取得に失敗しました';
    try {
      const errorData = JSON.parse(responseText);
      errorMessage = errorData.error || errorMessage;
    } catch (e) {
      console.error('Error parsing error response:', e);
    }
    return { error: errorMessage };
  }

  try {
    return JSON.parse(responseText);
  } catch (e) {
    console.error('Error parsing success response:', e);
    return { error: 'レスポンスのパースに失敗しました' };
  }
}
