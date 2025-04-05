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
}

// フィルター文字列をJSONオブジェクトにパースする
function parseFilterJson(filterStr: string): TradeFilter | { error: string } {
  try {
    const filterObj = JSON.parse(filterStr);
    return filterObj;
  } catch {
    return { error: "無効なフィルターJSONです" };
  }
}

// バックエンドからフィルター条件に基づいて取引記録を取得する
async function fetchTradeRecords(filterObj: TradeFilter): Promise<TradeRecordsResponse> {
  try {
    // クエリパラメータを構築
    const params = new URLSearchParams();
    Object.entries(filterObj).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(item => params.append(key, String(item)));
        } else {
          params.append(key, String(value));
        }
      }
    });

    // バックエンドのGo APIに接続
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
    const response = await fetch(`${backendUrl}/api/trade-records?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      return {
        records: [],
        total: 0,
        page: 1,
        pageSize: 10,
        error: '取引記録の取得に失敗しました'
      };
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching trade records:', error);
    return {
      records: [],
      total: 0,
      page: 1,
      pageSize: 10,
      error: '内部サーバーエラー'
    };
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const filterParam = searchParams.get('filter');
    
    if (!filterParam) {
      return new Response(JSON.stringify({ error: 'Filter parameter is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const filterObj = parseFilterJson(filterParam);
    if ('error' in filterObj) {
      return new Response(JSON.stringify(filterObj), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const records = await fetchTradeRecords(filterObj);
    return new Response(JSON.stringify(records), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching trade records:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
