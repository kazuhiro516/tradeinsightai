'use client';

import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

interface AnalysisReportProps {
  report: string | null;
  error: string | null;
  noReportsMessage?: string;
}

export default function AnalysisReport({
  report,
  error,
  noReportsMessage = "分析レポートが存在しません。「新しいレポート」ボタンをクリックして、新しいレポートを作成してください。"
}: AnalysisReportProps) {
  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 p-4 rounded-lg">
          {error}
        </div>
      )}
      {report && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown
              rehypePlugins={[rehypeRaw]}
              components={{
                // マークダウンテーブルのスタイリング
                table: ({...props}) => (
                  <div className="overflow-x-auto my-4">
                    <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700" {...props} />
                  </div>
                ),
                thead: ({...props}) => <thead className="bg-gray-50 dark:bg-gray-800" {...props} />,
                tbody: ({...props}) => <tbody className="divide-y divide-gray-200 dark:divide-gray-700" {...props} />,
                th: ({...props}) => <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" {...props} />,
                td: ({...props}) => <td className="px-3 py-2 whitespace-nowrap text-sm" {...props} />,
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
      {!report && !error && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 text-center">
          <p className="text-gray-600 dark:text-gray-400 my-8">{noReportsMessage}</p>
        </div>
      )}
    </div>
  );
}
