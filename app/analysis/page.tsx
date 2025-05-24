'use client';

import { useEffect, useState } from 'react';
import { TradeFilter } from '@/types/trade';
import AnalysisReport from '@/app/components/AnalysisReport';
import AnalysisReportList from '@/app/components/AnalysisReportList';
import FilterModal from '@/app/components/FilterModal';
import { PAGINATION } from '@/constants/pagination';
import { checkAuthAndSetSession } from '@/utils/auth';
import { createClient } from '@/utils/supabase/client';
import { AlertCircle } from 'lucide-react';
import AnalysisReportCreateModal from '@/app/components/AnalysisReportCreateModal';

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
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [reportTitle, setReportTitle] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // コンポーネントマウント時に認証状態を確認
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await checkAuthAndSetSession();
        setIsAuthenticated(isAuth);

        if (isAuth) {
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

  const generateReport = async (title: string, startDate?: Date | null, endDate?: Date | null) => {
    if (!isAuthenticated || !accessToken) {
      setError('認証が必要です。再度ログインしてください。');
      return;
    }

    try {
      setLoading(true);
      setIsGenerating(true);
      setError(null);

      // 期間をfilterに反映
      const filter = {
        ...currentFilter,
        startDate: startDate ?? currentFilter.startDate,
        endDate: endDate ?? currentFilter.endDate,
      };
      const response = await fetch('/api/analysis-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          filter,
          title: title || `AI分析レポート ${new Date().toLocaleString()}`
        }),
      });

      if (!response.ok) {
        throw new Error('レポートの生成に失敗しました');
      }

      const data = await response.json();
      setReport(data.content);
      setSelectedReportId(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
    } finally {
      setLoading(false);
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full h-screen flex flex-row">
      {/* サイドバー：左端に固定 */}
      <AnalysisReportList
        onSelectReport={setSelectedReportId}
        selectedReportId={selectedReportId}
        onCreateReportClick={() => setIsCreateModalOpen(true)}
        isGenerating={isGenerating}
      />
      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col overflow-y-auto bg-white dark:bg-black px-4 py-8">
        <div className="flex justify-between items-center mb-6" />

        <FilterModal
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          onApply={handleFilterApply}
          currentFilter={currentFilter}
        />

        <div className="flex-1 flex justify-center dark:bg-black bg-gray-100 p-4 rounded-lg shadow-md">
          <div className="w-full max-w-4xl">
            <AnalysisReport
              report={report}
              error={error}
              reportId={selectedReportId}
            />
          </div>
        </div>

        <AnalysisReportCreateModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          loading={loading}
          onSubmit={async ({ title, startDate, endDate }) => {
            setReportTitle(title);
            const newFilter = { ...currentFilter, startDate: startDate ?? undefined, endDate: endDate ?? undefined };
            setCurrentFilter(newFilter);
            await generateReport(title, startDate, endDate);
            setIsCreateModalOpen(false);
          }}
          initialTitle={reportTitle}
          initialStartDate={currentFilter.startDate ? new Date(currentFilter.startDate) : undefined}
          initialEndDate={currentFilter.endDate ? new Date(currentFilter.endDate) : undefined}
        />
      </div>
    </div>
  );
}
