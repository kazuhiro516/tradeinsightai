'use client';

import { TradeFilter } from '@/types/trade';
import { formatJST } from '@/utils/date';
import { Button } from './ui/button';
import { Loader2, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface AnalysisReportProps {
  filter: TradeFilter;
  report: string | null;
  loading: boolean;
  error: string | null;
  onGenerateReport: () => Promise<void>;
}

export default function AnalysisReport({
  filter,
  report,
  loading,
  error,
  onGenerateReport
}: AnalysisReportProps) {
  const downloadPDF = () => {
    if (!report) return;

    const doc = new jsPDF();
    const margin = 20;
    const lineHeight = 7;
    let y = margin;

    // タイトル
    doc.setFontSize(16);
    doc.text('トレード分析レポート', margin, y);
    y += lineHeight * 2;

    // 期間
    doc.setFontSize(12);
    let periodText = '分析期間: ';
    if (filter.startDate && filter.endDate) {
      periodText += `${formatJST(filter.startDate)} 〜 ${formatJST(filter.endDate)}`;
    } else if (filter.startDate) {
      periodText += `${formatJST(filter.startDate)} 以降`;
    } else if (filter.endDate) {
      periodText += `${formatJST(filter.endDate)} まで`;
    } else {
      periodText += '全期間';
    }
    doc.text(periodText, margin, y);
    y += lineHeight * 2;

    // レポート本文
    doc.setFontSize(11);
    const lines = report.split('\n');
    lines.forEach(line => {
      if (y > 280) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    });

    // PDFをダウンロード
    doc.save('trade-analysis-report.pdf');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">AI分析レポート</h2>
        <div className="space-x-2">
          <Button
            onClick={onGenerateReport}
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
          {report && (
            <Button
              onClick={downloadPDF}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              PDFダウンロード
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 p-4 rounded-lg">
          {error}
        </div>
      )}

      {report && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <div className="prose dark:prose-invert max-w-none">
            {report.split('\n').map((line, i) => (
              <p key={i} className="mb-2">
                {line}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
