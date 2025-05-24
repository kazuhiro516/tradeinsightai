import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Trash2, Edit2, Check, X, Loader2Icon } from 'lucide-react';
import { Plus } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { Input } from './ui/input';
import { useToast } from "@/hooks/use-toast";
import { supabaseClient } from '@/utils/supabase/realtime';
import { checkAuthAndSetSession, getCurrentUserId } from '@/utils/auth';

interface AnalysisReport {
  id: string;
  title: string;
  createdAt: string;
  userId: string;
}

interface AnalysisReportListProps {
  onSelectReport: (reportId: string) => void;
  selectedReportId: string | null;
  onCreateReportClick?: () => void;
  isGenerating?: boolean;
}

export default function AnalysisReportList({
  onSelectReport,
  selectedReportId,
  onCreateReportClick,
  isGenerating = false
}: AnalysisReportListProps) {
  const [reports, setReports] = useState<AnalysisReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const { toast } = useToast();

  // 認証情報の確認
  useEffect(() => {
    checkAuthAndSetSession();
  }, []);

  // レポートの取得とリアルタイム購読
  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        setError(null);

        const isAuthenticated = await checkAuthAndSetSession();
        if (!isAuthenticated) {
          setError('認証されていません。ログインしてください。');
          return;
        }

        const { userId } = await getCurrentUserId();
        if (!userId) {
          setError('認証されていません。ログインしてください。');
          return;
        }

        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setError('認証されていません。ログインしてください。');
          return;
        }

        const response = await fetch('/api/analysis-report', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (!response.ok) {
          if (response.status === 401) {
            setError('認証されていません。ログインしてください。');
            return;
          }
          throw new Error('レポート一覧の取得に失敗しました');
        }

        const data = await response.json();
        setReports(data);
      } catch (err) {
        console.error('レポートの取得中にエラーが発生しました:', err);
        toast({
          variant: "destructive",
          title: "エラー",
          description: "レポート一覧の取得に失敗しました",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchReports();

    // リアルタイム購読を設定
    const subscription = supabaseClient
      .channel('analysis_reports')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'analysis_reports'
        },
        async (payload) => {
          // ユーザーIDを取得
          const { userId } = await getCurrentUserId();
          if (!userId) return;

          // 現在のユーザーのレポートの変更のみを処理
          if (payload.eventType === 'INSERT') {
            const newReport = payload.new as AnalysisReport;
            if (newReport.userId === userId) {
              setReports((prev) => {
                // 重複を避けるために既存のレポートをチェック
                const exists = prev.some(report => report.id === newReport.id);
                if (exists) return prev;
                return [newReport, ...prev].sort((a, b) =>
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
              });
            }
          } else if (payload.eventType === 'DELETE') {
            setReports((prev) =>
              prev.filter((report) => report.id !== payload.old.id)
            );
          } else if (payload.eventType === 'UPDATE') {
            const updatedReport = payload.new as AnalysisReport;
            if (updatedReport.userId === userId) {
              setReports((prev) => {
                const updated = prev.map((report) =>
                  report.id === updatedReport.id ? { ...report, ...updatedReport } : report
                );
                return updated.sort((a, b) =>
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [toast]);

  const handleEdit = (report: AnalysisReport) => {
    setEditingReportId(report.id);
    setEditingTitle(report.title);
  };

  const handleSaveEdit = async (reportId: string) => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('認証が必要です');
      }

      const response = await fetch(`/api/analysis-report/${reportId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ title: editingTitle })
      });

      if (!response.ok) {
        throw new Error('レポートの更新に失敗しました');
      }

      setEditingReportId(null);
      toast({
        title: "成功",
        description: "レポートのタイトルを更新しました",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
      toast({
        variant: "destructive",
        title: "エラー",
        description: "レポートの更新に失敗しました",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingReportId(null);
    setEditingTitle('');
  };

  const handleEditKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      if (editingReportId) {
        handleSaveEdit(editingReportId);
      }
    } else if (event.key === 'Escape') {
      handleCancelEdit();
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

      toast({
        title: "成功",
        description: "レポートを削除しました",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
      toast({
        variant: "destructive",
        title: "エラー",
        description: "レポートの削除に失敗しました",
      });
    }
  };

  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold">AI分析レポート一覧</h2>
        <button
          type="button"
          onClick={onCreateReportClick}
          className="ml-2 flex items-center justify-center w-8 h-8 rounded bg-blue-500 hover:bg-blue-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="新規レポート作成"
          disabled={isGenerating}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
      <div className="overflow-y-auto h-[calc(100vh-4rem)]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2Icon className="w-10 h-10 animate-spin text-blue-500" />
          </div>
        ) : error ? (
          <div className="p-4 text-red-500">{error}</div>
        ) : reports.length === 0 ? (
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
                  {editingReportId === report.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={handleEditKeyDown}
                        className="flex-1"
                        autoFocus
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSaveEdit(report.id)}
                        className="text-green-500 hover:text-green-600"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCancelEdit}
                        className="text-gray-500 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => onSelectReport(report.id)}
                        className="flex-1 text-left"
                      >
                        <div className="font-medium flex items-center gap-2">
                          {report.title}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(report.createdAt).toLocaleString()}
                        </div>
                      </button>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(report)}
                          className="text-gray-500 hover:text-blue-500"
                          disabled={isGenerating}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(report.id)}
                          className="text-gray-500 hover:text-red-500"
                          disabled={isGenerating}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
