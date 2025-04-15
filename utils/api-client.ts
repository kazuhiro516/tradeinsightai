import { TradeFilter, TradeRecordsResponse } from '@/types/trade';

// 環境変数のバリデーション
const BACKEND_URL = process.env.BACKEND_URL;
if (BACKEND_URL === undefined) {
  throw new Error('BACKEND_URL environment variable is not defined');
}

// URLの正規化を行う関数
export function normalizeUrl(baseUrl: string, path: string): string {
  return `${baseUrl}/${path.replace(/^\/+/, '')}`;
}

// APIレスポンスの型
interface APIErrorResponse {
  error: string;
  details?: string;
}

// APIクライアントクラス
export class APIClient {
  private readonly baseUrl: string;
  private readonly accessToken: string;

  constructor(accessToken: string, baseUrl: string = BACKEND_URL as string) {
    this.baseUrl = baseUrl;
    this.accessToken = accessToken;
  }

  private createHeaders(): Headers {
    return new Headers({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${this.accessToken}`,
      'X-Client-Info': 'trade-insight-ai/1.0.0'
    });
  }

  private handleAuthError(response: Response, apiUrl: string): TradeRecordsResponse {
    console.error('認証エラーが発生しました:', {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
      url: apiUrl,
      timestamp: new Date().toISOString(),
      errorType: response.status === 401 ? 'Unauthorized' : 'Forbidden'
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

  private handleHTMLResponse(response: Response, apiUrl: string): TradeRecordsResponse {
    console.error('HTMLレスポンスを受信:', {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
      url: apiUrl,
      timestamp: new Date().toISOString(),
      errorType: 'HTMLRedirect'
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

  private createErrorResponse(message: string, details?: string): TradeRecordsResponse {
    return {
      records: [],
      total: 0,
      page: 1,
      pageSize: 10,
      error: message,
      details
    };
  }

  async fetchTradeRecords(filterObj: TradeFilter): Promise<TradeRecordsResponse> {
    try {
      const filter = encodeURIComponent(JSON.stringify(filterObj));
      const apiUrl = normalizeUrl(this.baseUrl, 'api/trade-records');
      const fullUrl = `${apiUrl}?filter=${filter}`;

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: this.createHeaders(),
        cache: 'no-store',
        credentials: 'include'
      });

      const responseText = await response.text();

      // 認証エラーの処理
      if (response.status === 401 || response.status === 403) {
        return this.handleAuthError(response, fullUrl);
      }

      // HTMLレスポンスの処理
      if (response.headers.get('content-type')?.includes('text/html')) {
        return this.handleHTMLResponse(response, fullUrl);
      }

      if (!response.ok) {
        let errorMessage = '取引記録の取得に失敗しました';
        try {
          const errorData = JSON.parse(responseText) as APIErrorResponse;
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          console.error('エラーレスポンスのパースに失敗:', e);
        }
        return this.createErrorResponse(errorMessage);
      }

      if (!responseText.trim()) {
        return this.createErrorResponse('空のレスポンスを受信しました');
      }

      try {
        return JSON.parse(responseText) as TradeRecordsResponse;
      } catch (e) {
        console.error('レスポンスのパースに失敗:', e);
        return this.createErrorResponse(
          'レスポンスのパースに失敗しました',
          e instanceof Error ? e.message : String(e)
        );
      }
    } catch (error) {
      console.error('API呼び出しエラー:', error);
      return this.createErrorResponse(
        'API呼び出しエラー',
        error instanceof Error ? error.message : String(error)
      );
    }
  }
} 