import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';

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

            // フィルターのパース
            let filterObj;
            try {
              filterObj = JSON.parse(filter);
              console.log('Parsed filter:', filterObj);
            } catch (error) {
              console.error('Filter parsing error:', error);
              return { error: "無効なフィルターJSONです" };
            }

            try {
              // クエリパラメータを構築
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

              // バックエンドのGo APIに直接接続
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
                const data = JSON.parse(responseText);
                return data;
              } catch (e) {
                console.error('Error parsing success response:', e);
                return { error: 'レスポンスのパースに失敗しました' };
              }
            } catch (error) {
              console.error('API呼び出しエラー:', error);
              return {
                error: 'API呼び出しエラー',
                details: error instanceof Error ? error.message : String(error)
              };
            }
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
