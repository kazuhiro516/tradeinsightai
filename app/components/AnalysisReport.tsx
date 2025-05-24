'use client';

import { Button } from './ui/button';
import { Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { Input } from './ui/input';
import { useState } from 'react';

interface AnalysisReportProps {
  report: string | null;
  loading: boolean;
  error: string | null;
  onGenerateReport: (title: string) => Promise<void>;
}

export default function AnalysisReport({
  report,
  loading,
  error,
  onGenerateReport
}: AnalysisReportProps) {
  const [title, setTitle] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onGenerateReport(title);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">AI分析レポート</h2>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            type="text"
            placeholder="レポートのタイトル"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-64"
          />
          <Button
            type="submit"
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                生成中...
              </>
            ) : (
              'レポート生成'
            )}
          </Button>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 p-4 rounded-lg">
          {error}
        </div>
      )}

      {report && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
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
    </div>
  );
}
