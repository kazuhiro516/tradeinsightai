'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface PracticeTrade {
  id: string;
  symbol: string;
  timeframe: string;
  entryTime: string;
  entryPrice: number;
  exitTime?: string;
  exitPrice?: number;
  volume: number;
  tradeType: string;
  profit?: number;
  status: string;
  memo?: string;
  tags: string[];
  stopLoss?: number;
  takeProfit?: number;
}

interface TradeStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalProfit: number;
  totalLoss: number;
  winRate: number;
  avgProfit: number;
  avgLoss: number;
  profitFactor: number;
}

export default function TradeHistoryPage() {
  const [trades, setTrades] = useState<PracticeTrade[]>([]);
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    symbol: '',
    status: '',
    page: 1,
  });
  const [selectedTrade, setSelectedTrade] = useState<PracticeTrade | null>(null);
  const [editingMemo, setEditingMemo] = useState(false);
  const [memoText, setMemoText] = useState('');

  // トレード履歴の取得
  useEffect(() => {
    fetchTrades();
  }, [filter]);

  const fetchTrades = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.symbol) params.append('symbol', filter.symbol);
      if (filter.status) params.append('status', filter.status);
      params.append('page', filter.page.toString());

      const response = await fetch(`/api/practice-trades?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTrades(data.trades);
        calculateStats(data.trades);
      }
    } catch (error) {
      console.error('トレード履歴の取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  // 統計計算
  const calculateStats = (tradesData: PracticeTrade[]) => {
    const closedTrades = tradesData.filter(t => t.status === 'CLOSED' && t.profit !== null);

    if (closedTrades.length === 0) {
      setStats({
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        totalProfit: 0,
        totalLoss: 0,
        winRate: 0,
        avgProfit: 0,
        avgLoss: 0,
        profitFactor: 0,
      });
      return;
    }

    const winningTrades = closedTrades.filter(t => (t.profit || 0) > 0);
    const losingTrades = closedTrades.filter(t => (t.profit || 0) < 0);

    const totalProfit = winningTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.profit || 0), 0));

    setStats({
      totalTrades: closedTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      totalProfit,
      totalLoss,
      winRate: (winningTrades.length / closedTrades.length) * 100,
      avgProfit: winningTrades.length > 0 ? totalProfit / winningTrades.length : 0,
      avgLoss: losingTrades.length > 0 ? totalLoss / losingTrades.length : 0,
      profitFactor: totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 999 : 0,
    });
  };

  // メモの更新
  const updateMemo = async (tradeId: string, memo: string) => {
    try {
      const response = await fetch(`/api/practice-trades/${tradeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memo }),
      });

      if (response.ok) {
        // ローカル状態を更新
        setTrades(prev =>
          prev.map(t => t.id === tradeId ? { ...t, memo } : t)
        );
        setSelectedTrade(prev => prev ? { ...prev, memo } : null);
        setEditingMemo(false);
      }
    } catch (error) {
      console.error('メモの更新に失敗しました:', error);
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          トレード履歴
        </h1>
        <Button
          onClick={() => window.location.href = '/practice'}
          className="bg-blue-600 hover:bg-blue-700"
        >
          練習モードに戻る
        </Button>
      </div>

      {/* 統計カード */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">総取引数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTrades}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">勝率</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.winRate.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">
                {stats.winningTrades}勝 {stats.losingTrades}敗
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">総損益</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                (stats.totalProfit - stats.totalLoss) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(stats.totalProfit - stats.totalLoss)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">プロフィットファクター</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.profitFactor.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* フィルター */}
      <Card>
        <CardHeader>
          <CardTitle>フィルター</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div>
              <Label>通貨ペア</Label>
              <Select value={filter.symbol} onValueChange={(value) => setFilter(prev => ({ ...prev, symbol: value, page: 1 }))}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="全て" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全て</SelectItem>
                  <SelectItem value="USDJPY">USDJPY</SelectItem>
                  <SelectItem value="EURJPY">EURJPY</SelectItem>
                  <SelectItem value="GBPJPY">GBPJPY</SelectItem>
                  <SelectItem value="EURUSD">EURUSD</SelectItem>
                  <SelectItem value="GBPUSD">GBPUSD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>ステータス</Label>
              <Select value={filter.status} onValueChange={(value) => setFilter(prev => ({ ...prev, status: value, page: 1 }))}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="全て" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全て</SelectItem>
                  <SelectItem value="OPEN">オープン</SelectItem>
                  <SelectItem value="CLOSED">クローズ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* トレード一覧 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>取引履歴</CardTitle>
            </CardHeader>
            <CardContent>
              {trades.length === 0 ? (
                <p className="text-center text-gray-500">取引履歴がありません</p>
              ) : (
                <div className="space-y-3">
                  {trades.map((trade) => (
                    <div
                      key={trade.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedTrade?.id === trade.id ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedTrade(trade)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-3">
                          <Badge variant={trade.tradeType === 'buy' ? 'default' : 'destructive'}>
                            {trade.tradeType === 'buy' ? '買い' : '売り'}
                          </Badge>
                          <Badge variant="outline">
                            {trade.status === 'OPEN' ? 'オープン' : 'クローズ'}
                          </Badge>
                          <span className="font-medium">{trade.symbol}</span>
                        </div>

                        {trade.profit !== null && trade.profit !== undefined && (
                          <span className={`font-semibold ${
                            trade.profit >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(trade.profit)}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 text-sm text-gray-600 grid grid-cols-2 gap-2">
                        <div>エントリー: {trade.entryPrice.toFixed(5)}</div>
                        <div>ロット: {trade.volume}</div>
                        <div>開始: {formatDateTime(trade.entryTime)}</div>
                        {trade.exitTime && (
                          <div>終了: {formatDateTime(trade.exitTime)}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 詳細表示 */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>取引詳細</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedTrade ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">通貨ペア・時間足</Label>
                    <p>{selectedTrade.symbol} - {selectedTrade.timeframe}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">エントリー価格</Label>
                      <p>{selectedTrade.entryPrice.toFixed(5)}</p>
                    </div>
                    {selectedTrade.exitPrice && (
                      <div>
                        <Label className="text-sm font-medium">エグジット価格</Label>
                        <p>{selectedTrade.exitPrice.toFixed(5)}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-medium">ロット数</Label>
                    <p>{selectedTrade.volume}</p>
                  </div>

                  {selectedTrade.stopLoss && (
                    <div>
                      <Label className="text-sm font-medium">ストップロス</Label>
                      <p>{selectedTrade.stopLoss.toFixed(5)}</p>
                    </div>
                  )}

                  {selectedTrade.takeProfit && (
                    <div>
                      <Label className="text-sm font-medium">テイクプロフィット</Label>
                      <p>{selectedTrade.takeProfit.toFixed(5)}</p>
                    </div>
                  )}

                  <div>
                    <Label className="text-sm font-medium">メモ</Label>
                    {editingMemo ? (
                      <div className="space-y-2">
                        <Textarea
                          value={memoText}
                          onChange={(e) => setMemoText(e.target.value)}
                          rows={3}
                        />
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => updateMemo(selectedTrade.id, memoText)}
                          >
                            保存
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingMemo(false);
                              setMemoText(selectedTrade.memo || '');
                            }}
                          >
                            キャンセル
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="mb-2">{selectedTrade.memo || 'メモなし'}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingMemo(true);
                            setMemoText(selectedTrade.memo || '');
                          }}
                        >
                          編集
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center">取引を選択してください</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
