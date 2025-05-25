'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { createClient } from '@/utils/supabase/client';

interface AnalysisReportProps {
  report?: string | null;
  error?: string | null;
  noReportsMessage?: string;
  reportId?: string | null;
}

export default function AnalysisReport({
  report: initialReport,
  error: initialError,
  reportId,
  noReportsMessage = "分析レポートが存在しません。「新しいレポート」ボタンをクリックして、新しいレポートを作成してください。"
}: AnalysisReportProps) {
  const [reportData, setReportData] = useState<{
    title?: string;
    content?: string;
    createdAt?: string;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(initialError || null);
  const [report, setReport] = useState<string | null>(initialReport || null);

  // コードフェンスで囲まれたテーブルを処理する関数
  const sanitizeMarkdownFences = (content: string | null): string | null => {
    if (!content) return null;

    // コードフェンス内のマークダウンテーブルを検出して処理
    return content.replace(/```(?:markdown|md)?\s*\n((?:\|[^\n]*\|\n)+)```/g, (_, tableContent) => {
      return tableContent;
    });
  };

  // initialErrorの変更を監視
  useEffect(() => {
    setError(initialError || null);
  }, [initialError]);

  useEffect(() => {
    // initialReportの変更を処理
    if (initialReport !== undefined) {
      setReport(initialReport);
    }
  }, [initialReport]);

  useEffect(() => {
    // reportIdが指定されている場合はAPIからデータを取得
    const fetchReport = async () => {
      if (!reportId) {
        setReportData(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log(`レポートIDからデータを取得します: ${reportId}`);

        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.access_token) {
          throw new Error('認証が必要です');
        }

        console.log(`APIリクエスト準備: /api/analysis-report/${reportId}`);
        const response = await fetch(`/api/analysis-report/${reportId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (!response.ok) {
          throw new Error(`レポートの取得に失敗しました (${response.status}: ${response.statusText})`);
        }

        const data = await response.json();
        console.log('APIからのレスポンス:', data);
        setReportData(data);
        setReport(data.content);
      } catch (err) {
        console.error('レポート取得エラー:', err);
        setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
        setReport(null);
      } finally {
        setLoading(false);
      }
    };

    // reportIdが存在する場合のみAPIからデータを取得
    if (reportId) {
      fetchReport();
    }
  }, [reportId]);
  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 p-4 rounded-lg">
          {error}
        </div>
      )}

      {report && (
        <div className="bg-white dark:bg-gray-800 px-2 sm:px-4 md:px-6 py-4 rounded-lg shadow-md">
          {reportData && (
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">{reportData.title}</h1>
              {reportData.createdAt && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(reportData.createdAt).toLocaleString()}
                </div>
              )}
            </div>
          )}
          <div className="prose dark:prose-invert max-w-none prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-hr:border-gray-300 dark:prose-hr:border-gray-700 prose-li:text-gray-700 dark:prose-li:text-gray-300">
            <ReactMarkdown
              rehypePlugins={[rehypeRaw]}
              remarkPlugins={[remarkGfm]}
              components={{
                // マークダウンテーブルのスタイリング
                table: ({...props}) => (
                  <div className="overflow-x-auto my-6 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700 border-collapse" {...props} />
                  </div>
                ),
                thead: ({...props}) => <thead className="bg-gray-50 dark:bg-gray-800" {...props} />,
                tbody: ({...props}) => <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800" {...props} />,
                tr: ({...props}) => <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors" {...props} />,
                th: ({...props}) => <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700" {...props} />,
                td: ({...props}) => <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 break-words" {...props} />,
                // コードブロックのスタイリング
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
              {report}
            </ReactMarkdown>
          </div>
        </div>
      )}
      {/* 分析レポートが一つも存在しない場合のメッセージ表示は AnalysisReportList 側に移動 */}
    </div>
  );
}
