'use client';

import { useState, useEffect } from 'react';
import TradingChart from '@/components/TradingChart';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Time } from 'lightweight-charts';
import { generateRealisticSampleData, MarketDataPoint } from '@/utils/market-data-fetcher';

interface ActiveTrade {
  id: string;
  symbol: string;
  timeframe: string;
  entryPrice: number;
  entryTime: Time;
  tradeType: 'buy' | 'sell';
  volume: number;
  stopLoss?: number;
  takeProfit?: number;
}

const SYMBOLS = ['USDJPY', 'EURJPY', 'GBPJPY', 'EURUSD', 'GBPUSD'];
const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

export default function PracticePage() {
  const [selectedSymbol, setSelectedSymbol] = useState('USDJPY');
  const [selectedTimeframe, setSelectedTimeframe] = useState('5m');
  const [chartData, setChartData] = useState<MarketDataPoint[]>([]);
  const [activeTrades, setActiveTrades] = useState<ActiveTrade[]>([]);
  const [tradeVolume, setTradeVolume] = useState(0.1);
  const [stopLoss, setStopLoss] = useState<number | undefined>();
  const [takeProfit, setTakeProfit] = useState<number | undefined>();
  const [tradeMemo, setTradeMemo] = useState('');
  const [totalProfit, setTotalProfit] = useState(0);
  const [totalTrades, setTotalTrades] = useState(0);

  console.log('PracticePage rendering, chartData length:', chartData.length);

  // 初期データ読み込み
  useEffect(() => {
    const data = generateRealisticSampleData(selectedSymbol, selectedTimeframe, 1000);
    setChartData(data);
  }, [selectedSymbol, selectedTimeframe]);

  // トレード実行処理
  const handleTradeAction = (action: 'buy' | 'sell', price: number, time: Time) => {
    const newTrade: ActiveTrade = {
      id: Date.now().toString(),
      symbol: selectedSymbol,
      timeframe: selectedTimeframe,
      entryPrice: price,
      entryTime: time,
      tradeType: action,
      volume: tradeVolume,
      stopLoss,
      takeProfit,
    };

    setActiveTrades(prev => [...prev, newTrade]);
    setTotalTrades(prev => prev + 1);
  };

  // ポジション決済
  const closePosition = async (tradeId: string, currentPrice: number) => {
    const trade = activeTrades.find(t => t.id === tradeId);
    if (!trade) return;

    // 損益計算
    const priceChange = currentPrice - trade.entryPrice;
    const profit = trade.tradeType === 'buy' ?
      priceChange * trade.volume * 100000 : // 100,000は標準的なロットサイズ
      -priceChange * trade.volume * 100000;

    // データベースに保存（API呼び出し）
    try {
      await fetch('/api/practice-trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: trade.symbol,
          timeframe: trade.timeframe,
          entryTime: trade.entryTime,
          entryPrice: trade.entryPrice,
          exitTime: Date.now() / 1000,
          exitPrice: currentPrice,
          volume: trade.volume,
          tradeType: trade.tradeType,
          profit,
          memo: tradeMemo,
          tags: [],
          stopLoss: trade.stopLoss,
          takeProfit: trade.takeProfit,
        }),
      });
    } catch (error) {
      console.error('取引の保存に失敗しました:', error);
    }

    // アクティブ取引から削除
    setActiveTrades(prev => prev.filter(t => t.id !== tradeId));
    setTotalProfit(prev => prev + profit);
    setTradeMemo(''); // メモをクリア
  };

  const calculateUnrealizedPnL = (trade: ActiveTrade, currentPrice: number): number => {
    const priceChange = currentPrice - trade.entryPrice;
    return trade.tradeType === 'buy' ?
      priceChange * trade.volume * 100000 :
      -priceChange * trade.volume * 100000;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          FXトレード練習
        </h1>
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="text-lg px-4 py-2">
            総損益: ¥{totalProfit.toLocaleString()}
          </Badge>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            取引回数: {totalTrades}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 左側: チャート */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>チャート表示</CardTitle>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="symbol">通貨ペア:</Label>
                    <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SYMBOLS.map(symbol => (
                          <SelectItem key={symbol} value={symbol}>
                            {symbol}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="timeframe">時間足:</Label>
                    <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEFRAMES.map(tf => (
                          <SelectItem key={tf} value={tf}>
                            {tf}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 && (
                <TradingChart
                  data={chartData}
                  symbol={selectedSymbol}
                  timeframe={selectedTimeframe}
                  onTradeAction={handleTradeAction}
                  height={500}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右側: 取引パネル */}
        <div className="space-y-6">
          {/* 注文設定 */}
          <Card>
            <CardHeader>
              <CardTitle>注文設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="volume">ロット数</Label>
                <Input
                  id="volume"
                  type="number"
                  value={tradeVolume}
                  onChange={(e) => setTradeVolume(parseFloat(e.target.value))}
                  step="0.01"
                  min="0.01"
                  max="10"
                />
              </div>
              <div>
                <Label htmlFor="stopLoss">ストップロス</Label>
                <Input
                  id="stopLoss"
                  type="number"
                  value={stopLoss || ''}
                  onChange={(e) => setStopLoss(e.target.value ? parseFloat(e.target.value) : undefined)}
                  step="0.01"
                  placeholder="オプション"
                />
              </div>
              <div>
                <Label htmlFor="takeProfit">テイクプロフィット</Label>
                <Input
                  id="takeProfit"
                  type="number"
                  value={takeProfit || ''}
                  onChange={(e) => setTakeProfit(e.target.value ? parseFloat(e.target.value) : undefined)}
                  step="0.01"
                  placeholder="オプション"
                />
              </div>
              <div>
                <Label htmlFor="memo">取引メモ</Label>
                <Textarea
                  id="memo"
                  value={tradeMemo}
                  onChange={(e) => setTradeMemo(e.target.value)}
                  placeholder="この取引の理由やメモを記録..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* アクティブポジション */}
          <Card>
            <CardHeader>
              <CardTitle>アクティブポジション ({activeTrades.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {activeTrades.length === 0 ? (
                <p className="text-gray-500 text-center">アクティブなポジションはありません</p>
              ) : (
                <div className="space-y-3">
                  {activeTrades.map((trade) => {
                    const currentPrice = chartData[chartData.length - 1]?.close || 0;
                    const unrealizedPnL = calculateUnrealizedPnL(trade, currentPrice);

                    return (
                      <div
                        key={trade.id}
                        className="border rounded-lg p-3 space-y-2"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <Badge variant={trade.tradeType === 'buy' ? 'default' : 'destructive'}>
                              {trade.tradeType === 'buy' ? '買い' : '売り'}
                            </Badge>
                            <span className="font-medium">{trade.symbol}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => closePosition(trade.id, currentPrice)}
                          >
                            決済
                          </Button>
                        </div>
                        <div className="text-xs text-gray-600 space-y-1">
                          <div>エントリー: {trade.entryPrice.toFixed(5)}</div>
                          <div>現在価格: {currentPrice.toFixed(5)}</div>
                          <div>ロット: {trade.volume}</div>
                          <div className={`font-semibold ${unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            含み損益: ¥{unrealizedPnL.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
