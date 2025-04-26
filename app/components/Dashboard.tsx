'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { useRouter } from 'next/navigation'
import { Filter, Bug } from 'lucide-react'
import { getCurrentUserId } from '@/utils/auth'
import { DashboardData, StatCardProps } from '@/types/dashboard'
import { TradeFilter, TradeRecord } from '@/types/trade'
import FilterModal from '@/app/components/FilterModal'
import { PAGINATION } from '@/constants/pagination'
import {
  convertToUTC,
  formatMonthDay,
  formatYearMonth,
  formatYearMonthJP,
  formatJST
} from '@/utils/date'
import { formatCurrency, formatPercent } from '@/utils/number'
import { TooltipProps } from 'recharts'
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'

// デフォルトフィルターの設定
const DEFAULT_FILTER: TradeFilter = {
  page: PAGINATION.DEFAULT_PAGE,
  pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
  orderBy: 'openTime',
  orderDirection: 'desc'
};

// カスタムペイロードの型定義
interface CustomPayload {
  payload: {
    cumulativeProfit?: number;
    peak?: number;
  };
  value: number;
}

// 統計カードコンポーネント
const StatCard = ({ title, value, unit = '' }: StatCardProps) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
    <p className="text-2xl font-bold mt-2">
      {typeof value === 'number' ?
        (title.includes('Profit Factor') || title.includes('Risk-Reward Ratio') ?
          value.toFixed(2) :
          (unit === '%' ? formatPercent(value) : formatCurrency(value))
        ) : value}
      {unit}
    </p>
  </div>
)

export default function Dashboard() {
  const router = useRouter()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [currentFilter, setCurrentFilter] = useState<TradeFilter>(DEFAULT_FILTER)
  const [userId, setUserId] = useState<string | null>(null)
  const [debugMode, setDebugMode] = useState(false)

  const fetchDashboardData = useCallback(async (userId: string, filter: TradeFilter) => {
    try {
      setLoading(true)
      const queryParams = new URLSearchParams({ userId })

      Object.entries(filter).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key + '[]', v.toString()))
        } else if (value !== null && value !== undefined) {
          if (value instanceof Date) {
            // 日付をUTCに変換してから送信
            const utcDate = convertToUTC(value)
            queryParams.append(key, utcDate.toISOString())
          } else {
            queryParams.append(key, value.toString())
          }
        }
      })

      const response = await fetch('/api/dashboard?' + queryParams.toString())

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'データ取得に失敗しました')
      }

      const data = await response.json()

      setDashboardData(data)
      setError(null)
    } catch (err) {
      console.error('ダッシュボードデータ取得エラー:', err)
      setError('データ取得に失敗しました。再試行してください。')
    } finally {
      setLoading(false)
    }
  }, [])

  // ユーザー認証とIDの取得を一元化
  const checkAuth = useCallback(async () => {
    try {
      const { userId } = await getCurrentUserId()
      if (!userId) {
        router.push('/login')
        return null
      }
      setUserId(userId)
      return userId
    } catch (err) {
      console.error('認証エラー:', err)
      router.push('/login')
      return null
    }
  }, [router])

  useEffect(() => {
    const initializeData = async () => {
      const currentUserId = await checkAuth()
      if (currentUserId) {
        fetchDashboardData(currentUserId, currentFilter)
      }
    }
    initializeData()
  }, [checkAuth, currentFilter, fetchDashboardData])

  const handleFilterApply = async (filter: TradeFilter) => {
    setCurrentFilter(filter)
    if (userId) {
      fetchDashboardData(userId, filter)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={async () => {
            const { userId } = await getCurrentUserId()
            if (userId) {
              fetchDashboardData(userId, currentFilter)
            }
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          再試行
        </button>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>データがありません</p>
      </div>
    )
  }

  const { summary, graphs } = dashboardData

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">トレード分析ダッシュボード</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setDebugMode(!debugMode)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            title="デバッグモード切替"
          >
            <Bug className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={handleFilterApply}
        type="dashboard"
        currentFilter={currentFilter}
      />

      {/* サマリー統計 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
        <StatCard title="総利益 (Gross Profit)" value={summary.grossProfit} unit="円" />
        <StatCard title="総損失 (Gross Loss)" value={summary.grossLoss} unit="円" />
        <StatCard title="純利益 (Net Profit)" value={summary.netProfit} unit="円" />
        <StatCard title="取引回数 (Total Trades)" value={summary.totalTrades} />
        <StatCard title="勝率 (Win Rate)" value={summary.winRate} unit="%" />
        <StatCard title="プロフィットファクター (Profit Factor)" value={summary.profitFactor} />
        <StatCard title="平均利益 (Average Profit)" value={summary.avgProfit} unit="円" />
        <StatCard title="平均損失 (Average Loss)" value={summary.avgLoss} unit="円" />
        <StatCard title="最大利益 (Largest Profit)" value={summary.largestProfit} unit="円" />
        <StatCard title="最大損失 (Largest Loss)" value={summary.largestLoss} unit="円" />
        <StatCard title="最大連勝数 (Max Consecutive Wins)" value={summary.maxWinStreak} />
        <StatCard title="最大連敗数 (Max Consecutive Losses)" value={summary.maxLossStreak} />
        <StatCard title="最大ドローダウン (Maximal Drawdown)" value={summary.maxDrawdown} unit="円" />
        <StatCard title="最大ドローダウン %" value={summary.maxDrawdownPercent} unit="%" />
        <StatCard title="リスクリワード比率 (Risk-Reward Ratio)" value={summary.riskRewardRatio} />
      </div>

        <div className="bg-gray-100 dark:bg-gray-900 rounded-lg shadow-md p-4 mb-8 overflow-auto">
          <h2 className="text-xl font-semibold mb-4">デバッグ情報</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-medium">データサマリー</h3>
              <pre className="bg-white dark:bg-gray-800 p-2 rounded text-xs overflow-auto">
                {JSON.stringify({
                  totalRecords: dashboardData.tradeRecords.length,
                  validTradesCount: dashboardData.tradeRecords.filter(t => t.profit !== null && t.profit !== undefined).length,
                  profitsCount: dashboardData.tradeRecords.filter(t => t.profit > 0).length,
                  lossesCount: dashboardData.tradeRecords.filter(t => t.profit < 0).length,
                  dateRange: {
                    first: dashboardData.tradeRecords.length > 0 ?
                      dashboardData.tradeRecords
                        .slice()
                        .sort((a, b) => new Date(a.openTime).getTime() - new Date(b.openTime).getTime())[0].openTime
                      : null,
                    last: dashboardData.tradeRecords.length > 0 ?
                      dashboardData.tradeRecords
                        .slice()
                        .sort((a, b) => new Date(b.openTime).getTime() - new Date(a.openTime).getTime())[0].openTime
                      : null
                  }
                }, null, 2)}
              </pre>
            </div>
            <div>
              <h3 className="text-lg font-medium">サマリー計算</h3>
              <pre className="bg-white dark:bg-gray-800 p-2 rounded text-xs overflow-auto">
                {JSON.stringify(dashboardData.summary, null, 2)}
              </pre>
            </div>
            <div>
              <h3 className="text-lg font-medium">利益推移データ（最初の5件）</h3>
              <pre className="bg-white dark:bg-gray-800 p-2 rounded text-xs overflow-auto">
                {JSON.stringify(dashboardData.graphs.profitTimeSeries.slice(0, 5), null, 2)}
              </pre>
            </div>
            <div>
              <h3 className="text-lg font-medium">現在のフィルター設定</h3>
              <pre className="bg-white dark:bg-gray-800 p-2 rounded text-xs overflow-auto">
                {JSON.stringify(currentFilter, null, 2)}
              </pre>
            </div>
          </div>
        </div>

      {/* 利益推移グラフ */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-8">
        <h2 className="text-xl font-semibold mb-4">利益推移</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={graphs.profitTimeSeries
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())}
              margin={{ top: 5, right: 30, left: 20, bottom: 15 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={formatMonthDay}
                tick={{ fill: '#4a5568', fontSize: 12 }}
                tickMargin={10}
              />
              <YAxis
                tick={{ fill: '#4a5568', fontSize: 12 }}
              />
              <Tooltip
                formatter={(value: number) => [`${value.toLocaleString('ja-JP')}円`, '']}
                labelFormatter={(label: string) => formatJST(new Date(label))}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  padding: '8px',
                  color: '#1a202c',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="cumulativeProfit"
                name="累積利益"
                stroke="#8884d8"
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 勝率推移グラフ */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-8">
        <h2 className="text-xl font-semibold mb-4">勝率推移 (月別)</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={graphs.monthlyWinRates}
              margin={{ top: 5, right: 30, left: 20, bottom: 15 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tickFormatter={formatYearMonth}
                tick={{ fill: '#4a5568', fontSize: 12 }}
                tickMargin={10}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: '#4a5568', fontSize: 12 }}
              />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(2)}%`, '勝率']}
                labelFormatter={formatYearMonthJP}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  padding: '8px',
                  color: '#1a202c',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                }}
              />
              <Legend />
              <Bar
                dataKey="winRate"
                name="勝率"
                fill="#82ca9d"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ドローダウン推移グラフ */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-8">
        <h2 className="text-xl font-semibold mb-4">ドローダウン推移</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={graphs.drawdownTimeSeries.map(item => ({
                ...item,
                // 値の検証と制限を追加
                drawdown: Math.max(0, item.drawdown),
                // ドローダウン率は理論上0-100%だが、データに異常があった場合に備えて制限
                drawdownPercent: Math.min(100, Math.max(0, Number(item.drawdownPercent.toFixed(2))))
              }))}
              margin={{ top: 5, right: 30, left: 20, bottom: 15 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={formatMonthDay}
                tick={{ fill: '#4a5568', fontSize: 12 }}
                tickMargin={10}
              />
              <YAxis
                yAxisId="left"
                orientation="left"
                tickFormatter={(value: number) => `${value.toLocaleString()}円`}
                tick={{ fill: '#4a5568', fontSize: 12 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                tickFormatter={(value: number) => `${value}%`}
                allowDataOverflow={true}
                tick={{ fill: '#4a5568', fontSize: 12 }}
              />
              <Tooltip
                content={({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
                  if (active && payload && payload.length >= 2) {
                    const date = new Date(label?.toString() || '').toLocaleDateString('ja-JP');
                    const drawdownValue = Number(payload[0]?.value || 0);
                    const percentValue = Number(payload[1]?.value || 0);
                    const customPayload = payload[0] as CustomPayload;
                    const cumulativeProfit = customPayload?.payload?.cumulativeProfit || 0;
                    const peakValue = customPayload?.payload?.peak || 0;

                    return (
                      <div className="bg-white p-2 border border-gray-200 rounded shadow text-gray-900">
                        <p className="text-sm font-medium">{date}</p>
                        <p className="text-sm">
                          ドローダウン: {formatCurrency(drawdownValue)}円 ({formatPercent(percentValue)}%)
                        </p>
                        <p className="text-sm">累積利益: {formatCurrency(cumulativeProfit)}円</p>
                        <p className="text-sm">ピーク: {formatCurrency(peakValue)}円</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                formatter={(value) => {
                  if (value === 'drawdown') return 'ドローダウン (円)';
                  if (value === 'drawdownPercent') return 'ドローダウン (%)';
                  return value;
                }}
              />
              <Line
                type="monotone"
                dataKey="drawdown"
                name="ドローダウン"
                stroke="#ff7300"
                yAxisId="left"
                dot={false}
                activeDot={{ r: 8 }}
              />
              <Line
                type="monotone"
                dataKey="drawdownPercent"
                name="ドローダウン%"
                stroke="#ff0000"
                yAxisId="right"
                dot={false}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* トレード履歴テーブル */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <h2 className="text-xl font-semibold mb-4">トレード履歴</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-700">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="border p-2 text-left">日時(日本時間)</th>
                <th className="border p-2 text-left">チケット</th>
                <th className="border p-2 text-left">タイプ</th>
                <th className="border p-2 text-right">取引サイズ</th>
                <th className="border p-2 text-left">通貨ペア</th>
                <th className="border p-2 text-right">エントリー価格</th>
                <th className="border p-2 text-right">損切価格</th>
                <th className="border p-2 text-right">利確価格</th>
                <th className="border p-2 text-left">決済日時</th>
                <th className="border p-2 text-right">決済価格</th>
                <th className="border p-2 text-right">手数料</th>
                <th className="border p-2 text-right">税金</th>
                <th className="border p-2 text-right">スワップ</th>
                <th className="border p-2 text-right">損益</th>
              </tr>
            </thead>
            <tbody>
              {dashboardData.tradeRecords.map((item, idx) => {
                const trade = item as TradeRecord;

                return (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800"}>
                    <td className="border p-2">{formatJST(trade.openTime)}</td>
                    <td className="border p-2">{trade.ticket}</td>
                    <td className="border p-2 capitalize">{trade.type || '-'}</td>
                    <td className="border p-2 text-right">{trade.size}</td>
                    <td className="border p-2">{trade.item || '-'}</td>
                    <td className="border p-2 text-right">{trade.openPrice}</td>
                    <td className="border p-2 text-right">{trade.stopLoss ?? '-'}</td>
                    <td className="border p-2 text-right">{trade.takeProfit ?? '-'}</td>
                    <td className="border p-2">{trade.closeTime ? formatJST(trade.closeTime) : '-'}</td>
                    <td className="border p-2 text-right">{trade.closePrice}</td>
                    <td className="border p-2 text-right">{trade.commission ?? '-'}</td>
                    <td className="border p-2 text-right">{trade.taxes ?? '-'}</td>
                    <td className="border p-2 text-right">{trade.swap ?? '-'}</td>
                    <td className="border p-2 text-right">{trade.profit}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
