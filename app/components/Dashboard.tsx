'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { useRouter } from 'next/navigation'
import { Filter } from 'lucide-react'
import { getCurrentUserId } from '@/utils/auth'
import { DashboardData, StatCardProps, DrawdownTimeSeriesData } from '@/types/dashboard'
import { TradeFilter } from '@/types/trade'
import FilterModal from '@/app/components/FilterModal'

// デフォルトフィルターの設定
const DEFAULT_FILTER: TradeFilter = {
  startDate: new Date(new Date().setMonth(new Date().getMonth() - 6)), // 6ヶ月前から
  endDate: new Date(),
  page: 1,
  pageSize: 200,
  orderBy: 'openTime',
  orderDirection: 'desc'
};

interface TooltipPayload {
  value: number;
  payload: {
    cumulativeProfit?: number;
    peak?: number;
  };
}

// 統計カードコンポーネント
const StatCard = ({ title, value, unit = '' }: StatCardProps) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
    <p className="text-2xl font-bold mt-2">
      {typeof value === 'number' ?
        (unit === '%' ? value.toFixed(2) : value.toLocaleString('ja-JP')) : value}
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

  const fetchDashboardData = useCallback(async (userId: string, filter: TradeFilter) => {
    try {
      setLoading(true)
      const queryParams = new URLSearchParams({ userId })

      // デバッグログを追加
      console.log('フィルター適用:', filter)

      Object.entries(filter).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key + '[]', v.toString()))
        } else if (value !== null && value !== undefined) {
          if (value instanceof Date) {
            queryParams.append(key, value.toISOString())
          } else {
            queryParams.append(key, value.toString())
          }
        }
      })

      // デバッグログを追加
      console.log('APIリクエストパラメータ:', queryParams.toString())

      const response = await fetch('/api/dashboard?' + queryParams.toString())

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'データ取得に失敗しました')
      }

      const data = await response.json()

      // デバッグログを追加
      console.log('APIレスポンス:', data)

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
      if (currentUserId && !dashboardData) {
        fetchDashboardData(currentUserId, currentFilter)
      }
    }
    initializeData()
  }, [checkAuth, currentFilter, fetchDashboardData, dashboardData])

  const handleFilterApply = async (filter: TradeFilter) => {
    // デバッグログを追加
    console.log('フィルター適用前の値:', currentFilter)
    console.log('新しいフィルター値:', filter)

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
        <button
          onClick={() => setIsFilterModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <Filter className="w-5 h-5" />
        </button>
      </div>

      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={handleFilterApply}
        type="dashboard"
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

      {/* 利益推移グラフ */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-8">
        <h2 className="text-xl font-semibold mb-4">利益推移</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={graphs.profitTimeSeries}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value: string) => {
                  const date = new Date(value)
                  return `${date.getMonth() + 1}/${date.getDate()}`
                }}
              />
              <YAxis />
              <Tooltip
                formatter={(value: number) => [`${value.toLocaleString('ja-JP')}円`, '']}
                labelFormatter={(label: string) => new Date(label).toLocaleDateString('ja-JP')}
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
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tickFormatter={(value: string) => {
                  const [year, month] = value.split('-')
                  return `${year}/${month}`
                }}
              />
              <YAxis domain={[0, 100]} />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(2)}%`, '勝率']}
                labelFormatter={(label: string) => {
                  const [year, month] = label.split('-')
                  return `${year}年${month}月`
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
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
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value: string) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
              />
              <YAxis
                yAxisId="left"
                orientation="left"
                tickFormatter={(value: number) => `${value.toLocaleString()}円`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                tickFormatter={(value: number) => `${value}%`}
                allowDataOverflow={true}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length >= 2) {
                    const date = new Date(label).toLocaleDateString('ja-JP');
                    const drawdownValue = (payload[0] as TooltipPayload)?.value || 0;
                    const percentValue = (payload[1] as TooltipPayload)?.value || 0;
                    const cumulativeProfit = (payload[0]?.payload as TooltipPayload['payload'])?.cumulativeProfit || 0;
                    const peakValue = (payload[0]?.payload as TooltipPayload['payload'])?.peak || 0;

                    return (
                      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-300 dark:border-gray-600 rounded shadow-md">
                        <p className="text-gray-700 dark:text-gray-300 font-medium">{date}</p>
                        <p className="text-blue-500">
                          <span className="font-medium">累積損益: </span>
                          <span>{cumulativeProfit.toLocaleString('ja-JP')}円</span>
                        </p>
                        <p className="text-green-500">
                          <span className="font-medium">最高水準: </span>
                          <span>{peakValue.toLocaleString('ja-JP')}円</span>
                        </p>
                        <p className="text-orange-500">
                          <span className="font-medium">ドローダウン: </span>
                          <span>{drawdownValue.toLocaleString('ja-JP')}円</span>
                        </p>
                        <p className="text-red-500">
                          <span className="font-medium">ドローダウン率: </span>
                          <span>{percentValue.toFixed(2)}%</span>
                        </p>
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

      {/* デバッグ情報（開発時のみ表示） */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-900 rounded">
          <h3 className="text-lg font-semibold mb-2">デバッグ情報</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold">統計情報</h4>
              <ul className="list-disc pl-5">
                <li>最大ドローダウン: {summary.maxDrawdown.toLocaleString('ja-JP')}円</li>
                <li>最大ドローダウン%: {summary.maxDrawdownPercent.toFixed(2)}%</li>
                <li>データ件数: {graphs.drawdownTimeSeries.length}</li>
                <li>最初の日付: {graphs.drawdownTimeSeries.length > 0 ? new Date(graphs.drawdownTimeSeries[0].date).toLocaleDateString('ja-JP') : 'なし'}</li>
                <li>最後の日付: {graphs.drawdownTimeSeries.length > 0 ? new Date(graphs.drawdownTimeSeries[graphs.drawdownTimeSeries.length-1].date).toLocaleDateString('ja-JP') : 'なし'}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold">ドローダウン分析</h4>
              <ul className="list-disc pl-5">
                <li>最大ドローダウン値（グラフ）: {graphs.drawdownTimeSeries.length > 0 ? Math.max(...graphs.drawdownTimeSeries.map(item => item.drawdown)).toLocaleString('ja-JP') : 0}円</li>
                <li>最大ドローダウン%（グラフ）: {graphs.drawdownTimeSeries.length > 0 ? Math.max(...graphs.drawdownTimeSeries.map(item => item.drawdownPercent)).toFixed(2) : 0}%</li>
                <li>ピーク値: {graphs.drawdownTimeSeries.length > 0 ? Math.max(...graphs.drawdownTimeSeries.map(item => (item as DrawdownTimeSeriesData).peak || 0)).toLocaleString('ja-JP') : 0}円</li>
                <li>最終累積利益: {graphs.drawdownTimeSeries.length > 0 ? ((graphs.drawdownTimeSeries[graphs.drawdownTimeSeries.length-1] as DrawdownTimeSeriesData).cumulativeProfit || 0).toLocaleString('ja-JP') : 0}円</li>
              </ul>
            </div>
            {/* 追加のデバッグデータのテーブル表示 */}
            <div className="col-span-2 overflow-x-auto mt-4">
              <h4 className="font-semibold mb-2">データサンプル（最初の5件）</h4>
              {graphs.drawdownTimeSeries.length > 0 ? (
                <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-700">
                  <thead>
                    <tr className="bg-gray-200 dark:bg-gray-800">
                      <th className="border p-2">日付</th>
                      <th className="border p-2">取引利益</th>
                      <th className="border p-2">累積利益</th>
                      <th className="border p-2">ピーク</th>
                      <th className="border p-2">ドローダウン</th>
                      <th className="border p-2">ドローダウン%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {graphs.drawdownTimeSeries.slice(0, 5).map((item, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800"}>
                        <td className="border p-2">{new Date(item.date).toLocaleDateString('ja-JP')}</td>
                        <td className="border p-2">{((item as DrawdownTimeSeriesData).profit || 0).toLocaleString('ja-JP')}円</td>
                        <td className="border p-2">{((item as DrawdownTimeSeriesData).cumulativeProfit || 0).toLocaleString('ja-JP')}円</td>
                        <td className="border p-2">{((item as DrawdownTimeSeriesData).peak || 0).toLocaleString('ja-JP')}円</td>
                        <td className="border p-2">{item.drawdown.toLocaleString('ja-JP')}円</td>
                        <td className="border p-2">{item.drawdownPercent.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>データがありません</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
