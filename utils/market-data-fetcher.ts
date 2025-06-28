import { Time } from 'lightweight-charts';

export interface MarketDataPoint {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// 通貨ペア別の適切な価格帯設定
const CURRENCY_PAIR_CONFIGS = {
  'USDJPY': { basePrice: 150.0, range: { min: 140.0, max: 160.0 } },
  'EURJPY': { basePrice: 160.0, range: { min: 150.0, max: 170.0 } },
  'GBPJPY': { basePrice: 190.0, range: { min: 180.0, max: 200.0 } },
  'EURUSD': { basePrice: 1.08, range: { min: 1.00, max: 1.15 } },
  'GBPUSD': { basePrice: 1.27, range: { min: 1.20, max: 1.35 } },
};

// 改良されたサンプルデータ生成（通貨ペア固有）
export const generateRealisticSampleData = (
  symbol: string,
  timeframe: string,
  count: number = 1000,
  startDate: string = '2024-01-01'
): MarketDataPoint[] => {
  const config = CURRENCY_PAIR_CONFIGS[symbol as keyof typeof CURRENCY_PAIR_CONFIGS];
  if (!config) {
    throw new Error(`Unsupported currency pair: ${symbol}`);
  }

  const data: MarketDataPoint[] = [];
  let currentPrice = config.basePrice;
  const startTime = new Date(startDate).getTime() / 1000;

  // 時間足に応じた間隔設定
  const intervals = {
    '1m': 60,
    '5m': 300,
    '15m': 900,
    '30m': 1800,
    '1h': 3600,
    '4h': 14400,
    '1d': 86400,
  };

  const interval = intervals[timeframe as keyof typeof intervals] || 300;

  for (let i = 0; i < count; i++) {
    const time = (startTime + i * interval) as Time;

    // より現実的なボラティリティ設定
    const volatility = symbol.includes('JPY') ? 0.3 : 0.003;
    const variation = (Math.random() - 0.5) * volatility;

    const open = currentPrice;
    const change = variation;
    const high = Math.max(open, open + change) + Math.random() * volatility * 0.3;
    const low = Math.min(open, open + change) - Math.random() * volatility * 0.3;
    const close = Math.max(config.range.min, Math.min(config.range.max, open + change));

    // 価格の小数点桁数調整
    const decimals = symbol.includes('JPY') ? 3 : 5;

    data.push({
      time,
      open: parseFloat(open.toFixed(decimals)),
      high: parseFloat(high.toFixed(decimals)),
      low: parseFloat(low.toFixed(decimals)),
      close: parseFloat(close.toFixed(decimals)),
      volume: Math.random() * 1000000,
    });

    currentPrice = close;
  }

  return data;
};

// 実際の市場データ取得（Alpha Vantage API使用例）
export const fetchRealMarketData = async (
  symbol: string,
  timeframe: string,
  apiKey: string
): Promise<MarketDataPoint[]> => {
  try {
    // Alpha Vantage APIの例（実際のAPIキーが必要）
    const functionMap = {
      '1m': 'TIME_SERIES_INTRADAY',
      '5m': 'TIME_SERIES_INTRADAY',
      '15m': 'TIME_SERIES_INTRADAY',
      '30m': 'TIME_SERIES_INTRADAY',
      '1h': 'TIME_SERIES_INTRADAY',
      '1d': 'TIME_SERIES_DAILY',
    };

    const interval = ['1m', '5m', '15m', '30m', '1h'].includes(timeframe) ? `&interval=${timeframe}` : '';
    const func = functionMap[timeframe as keyof typeof functionMap] || 'TIME_SERIES_DAILY';

    const url = `https://www.alphavantage.co/query?function=${func}&symbol=${symbol}&apikey=${apiKey}${interval}&outputsize=full`;

    const response = await fetch(url);
    const data = await response.json();

    // データ変換ロジック（Alpha Vantage形式から内部形式へ）
    const timeSeries = data[`Time Series (${timeframe})`] || data['Time Series (Daily)'];

    if (!timeSeries) {
      throw new Error('No time series data found');
    }

    interface AlphaVantageDataPoint {
      '1. open': string;
      '2. high': string;
      '3. low': string;
      '4. close': string;
      '5. volume'?: string;
    }

    const marketData: MarketDataPoint[] = Object.entries(timeSeries as Record<string, AlphaVantageDataPoint>).map(([timestamp, values]) => ({
      time: (new Date(timestamp).getTime() / 1000) as Time,
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['4. close']),
      volume: parseFloat(values['5. volume'] || '0'),
    }));

    return marketData.sort((a, b) => (a.time as number) - (b.time as number));

  } catch (error) {
    console.error('Error fetching real market data:', error);
    // フォールバック：サンプルデータを返す
    return generateRealisticSampleData(symbol, timeframe);
  }
};

// Yahoo Finance（無料API）を使用した市場データ取得
export const fetchYahooFinanceData = async (
  symbol: string,
  period: string = '1y'
): Promise<MarketDataPoint[]> => {
  try {
    // Yahoo Finance APIの例（yfinance-node等のライブラリ使用想定）
    const yahooSymbol = convertToYahooSymbol(symbol);

    // 実際の実装では、yahoo-finance2やsimilarライブラリを使用
    // ここではサンプルデータを返す
    console.log(`Fetching ${yahooSymbol} data for ${period}`);

    return generateRealisticSampleData(symbol, '1d', 365);

  } catch (error) {
    console.error('Error fetching Yahoo Finance data:', error);
    return generateRealisticSampleData(symbol, '1d');
  }
};

// FX用のシンボル変換（Yahoo Finance用）
const convertToYahooSymbol = (symbol: string): string => {
  const symbolMap: { [key: string]: string } = {
    'USDJPY': 'USDJPY=X',
    'EURJPY': 'EURJPY=X',
    'GBPJPY': 'GBPJPY=X',
    'EURUSD': 'EURUSD=X',
    'GBPUSD': 'GBPUSD=X',
  };

  return symbolMap[symbol] || `${symbol}=X`;
};

// CSV形式でのデータエクスポート
export const exportToCSV = (data: MarketDataPoint[], symbol: string): string => {
  const headers = 'timestamp,datetime,symbol,open,high,low,close,volume\n';
  const rows = data.map(item => {
    const datetime = new Date((item.time as number) * 1000).toISOString();
    return `${item.time},${datetime},${symbol},${item.open},${item.high},${item.low},${item.close},${item.volume || 0}`;
  });

  return headers + rows.join('\n');
};

// データベース保存用の形式変換
export const formatForDatabase = (
  data: MarketDataPoint[],
  symbol: string,
  timeframe: string
) => {
  return data.map(item => ({
    symbol,
    timeframe,
    timestamp: BigInt((item.time as number) * 1000), // ミリ秒に変換
    open: item.open,
    high: item.high,
    low: item.low,
    close: item.close,
    volume: item.volume || 0,
  }));
};
