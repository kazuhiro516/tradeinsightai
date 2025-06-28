'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, Time, CandlestickSeries, ISeriesApi } from 'lightweight-charts';
import { MarketDataPoint } from '@/utils/market-data-fetcher';

interface TradingChartProps {
  data: MarketDataPoint[];
  symbol: string;
  timeframe: string;
  onTradeAction?: (action: 'buy' | 'sell', price: number, time: Time) => void;
  height?: number;
}

const TradingChart: React.FC<TradingChartProps> = ({
  data,
  symbol,
  timeframe,
  onTradeAction,
  height = 600
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // チャートの初期化
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height,
      layout: {
        background: { color: 'transparent' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#374151' },
        horzLines: { color: '#374151' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#4b5563',
      },
      timeScale: {
        borderColor: '#4b5563',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // ローソク足シリーズの追加
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderDownColor: '#ef4444',
      borderUpColor: '#10b981',
      wickDownColor: '#ef4444',
      wickUpColor: '#10b981',
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    // 初期データの設定
    if (data.length > 0) {
      candlestickSeries.setData(data.slice(0, Math.min(100, data.length)));
      setCurrentPrice(data[Math.min(99, data.length - 1)]?.close || 0);
      setCurrentIndex(Math.min(100, data.length));
    }

    // リサイズ対応
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, height]);

  // チャートの再生/停止機能
  useEffect(() => {
    if (!isPlaying || !candlestickSeriesRef.current || currentIndex >= data.length) {
      return;
    }

    const interval = setInterval(() => {
      if (currentIndex < data.length) {
        const newData = data.slice(0, currentIndex + 1);
        candlestickSeriesRef.current?.setData(newData);
        setCurrentPrice(data[currentIndex]?.close || 0);
        setCurrentIndex(prev => prev + 1);
      } else {
        setIsPlaying(false);
      }
    }, 500); // 0.5秒間隔で更新

    return () => clearInterval(interval);
  }, [isPlaying, currentIndex, data]);

  const handleBuy = () => {
    if (onTradeAction && currentPrice > 0) {
      const currentTime = data[currentIndex - 1]?.time;
      if (currentTime) {
        onTradeAction('buy', currentPrice, currentTime);
      }
    }
  };

  const handleSell = () => {
    if (onTradeAction && currentPrice > 0) {
      const currentTime = data[currentIndex - 1]?.time;
      if (currentTime) {
        onTradeAction('sell', currentPrice, currentTime);
      }
    }
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const resetChart = () => {
    setIsPlaying(false);
    setCurrentIndex(100);
    if (candlestickSeriesRef.current && data.length > 0) {
      candlestickSeriesRef.current.setData(data.slice(0, Math.min(100, data.length)));
      setCurrentPrice(data[Math.min(99, data.length - 1)]?.close || 0);
    }
  };

  return (
    <div className="flex flex-col bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* ヘッダー */}
      <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {symbol} - {timeframe}
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            現在価格: <span className="font-mono text-blue-600 dark:text-blue-400">{currentPrice.toFixed(5)}</span>
          </div>
        </div>

        {/* コントロールボタン */}
        <div className="flex items-center space-x-2">
          <button
            onClick={togglePlayback}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            {isPlaying ? '⏸️ 停止' : '▶️ 再生'}
          </button>
          <button
            onClick={resetChart}
            className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            🔄 リセット
          </button>
        </div>
      </div>

      {/* チャート */}
      <div
        ref={chartContainerRef}
        className="flex-1"
        style={{ height: `${height}px` }}
      />

      {/* トレードボタン */}
      <div className="flex justify-center items-center p-4 space-x-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleBuy}
          disabled={currentPrice === 0}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          📈 買い注文
        </button>
        <button
          onClick={handleSell}
          disabled={currentPrice === 0}
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          📉 売り注文
        </button>
      </div>
    </div>
  );
};

export default TradingChart;
