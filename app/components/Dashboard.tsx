'use client'

import { useState, useEffect } from 'react'
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts'
import { useRouter } from 'next/navigation'
import { checkAuthAndSetSession } from '@/utils/auth'
import { DashboardData, StatCardProps } from '@/types/dashboard'

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

  useEffect(() => {
    // 認証チェック
    const checkAuth = async () => {
      const isAuthenticated = await checkAuthAndSetSession()
      if (!isAuthenticated) {
        router.push('/login')
        return
      }
      fetchDashboardData()
    }
    checkAuth()
  }, [router])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/dashboard')
      
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
          onClick={fetchDashboardData} 
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
    <div className="h-full overflow-auto pb-8">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">トレード分析ダッシュボード</h1>
        
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
        
        {/* グラフセクション */}
        <div className="space-y-8">
          {/* 利益推移グラフ */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
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
                  data={graphs.drawdownTimeSeries}
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
                    formatter={(value: number, name: string) => [
                      name === 'drawdown' ? `${value.toLocaleString('ja-JP')}円` : `${value.toFixed(2)}%`, 
                      name === 'drawdown' ? 'ドローダウン' : 'ドローダウン%'
                    ]}
                    labelFormatter={(label: string) => new Date(label).toLocaleDateString('ja-JP')}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="drawdown"
                    name="ドローダウン"
                    stroke="#ff7300"
                  />
                  <Line
                    type="monotone"
                    dataKey="drawdownPercent"
                    name="ドローダウン%"
                    stroke="#ff0000"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 