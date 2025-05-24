import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { createClient } from '@/utils/supabase/client';

interface AnalysisReportDetailProps {
  reportId: string | null;
}

export default function AnalysisReportDetail({ reportId }: AnalysisReportDetailProps) {
  const [report, setReport] = useState<{
    title: string;
    content: string;
    createdAt: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      if (!reportId) {
        setReport(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.access_token) {
          throw new Error('認証が必要です');
        }

        const response = await fetch(`/api/analysis-report/${reportId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (!response.ok) {
          throw new Error('レポートの取得に失敗しました');
        }

        const data = await response.json();
        setReport(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportId]);

  if (!reportId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        レポートを選択してください
      </div>
    );
  }

  if (loading) {
    return <div className="p-4">読み込み中...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  if (!report) {
    return <div className="p-4">レポートが見つかりませんでした</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">{report.title}</h1>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {new Date(report.createdAt).toLocaleString()}
          </div>
        </div>
        <div className="prose dark:prose-invert max-w-none">
          <ReactMarkdown
            rehypePlugins={[rehypeRaw]}
            components={{
              table: ({...props}) => (
                <div className="overflow-x-auto my-4">
                  <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700" {...props} />
                </div>
              ),
              thead: ({...props}) => <thead className="bg-gray-50 dark:bg-gray-800" {...props} />,
              tbody: ({...props}) => <tbody className="divide-y divide-gray-200 dark:divide-gray-700" {...props} />,
              th: ({...props}) => <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" {...props} />,
              td: ({...props}) => <td className="px-3 py-2 whitespace-nowrap text-sm" {...props} />,
              code: ({className, children, ...props}) => {
                return (
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-md p-1">
                    <pre className="overflow-auto p-2 text-sm">
                      <code className={className} {...props}>{children}</code>
                    </pre>
                  </div>
                );
              }
            }}
          >
            {report.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
