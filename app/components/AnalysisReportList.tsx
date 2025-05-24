import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Trash2, Edit2, Check, X, Menu } from 'lucide-react';
import { Plus } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { supabaseClient } from '@/utils/supabase/realtime';
import { checkAuthAndSetSession, getCurrentUserId } from '@/utils/auth';
import { formatJST } from '@/utils/date';
import { Skeleton } from './ui/Skeleton';
import { cn } from '@/lib/utils';

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
  className?: string;
}

export default function AnalysisReportList({
  onSelectReport,
  selectedReportId,
  onCreateReportClick,
  isGenerating = false,
  className = ''
}: AnalysisReportListProps) {
  const [reports, setReports] = useState<AnalysisReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [isOpen, setIsOpen] = useState(false);
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
        // 作成日時の降順でソート
        const sortedData = data.sort((a: AnalysisReport, b: AnalysisReport) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setReports(sortedData);

        // 最新のレポートが存在する場合、自動的に選択する
        if (sortedData.length > 0 && !selectedReportId) {
          onSelectReport(sortedData[0].id);
        }
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

                const updatedReports = [newReport, ...prev].sort((a, b) =>
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );

                // 新しく追加されたレポートが最新の場合、自動的に選択する
                if (updatedReports.length > 0 && updatedReports[0].id === newReport.id) {
                  onSelectReport(newReport.id);
                }

                return updatedReports;
              });
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedReportId = payload.old.id;

            setReports((prev) => {
              const updatedReports = prev.filter((report) => report.id !== deletedReportId);

              // 削除されたレポートが現在選択中のレポートだった場合、最新のレポートを選択
              if (selectedReportId === deletedReportId && updatedReports.length > 0) {
                onSelectReport(updatedReports[0].id);
              }

              return updatedReports;
            });
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
  }, [toast, selectedReportId, onSelectReport]);

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
    <>
      {/* SP版のトグルボタン */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Menu className="h-6 w-6" />
      </Button>

      {/* オーバーレイ */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* サイドバー */}
      <div
        className={cn(
          'fixed md:relative inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-200 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          className
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <Button
              onClick={onCreateReportClick}
              disabled={isGenerating}
              className="w-full justify-start gap-2"
              variant="outline"
            >
              <Plus className="h-4 w-4" />
              新しいレポート
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {error ? (
              <div className="p-4 text-red-500 dark:text-red-400">{error}</div>
            ) : reports.length === 0 ? (
              <div className="p-4 text-muted-foreground dark:text-gray-400">
              レポートがありません
              </div>
            ) : (
              <div className="space-y-1">
              {reports.map((report) => (
                <div
                key={report.id}
                onClick={() => {
                  onSelectReport(report.id);
                  setIsOpen(false); // SP版でレポート選択時にサイドバーを閉じる
                }}
                className={`group flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedReportId === report.id
                  ? 'bg-muted/50'
                  : 'hover:bg-muted/30'
                }`}
                >
                {editingReportId === report.id ? (
                  <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={handleEditKeyDown}
                    className="flex-1 bg-transparent border-none focus:outline-none"
                    autoFocus
                  />
                  <div className="flex items-center gap-1">
                    <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleSaveEdit(report.id)}
                    className="h-6 w-6"
                    >
                    <Check className="h-4 w-4" />
                    </Button>
                    <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleCancelEdit}
                    className="h-6 w-6"
                    >
                    <X className="h-4 w-4" />
                    </Button>
                  </div>
                  </div>
                ) : (
                  <>
                  <div className="flex-1 min-w-0">
                    <span className="block truncate">{report.title}</span>
                    <div className="text-xs text-muted-foreground mt-1">
                    <div className="truncate">
                      作成: {report.createdAt ? formatJST(report.createdAt) : ''}
                    </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(report);
                    }}
                    className="h-6 w-6"
                    >
                    <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(report.id);
                    }}
                    className="h-6 w-6"
                    >
                    <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  </>
                )}
                </div>
              ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
