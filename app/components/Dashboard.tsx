'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { useRouter } from 'next/navigation'
import { Filter } from 'lucide-react'
import { getCurrentUserId } from '@/utils/auth'
import { DashboardData, StatCardProps } from '@/types/dashboard'
import { TradeFilter, TradeRecord } from '@/types/trade'
import FilterModal from '@/app/components/FilterModal'
import { PAGINATION } from '@/constants/pagination'
import {
  formatMonthDay,
  formatYearMonth,
  formatYearMonthJP,
  convertXMToJST,
  formatDateOnly
} from '@/utils/date'
import { formatCurrency, formatPercent } from '@/utils/number'
import { TooltipProps } from 'recharts'
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { buildTradeFilterParams } from '@/utils/tradeFilter'

// デフォルトフィルターの設定
const DEFAULT_FILTER: TradeFilter = {
  page: PAGINATION.DEFAULT_PAGE,
  pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
  sortBy: PAGINATION.DEFAULT_SORT_BY_OPEN_TIME,
  sortOrder: PAGINATION.DEFAULT_SORT_ORDER,
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
  // AI分析コメント用の状態
  // const [aiAnalysis, setAiAnalysis] = useState<string>('')
  // const [aiLoading, setAiLoading] = useState(false)
  // const [aiError, setAiError] = useState<string | null>(null)
  // const [lastDashboardDataHash, setLastDashboardDataHash] = useState<string>('')

  const fetchDashboardData = useCallback(async (userId: string, filter: TradeFilter) => {
    try {
      setLoading(true)
      const normalized = buildTradeFilterParams(filter)
      const queryParams = new URLSearchParams({ userId })

      if (normalized.types) normalized.types.forEach(t => queryParams.append('type[]', t))
      if (normalized.items) normalized.items.forEach(i => queryParams.append('items[]', i))
      if (normalized.startDate) queryParams.append('startDate', normalized.startDate)
      if (normalized.endDate) queryParams.append('endDate', normalized.endDate)
      if (typeof normalized.page === 'number') queryParams.append('page', normalized.page.toString())
      if (typeof normalized.pageSize === 'number') queryParams.append('pageSize', normalized.pageSize.toString())
      if (normalized.sortBy) queryParams.append('sortBy', normalized.sortBy)
      if (normalized.sortOrder) queryParams.append('sortOrder', normalized.sortOrder)

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

  // NOTE: ホントに必要か判断したいため一旦コメントアウトする
  // dashboardDataが変化したときのみAI分析APIをコール
  // useEffect(() => {
  //   if (!dashboardData) return;
  //   // dashboardDataのハッシュ値を計算（JSON.stringifyで十分）
  //   const dataHash = JSON.stringify(dashboardData);
  //   if (dataHash === lastDashboardDataHash) return; // 変化なし
  //   setLastDashboardDataHash(dataHash);
  //   setAiLoading(true);
  //   setAiError(null);
  //   setAiAnalysis('');
  //   fetch('/api/ai-dashboard-analysis', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ dashboardData, systemPrompt: SYSTEM_PROMPT })
  //   })
  //     .then(async (res) => {
  //       if (!res.ok) {
  //         const err = await res.json();
  //         throw new Error(err.error || 'AI分析コメントの取得に失敗しました');
  //       }
  //       return res.json();
  //     })
  //     .then((data) => {
  //       setAiAnalysis(data.aiComment || '');
  //       setAiError(null);
  //     })
  //     .catch(() => {
  //       setAiError('AI分析コメントの取得に失敗しました');
  //       setAiAnalysis('');
  //     })
  //     .finally(() => setAiLoading(false));
  // }, [dashboardData, lastDashboardDataHash])

  const handleFilterApply = async (filter: TradeFilter) => {
    setCurrentFilter(filter)
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
        currentFilter={currentFilter}
      />

      {/* AI分析コメント表示 */}
      {/* <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">AIによるダッシュボード分析</h2>
        {aiLoading ? (
          <div className="text-gray-500">AI分析中...</div>
        ) : aiError ? (
          <div className="text-red-500">{aiError}</div>
        ) : aiAnalysis ? (
          <div className="bg-blue-50 dark:bg-blue-900 text-blue-900 dark:text-blue-100 rounded p-4 whitespace-pre-line">
            {aiAnalysis}
          </div>
        ) : null}
      </div> */}

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
                labelFormatter={(label: string) => formatDateOnly(new Date(label))}
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
                    // formatDateOnlyを使用して日付を日本語表示に
                    const date = formatDateOnly(new Date(label));
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
              {dashboardData.tradeRecords.slice().reverse().map((item, idx) => {
                const trade = item as TradeRecord;

                return (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800"}>
                    <td className="border p-2">{convertXMToJST(trade.openTime)}</td>
                    <td className="border p-2">{trade.ticket}</td>
                    <td className="border p-2 capitalize">{trade.type || '-'}</td>
                    <td className="border p-2 text-right">{trade.size}</td>
                    <td className="border p-2">{trade.item || '-'}</td>
                    <td className="border p-2 text-right">{trade.openPrice}</td>
                    <td className="border p-2 text-right">{trade.stopLoss ?? '-'}</td>
                    <td className="border p-2 text-right">{trade.takeProfit ?? '-'}</td>
                    <td className="border p-2">{trade.closeTime ? convertXMToJST(trade.closeTime) : '-'}</td>
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
