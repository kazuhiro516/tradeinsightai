import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Trash2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface AnalysisReport {
  id: string;
  title: string;
  createdAt: string;
}

interface AnalysisReportListProps {
  onSelectReport: (reportId: string) => void;
  selectedReportId: string | null;
}

export default function AnalysisReportList({
  onSelectReport,
  selectedReportId,
}: AnalysisReportListProps) {
  const [reports, setReports] = useState<AnalysisReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('認証が必要です');
      }

      const response = await fetch('/api/analysis-report', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('レポート一覧の取得に失敗しました');
      }

      const data = await response.json();
      setReports(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (reportId: string) => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('認証が必要です');
      }

      const response = await fetch(`/api/analysis-report?id=${reportId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('レポートの削除に失敗しました');
      }

      await fetchReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  if (loading) {
    return <div className="p-4">読み込み中...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold">AI分析レポート一覧</h2>
      </div>
      <div className="overflow-y-auto h-[calc(100vh-4rem)]">
        {reports.length === 0 ? (
          <div className="p-4 text-gray-500 dark:text-gray-400">
            レポートがありません
          </div>
        ) : (
          <ul>
            {reports.map((report) => (
              <li
                key={report.id}
                className={`border-b border-gray-200 dark:border-gray-700 ${
                  selectedReportId === report.id
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center justify-between p-4">
                  <button
                    onClick={() => onSelectReport(report.id)}
                    className="flex-1 text-left"
                  >
                    <div className="font-medium">{report.title}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(report.createdAt).toLocaleString()}
                    </div>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(report.id)}
                    className="text-gray-500 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
