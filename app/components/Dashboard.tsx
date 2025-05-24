'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell
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
  formatDateOnly
} from '@/utils/date'
import { formatCurrency, formatPercent } from '@/utils/number'
import { buildTradeFilterParams } from '@/utils/tradeFilter'
import { CHART_COLORS, getChartColors } from '@/constants/chartColors'
import { Popover, PopoverTrigger, PopoverContent } from '@/app/components/ui/popover'
import { Skeleton } from '@/app/components/ui/Skeleton'
import { useTheme } from '@/app/providers/theme-provider'
import { createClient } from '@/utils/supabase/client'

// Supabaseクライアントの設定
const supabase = createClient()

// デフォルトフィルターの設定
const DEFAULT_FILTER: TradeFilter = {
  page: PAGINATION.DEFAULT_PAGE,
  pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
  sortBy: PAGINATION.DEFAULT_SORT_BY_OPEN_TIME,
  sortOrder: PAGINATION.DEFAULT_SORT_ORDER,
};

// カスタムペイロードの型定義
// interface CustomPayload {
//   payload: {
//     cumulativeProfit?: number;
//     peak?: number;
//   };
//   value: number;
// }

// 指標説明・基準値マッピング
const STAT_CARD_DESCRIPTIONS: Record<string, { desc: string; criteria: string }> = {
  '総利益 (Gross Profit)': {
    desc: '勝ちトレードから得られた利益の合計額です。単独で評価するのは適切ではなく、総損失との比率（プロフィットファクター）を併せて評価します。',
    criteria: 'プロフィットファクターが1.1～1.5は標準、1.5以上は安定、2.0以上は優秀とされます。',
  },
  '総損失 (Gross Loss)': {
    desc: '負けトレードで被った損失の合計額です。単独で評価するのは適切ではなく、総利益との比率（プロフィットファクター）を併せて評価します。',
    criteria: 'プロフィットファクターが1.1～1.5は標準、1.5以上は安定、2.0以上は優秀とされます。',
  },
  '純利益 (Net Profit)': {
    desc: '総利益から総損失を引いた実質的な利益です。',
    criteria: 'リスク資産に対して年率10%以上が望ましいとされます。',
  },
  '取引回数 (Total Trades)': {
    desc: '期間内の全取引回数を表します。',
    criteria: '30～50回が最低限、100回以上で信頼性が高まります。',
  },
  '勝率 (Win Rate)': {
    desc: '全取引に対する勝ちトレードの割合です。',
    criteria: '勝率30～40%は収益化可能、40～50%は一般的な目安、50%以上は良好とされます。',
  },
  'プロフィットファクター (Profit Factor)': {
    desc: '総利益÷総損失の絶対値で計算する指標です。運用の安定性を示します。',
    criteria: '1.1～1.5は標準、1.5以上は安定、2.0以上は優秀とされます。',
  },
  '平均利益 (Average Profit)': {
    desc: '勝ちトレード1回あたりの平均利益です。',
    criteria: '平均損失の1.5倍以上が望ましいとされます。',
  },
  '平均損失 (Average Loss)': {
    desc: '負けトレード1回あたりの平均損失です。',
    criteria: 'リスク許容額の2%以内が推奨されます。',
  },
  '最大利益 (Largest Profit)': {
    desc: '単一トレードでの最大の利益額です。',
    criteria: '平均利益の3倍以内が望ましいとされます。',
  },
  '最大損失 (Largest Loss)': {
    desc: '単一トレードでの最大の損失額です。',
    criteria: '平均損失の3倍以内が望ましいとされます。',
  },
  '最大連勝数 (Max Consecutive Wins)': {
    desc: '連続して利益を出した最大回数です。',
    criteria: '取引回数に対する比率で評価するのが望ましいとされます。',
  },
  '最大連敗数 (Max Consecutive Losses)': {
    desc: '連続して損失を出した最大回数です。',
    criteria: '資金管理上、10回以下が望ましいとされます。',
  },
  '最大ドローダウン (Maximal Drawdown)': {
    desc: '資金残高のピークから底値までの最大下落額です。',
    criteria: '10%以下は非常に優秀、10～15%は優秀、15～20%は許容範囲、20%以上は要改善とされます。',
  },
  '最大ドローダウン %': {
    desc: '資金残高のピークから底値までの最大下落率です。',
    criteria: '10%以下は非常に優秀、10～15%は優秀、15～20%は許容範囲、20%以上は要改善とされます。',
  },
  'リスクリワード比率 (Risk-Reward Ratio)': {
    desc: '平均利益÷平均損失の絶対値で計算する指標です。リスクに対するリターンの効率を示します。',
    criteria: '1:1.5以上が最低ライン、1:2～1:5が望ましい、5以上は難易度が高いとされます。',
  },
};
// StatCard拡張：Popoverで説明表示
const StatCard = ({ title, value, unit = '' }: StatCardProps) => {
  const info = STAT_CARD_DESCRIPTIONS[title]
  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 cursor-pointer hover:ring-2 hover:ring-blue-400 transition">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
            {title}
            {info && (
              <span className="ml-1 text-blue-400" aria-label="説明">🛈</span>
            )}
          </h3>
          <p className="text-2xl font-bold mt-2">
            {typeof value === 'number'
              ? (title.includes('Profit Factor') || title.includes('Risk-Reward Ratio')
                ? value.toFixed(2)
                : (unit === '%' ? formatPercent(value) : formatCurrency(value))
              )
              : value}
            {unit}
          </p>
        </div>
      </PopoverTrigger>
      {info && (
        <PopoverContent align="center" sideOffset={8} className="max-w-xs">
          <div className="text-sm font-bold mb-1">{title}</div>
          <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line mb-2">{info.desc}</div>
          <div className="text-xs text-blue-700 dark:text-blue-300">{info.criteria}</div>
        </PopoverContent>
      )}
    </Popover>
  )
}

// カスタムLegendコンポーネント
const CustomLegend = () => {
  const { theme } = useTheme();
  const chartColors = getChartColors(theme === 'system' && typeof window !== 'undefined'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ width: 18, height: 18, background: chartColors.winRate, display: 'inline-block', borderRadius: 3 }} />
        <span style={{ color: chartColors.winRate }}>勝率</span>
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ width: 18, height: 18, background: `linear-gradient(90deg, ${chartColors.totalProfit} 50%, ${chartColors.loss} 50%)`, display: 'inline-block', borderRadius: 3, border: '1px solid #333' }} />
        <span style={{ color: chartColors.totalProfit }}>合計利益</span>
      </span>
    </div>
  );
};

export default function Dashboard() {
  const router = useRouter()
  const { theme } = useTheme();
  const chartColors = getChartColors(theme === 'system' && typeof window !== 'undefined'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [currentFilter, setCurrentFilter] = useState<TradeFilter>(DEFAULT_FILTER)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [tradeRecords, setTradeRecords] = useState<TradeRecord[]>([]);
  const [tradeLoading, setTradeLoading] = useState(false);

  const fetchDashboardData = useCallback(async (userId: string, filter: TradeFilter) => {
    try {
      setLoading(true)
      const normalized = buildTradeFilterParams(filter)
      const queryParams = new URLSearchParams({ userId })

      if (normalized.types) normalized.types.forEach(t => queryParams.append('type[]', t))
      if (normalized.items) normalized.items.forEach(i => queryParams.append('items[]', i))
      if (normalized.startDate) queryParams.append('startDate', normalized.startDate.toISOString())
      if (normalized.endDate) queryParams.append('endDate', normalized.endDate.toISOString())
      if (typeof normalized.page === 'number') queryParams.append('page', normalized.page.toString())
      if (typeof normalized.pageSize === 'number') queryParams.append('pageSize', normalized.pageSize.toString())
      if (normalized.sortBy) queryParams.append('sortBy', normalized.sortBy)
      if (normalized.sortOrder) queryParams.append('sortOrder', normalized.sortOrder)
      if (typeof normalized.profitMin === 'number') queryParams.append('profitMin', normalized.profitMin.toString())
      if (typeof normalized.profitMax === 'number') queryParams.append('profitMax', normalized.profitMax.toString())

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

  // トレード履歴の取得
  const fetchTradeRecords = useCallback(async (userId: string, filter: TradeFilter) => {
    try {
      setTradeLoading(true)
      const normalized = buildTradeFilterParams(filter)
      const queryParams = new URLSearchParams()
      queryParams.append('filter', JSON.stringify({
        ...normalized,
        page: normalized.page || 1,
        pageSize: normalized.pageSize || PAGINATION.DEFAULT_PAGE_SIZE,
        sortBy: 'openTime',
        sortOrder: 'desc'
      }))

      // Supabaseを使用してセッションを取得
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('認証が必要です');
      }

      const response = await fetch('/api/trade-records?' + queryParams.toString(), {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'トレード履歴の取得に失敗しました')
      }

      const data = await response.json()
      setTradeRecords(data.records)
      setTotalPages(Math.ceil(data.total / data.pageSize))
    } catch (err) {
      console.error('トレード履歴取得エラー:', err)
      setError('トレード履歴の取得に失敗しました。再試行してください。')
    } finally {
      setTradeLoading(false)
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
        fetchTradeRecords(currentUserId, { ...currentFilter, page: currentPage, pageSize: PAGINATION.DEFAULT_PAGE_SIZE })
      }
    }
    initializeData()
  // NOTE: ページネーションの操作では集計の再実行が不要なため、ページネーションの操作では集計の再実行をしないようにする
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkAuth, currentFilter, fetchDashboardData, fetchTradeRecords])

  const handlePageChange = async (page: number) => {
    setCurrentPage(page)
    const userId = await checkAuth()
    if (userId) {
      fetchTradeRecords(userId, { ...currentFilter, page, pageSize: PAGINATION.DEFAULT_PAGE_SIZE })
    }
  }

  const handleFilterApply = async (filter: TradeFilter) => {
    setCurrentFilter(filter)
    setCurrentPage(1) // フィルター適用時にページを1にリセット
  }

  if (loading) {
    // スケルトンUI
    return (
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー・フィルターボタン */}
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-8 w-1/3" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-20" />
          </div>
        </div>
        {/* サマリー統計カードのスケルトン */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 14 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        {/* グラフスケルトン */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-8">
            <Skeleton className="h-6 w-1/4 mb-4" />
            <Skeleton className="h-80 w-full" />
          </div>
        ))}
        {/* ハイライトカードのスケルトン */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        {/* テーブルスケルトン */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <Skeleton className="h-6 w-1/4 mb-4" />
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-700">
              <thead>
                <tr>
                  {Array.from({ length: 14 }).map((_, i) => (
                    <th key={i} className="border p-2"><Skeleton className="h-4 w-16" /></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 8 }).map((_, row) => (
                  <tr key={row}>
                    {Array.from({ length: 14 }).map((_, col) => (
                      <td key={col} className="border p-2"><Skeleton className="h-4 w-16" /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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

  // --- 追加: 時間帯別（市場区分）成績の可視化 ---
  const timeZoneStats = dashboardData.timeZoneStats || [];
  // 勝率で最大の市場区分を抽出
  const bestWinZone = timeZoneStats.reduce((max, z) => (z.winRate > (max?.winRate ?? -1) ? z : max), null as typeof timeZoneStats[0] | null);
  // 合計利益で最大の市場区分を抽出
  const bestProfitZone = timeZoneStats.reduce((max, z) => (z.totalProfit > (max?.totalProfit ?? -Infinity) ? z : max), null as typeof timeZoneStats[0] | null);

  // --- 追加: 通貨ペア別・曜日別成績の可視化 ---
  const symbolStats = dashboardData.symbolStats || [];
  // 月〜金のみ
  const weekdayStats = (dashboardData.weekdayStats || []).filter(w => w.weekday >= 1 && w.weekday <= 5);

  // 通貨ペア別ハイライト
  const bestProfitSymbol = symbolStats.reduce((max, s) => (s.totalProfit > (max?.totalProfit ?? -Infinity) ? s : max), null as typeof symbolStats[0] | null);
  const worstProfitSymbol = symbolStats.reduce((min, s) => (s.totalProfit < (min?.totalProfit ?? Infinity) ? s : min), null as typeof symbolStats[0] | null);

  // 曜日別ハイライト
  const bestWinWeekday = weekdayStats.reduce((max, w) => (w.winRate > (max?.winRate ?? -1) ? w : max), null as typeof weekdayStats[0] | null);
  // 追加: 曜日別合計利益最大
  const bestProfitWeekday = weekdayStats.reduce((max, w) => (w.totalProfit > (max?.totalProfit ?? -Infinity) ? w : max), null as typeof weekdayStats[0] | null);

  // --- 追加: 曜日×市場区分ヒートマップ可視化 ---
  const weekdayTimeZoneHeatmap = dashboardData.weekdayTimeZoneHeatmap || [];
  const heatmapZones = [
    { zone: 'tokyo', label: '東京' },
    { zone: 'london', label: 'ロンドン' },
    { zone: 'newyork', label: 'ニューヨーク' },
    { zone: 'other', label: 'その他' },
  ];
  // 月〜金のみ
  const heatmapWeekdays = ['月', '火', '水', '木', '金'];
  // 0〜100%を赤→黄→緑でグラデーション
  function winRateColor(rate: number) {
    // 0:赤 #f87171, 50:黄 #facc15, 100:緑 #4ade80
    if (rate <= 50) {
      // 赤→黄
      const r = 248 + Math.round((250-248)*(rate/50));
      const g = 113 + Math.round((204-113)*(rate/50));
      const b = 113 + Math.round((21-113)*(rate/50));
      return `rgb(${r},${g},${b})`;
    } else {
      // 黄→緑
      const r = 250 + Math.round((74-250)*((rate-50)/50));
      const g = 204 + Math.round((222-204)*((rate-50)/50));
      const b = 21 + Math.round((128-21)*((rate-50)/50));
      return `rgb(${r},${g},${b})`;
    }
  }

  // 通貨ペア別横棒グラフ
  const symbolStatsWithColor = symbolStats.map(s => ({ ...s, barColor: s.totalProfit < 0 ? CHART_COLORS.loss : CHART_COLORS.totalProfit }));
  // 曜日別
  const weekdayStatsWithColor = weekdayStats.map(w => ({ ...w, barColor: w.totalProfit < 0 ? CHART_COLORS.loss : CHART_COLORS.totalProfit }));
  // 時間帯別
  const timeZoneStatsWithColor = timeZoneStats.map(z => ({ ...z, barColor: z.totalProfit < 0 ? CHART_COLORS.loss : CHART_COLORS.totalProfit }));

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
        {/* <StatCard title="最大ドローダウン (Maximal Drawdown)" value={summary.maxDrawdown} unit="円" />
        <StatCard title="最大ドローダウン %" value={summary.maxDrawdownPercent} unit="%" /> */}
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
                tick={{ fill: chartColors.label, fontSize: 12 }}
                tickMargin={10}
                interval="preserveStartEnd"
                minTickGap={50}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fill: chartColors.label, fontSize: 12 }}
                tickFormatter={(value) => value.toLocaleString('ja-JP')}
              />
              <Tooltip
                formatter={(value: number) => [`${value.toLocaleString('ja-JP')}円`, '']}
                labelFormatter={(label: string) => formatDateOnly(new Date(label))}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  padding: '8px',
                  color: chartColors.label,
                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="cumulativeProfit"
                name="累積利益"
                stroke={chartColors.totalProfit}
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
                tick={{ fill: chartColors.label, fontSize: 12 }}
                tickMargin={10}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: chartColors.label, fontSize: 12 }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    // payload[0]?.payload?.trades から直接取得
                    const trades = typeof payload[0]?.payload?.trades === 'number' && !isNaN(payload[0]?.payload?.trades)
                      ? payload[0].payload.trades
                      : 0;
                    const winRatePayload = payload.find(p => p.dataKey === 'winRate');
                    return (
                      <div className="bg-white p-2 border border-gray-200 rounded shadow text-gray-900">
                        <div className="text-base font-bold" style={{ color: chartColors.label }}>{formatYearMonthJP(label)}</div>
                        <div className="text-sm" style={{ color: chartColors.winRate }}>
                          勝率: {winRatePayload && typeof winRatePayload.value === 'number' ? winRatePayload.value.toFixed(2) : '-'}%
                        </div>
                        <div className="text-sm" style={{ color: chartColors.label }}>
                          取引回数: {trades}件
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Bar
                dataKey="winRate"
                name="勝率"
                fill={chartColors.winRate}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ドローダウン推移グラフ */}
      {/* <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-8">
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
                tick={{ fill: chartColors.label, fontSize: 12 }}
                tickMargin={10}
              />
              <YAxis
                yAxisId="left"
                orientation="left"
                tickFormatter={(value: number) => `${value.toLocaleString()}円`}
                tick={{ fill: chartColors.label, fontSize: 12 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                tickFormatter={(value: number) => `${value}%`}
                allowDataOverflow={true}
                tick={{ fill: chartColors.label, fontSize: 12 }}
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
                        <p className="text-sm font-medium" style={{ color: chartColors.label }}>{date}</p>
                        <p className="text-sm" style={{ color: chartColors.drawdown }}>
                          ドローダウン: {formatCurrency(drawdownValue)}円
                        </p>
                        <p className="text-sm" style={{ color: chartColors.drawdownPercent }}>
                          ドローダウン率: {formatPercent(percentValue)}%
                        </p>
                        <p className="text-sm" style={{ color: chartColors.totalProfit }}>累積利益: {formatCurrency(cumulativeProfit)}円</p>
                        <p className="text-sm" style={{ color: chartColors.label }}>ピーク: {formatCurrency(peakValue)}円</p>
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
                stroke={chartColors.drawdown}
                yAxisId="left"
                dot={false}
                activeDot={{ r: 8 }}
              />
              <Line
                type="monotone"
                dataKey="drawdownPercent"
                name="ドローダウン%"
                stroke={chartColors.drawdownPercent}
                yAxisId="right"
                dot={false}
                activeDot={{ r: 8 }}
                strokeWidth={2}
                isAnimationActive={false}
                connectNulls={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div> */}

      {/* --- 時間帯別ハイライトカード --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900 rounded-lg shadow p-4 flex flex-col items-center">
          <div className="text-sm text-gray-500 mb-1">最も勝率が高い市場</div>
          <div className="text-lg font-bold">{bestWinZone ? bestWinZone.label : '-'}</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-300">{bestWinZone ? `${bestWinZone.winRate.toFixed(1)}%` : '-'}</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900 rounded-lg shadow p-4 flex flex-col items-center">
          <div className="text-sm text-gray-500 mb-1">最も合計利益が高い市場</div>
          <div className="text-lg font-bold">{bestProfitZone ? bestProfitZone.label : '-'}</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-300">{bestProfitZone ? `${bestProfitZone.totalProfit.toLocaleString()}円` : '-'}</div>
        </div>
      </div>

      {/* --- 時間帯別バーチャート --- */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-8">
        <h2 className="text-xl font-semibold mb-4">時間帯別（市場区分）成績</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timeZoneStatsWithColor} margin={{ top: 5, right: 30, left: 20, bottom: 15 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: chartColors.label, fontSize: 12 }} tickMargin={10} />
              <YAxis yAxisId="left" orientation="left" tickFormatter={(v) => `${v}%`} tick={{ fill: chartColors.label, fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v.toLocaleString()}円`} tick={{ fill: chartColors.label, fontSize: 12 }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0]?.payload;
                    return (
                      <div className="bg-white p-2 border border-gray-200 rounded shadow text-gray-900">
                        <div className="text-base font-bold" style={{ color: chartColors.label }}>{data.label}</div>
                        <div className="text-sm" style={{ color: chartColors.winRate }}>勝率: {typeof data.winRate === 'number' ? data.winRate.toFixed(1) : '-'}%</div>
                        <div className="text-sm" style={{ color: data.totalProfit < 0 ? CHART_COLORS.loss : CHART_COLORS.totalProfit }}>合計利益: {typeof data.totalProfit === 'number' ? data.totalProfit.toLocaleString() : '-'}円</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend content={CustomLegend} />
              <Bar yAxisId="left" dataKey="winRate" name="勝率" fill={chartColors.winRate} radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="totalProfit" name="合計利益" radius={[4, 4, 0, 0]}>
                {timeZoneStatsWithColor.map((entry, idx) => (
                  <Cell key={idx} fill={entry.barColor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* --- 通貨ペア別ハイライトカード --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900 rounded-lg shadow p-4 flex flex-col items-center">
          <div className="text-sm text-gray-500 mb-1">最多利益ペア</div>
          <div className="text-lg font-bold">{bestProfitSymbol ? bestProfitSymbol.symbol : '-'}</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-300">{bestProfitSymbol ? `${bestProfitSymbol.totalProfit.toLocaleString()}円` : '-'}</div>
        </div>
        <div className="bg-red-50 dark:bg-red-900 rounded-lg shadow p-4 flex flex-col items-center">
          <div className="text-sm text-gray-500 mb-1">最大損失ペア</div>
          <div className="text-lg font-bold">{worstProfitSymbol ? worstProfitSymbol.symbol : '-'}</div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-300">{worstProfitSymbol ? `${worstProfitSymbol.totalProfit.toLocaleString()}円` : '-'}</div>
        </div>
      </div>

      {/* --- 通貨ペア別横棒グラフ --- */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-8">
        <h2 className="text-xl font-semibold mb-4">通貨ペア別成績</h2>
        <div className="h-80 overflow-x-auto">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={symbolStatsWithColor} margin={{ top: 5, right: 30, left: 20, bottom: 15 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="symbol" tick={{ fill: chartColors.label, fontSize: 12 }} tickMargin={10} />
              <YAxis yAxisId="left" orientation="left" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fill: chartColors.label, fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: chartColors.label, fontSize: 12 }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0]?.payload;
                    return (
                      <div className="bg-white p-2 border border-gray-200 rounded shadow text-gray-900">
                        <div className="text-base font-bold" style={{ color: chartColors.symbol }}>{data.symbol}</div>
                        <div className="text-sm" style={{ color: chartColors.winRate }}>勝率: {typeof data.winRate === 'number' ? data.winRate.toFixed(1) : '-'}%</div>
                        <div className="text-sm" style={{ color: data.totalProfit < 0 ? CHART_COLORS.loss : CHART_COLORS.totalProfit }}>合計利益: {typeof data.totalProfit === 'number' ? data.totalProfit.toLocaleString() : '-'}円</div>
                        <div className="text-sm" style={{ color: chartColors.label }}>取引数: {data.trades}</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend content={CustomLegend} />
              <Bar yAxisId="left" dataKey="winRate" name="勝率" fill={chartColors.winRate} radius={[4,4,0,0]} />
              <Bar yAxisId="right" dataKey="totalProfit" name="合計利益" radius={[4,4,0,0]}>
                {symbolStatsWithColor.map((entry, idx) => (
                  <Cell key={idx} fill={entry.barColor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* --- 曜日別ハイライトカード --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900 rounded-lg shadow p-4 flex flex-col items-center">
          <div className="text-sm text-gray-500 mb-1">最も勝率が高い曜日</div>
          <div className="text-lg font-bold">{bestWinWeekday ? bestWinWeekday.label : '-'}</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-300">{bestWinWeekday ? `${bestWinWeekday.winRate.toFixed(1)}%` : '-'}</div>
        </div>
        {/* 追加: 最も合計利益が高い曜日カード */}
        <div className="bg-green-50 dark:bg-green-900 rounded-lg shadow p-4 flex flex-col items-center">
          <div className="text-sm text-gray-500 mb-1">最も合計利益が高い曜日</div>
          <div className="text-lg font-bold">{bestProfitWeekday ? bestProfitWeekday.label : '-'}</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-300">{bestProfitWeekday ? `${bestProfitWeekday.totalProfit.toLocaleString()}円` : '-'}</div>
        </div>
      </div>

      {/* --- 曜日別バーチャート --- */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-8">
        <h2 className="text-xl font-semibold mb-4">曜日別成績</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekdayStatsWithColor} margin={{ top: 5, right: 30, left: 20, bottom: 15 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: chartColors.label, fontSize: 12 }} tickMargin={10} />
              <YAxis yAxisId="left" orientation="left" tickFormatter={(v) => `${v}%`} tick={{ fill: chartColors.label, fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v.toLocaleString()}円`} tick={{ fill: chartColors.label, fontSize: 12 }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0]?.payload;
                    return (
                      <div className="bg-white p-2 border border-gray-200 rounded shadow text-gray-900">
                        <div className="text-base font-bold" style={{ color: chartColors.label }}>{data.label}</div>
                        <div className="text-sm" style={{ color: chartColors.winRate }}>勝率: {typeof data.winRate === 'number' ? data.winRate.toFixed(1) : '-'}%</div>
                        <div className="text-sm" style={{ color: data.totalProfit < 0 ? CHART_COLORS.loss : CHART_COLORS.totalProfit }}>合計利益: {typeof data.totalProfit === 'number' ? data.totalProfit.toLocaleString() : '-'}円</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend content={CustomLegend} />
              <Bar yAxisId="left" dataKey="winRate" name="勝率" fill={chartColors.winRate} radius={[4,4,0,0]} />
              <Bar yAxisId="right" dataKey="totalProfit" name="合計利益" radius={[4,4,0,0]}>
                {weekdayStatsWithColor.map((entry, idx) => (
                  <Cell key={idx} fill={entry.barColor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* --- 曜日×市場区分ヒートマップ --- */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-8">
        <h2 className="text-xl font-semibold mb-4">曜日×市場区分ヒートマップ（勝率%）</h2>
        <div className="overflow-x-auto">
          <svg width={heatmapWeekdays.length * 60 + 120} height={heatmapZones.length * 50 + 60}>
            {/* 曜日ラベル */}
            {heatmapWeekdays.map((w, i) => (
              <text key={w} x={120 + i * 60 + 30} y={40} textAnchor="middle" fontSize="14" fill={chartColors.label}>{w}</text>
            ))}
            {/* 市場区分ラベル */}
            {heatmapZones.map((z, j) => (
              <text key={z.zone} x={100} y={80 + j * 50 + 25} textAnchor="end" fontSize="14" fill={chartColors.label}>{z.label}</text>
            ))}
            {/* セル */}
            {heatmapZones.map((z, j) => heatmapWeekdays.map((w, i) => {
              // i: 0〜4（月〜金）
              const cell = weekdayTimeZoneHeatmap.find(c => c.zone === z.zone && c.weekday === (i+1));
              const rate = cell ? cell.winRate : 0;
              return (
                <g key={z.zone + w}>
                  <rect x={120 + i * 60} y={60 + j * 50} width={60} height={50} rx={8} fill={winRateColor(rate)} stroke={chartColors.label} />
                  <text x={120 + i * 60 + 30} y={60 + j * 50 + 28} textAnchor="middle" fontSize="16" fill={chartColors.label} fontWeight="bold">
                    {cell ? `${rate.toFixed(0)}%` : '-'}
                  </text>
                  <text x={120 + i * 60 + 30} y={60 + j * 50 + 44} textAnchor="middle" fontSize="11" fill={chartColors.label}>
                    {cell && cell.trades > 0 ? `${cell.trades}件` : ''}
                  </text>
                </g>
              );
            }))}
          </svg>
        </div>
      </div>

      {/* トレード履歴テーブル */}
      {/* 640px未満では非表示、640px以上で表示 */}
      <div className="hidden sm:block">
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
                {tradeRecords.slice().map((item, idx) => {
                  const trade = item as TradeRecord;

                  return (
                    <tr key={idx} className={idx % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800"}>
                      <td className="border p-2">{trade.openTime}</td>
                      <td className="border p-2">{trade.ticket}</td>
                      <td className="border p-2 capitalize">{trade.type || '-'}</td>
                      <td className="border p-2 text-right">{trade.size}</td>
                      <td className="border p-2">{trade.item || '-'}</td>
                      <td className="border p-2 text-right">{trade.openPrice}</td>
                      <td className="border p-2 text-right">{trade.stopLoss ?? '-'}</td>
                      <td className="border p-2 text-right">{trade.takeProfit ?? '-'}</td>
                      <td className="border p-2">{trade.closeTime ?trade.closeTime : '-'}</td>
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
          {/* ページネーションコントロール */}
          <div className="mt-4 flex justify-center items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || tradeLoading}
              className={`px-3 py-1 rounded ${
                currentPage === 1 || tradeLoading
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              前へ
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || tradeLoading}
              className={`px-3 py-1 rounded ${
                currentPage === totalPages || tradeLoading
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              次へ
            </button>
          </div>
        </div>
      </div>
      {/* 640px未満でのみ表示される案内文 */}
      <div className="block sm:hidden">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-700 dark:text-gray-200 text-base font-medium">
            トレード履歴テーブルは画面幅640px以上で表示されます。
          </p>
        </div>
      </div>
    </div>
  )
}
