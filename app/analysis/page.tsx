'use client';

import { useEffect, useState } from 'react';
import { TradeFilter } from '@/types/trade';
import AnalysisReport from '@/app/components/AnalysisReport';
import FilterModal from '@/app/components/FilterModal';
import { Filter } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { PAGINATION } from '@/constants/pagination';
import { checkAuthAndSetSession } from '@/utils/auth';
import { createClient } from '@/utils/supabase/client';
import { AlertCircle } from 'lucide-react';

// デフォルトフィルターの設定
const DEFAULT_FILTER: TradeFilter = {
  page: PAGINATION.DEFAULT_PAGE,
  pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
  sortBy: PAGINATION.DEFAULT_SORT_BY_OPEN_TIME,
  sortOrder: PAGINATION.DEFAULT_SORT_ORDER,
};

export default function AnalysisPage() {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<TradeFilter>(DEFAULT_FILTER);
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // コンポーネントマウント時に認証状態を確認
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 共通認証処理を使用
        const isAuth = await checkAuthAndSetSession();
        setIsAuthenticated(isAuth);

        if (isAuth) {
          // Supabaseを使用してセッションを取得
          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.access_token) {
            setAccessToken(session.access_token);
          }
        }
      } catch (err) {
        console.error('認証エラー:', err);
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  const handleFilterApply = (filter: TradeFilter) => {
    setCurrentFilter(filter);
    setIsFilterModalOpen(false);
  };

  const generateReport = async () => {
    if (!isAuthenticated || !accessToken) {
      setError('認証が必要です。再度ログインしてください。');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/analysis-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ filter: currentFilter }),
      });

      if (!response.ok) {
        throw new Error('レポートの生成に失敗しました');
      }

      const data = await response.json();
      setReport(data.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">トレード分析レポート</h1>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsFilterModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Filter className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {!isAuthenticated && (
        <div className="mb-4 p-2 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center text-sm sm:text-base text-yellow-700 dark:text-yellow-200">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
          <span>ログインが必要です。分析レポートを生成するにはログインしてください。</span>
        </div>
      )}

      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={handleFilterApply}
        currentFilter={currentFilter}
      />

      <AnalysisReport
        report={report}
        loading={loading}
        error={error}
        onGenerateReport={generateReport}
      />
    </div>
  );
}
