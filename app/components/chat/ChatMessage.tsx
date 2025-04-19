'use client';

import { Search } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
  toolCallResult?: {
    type: 'trade_records';
    data: {
      records: Array<{
        openTime: string;
        type: string;
        item: string;
        size: number;
        openPrice: number;
        closePrice: number;
        profit: number;
      }>;
      total: number;
    };
  };
}

interface ChatMessageProps {
  message: DisplayMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
  // メッセージの内容を表示する関数
  const renderContent = () => {
    // 特別なマーカーでツール呼び出しを検出
    const hasToolCallMarker = message.content.includes('[取引データの検索を実行しました]');

    // 通常のテキスト表示
    if (!hasToolCallMarker) {
      return <div className="whitespace-pre-wrap">{message.content}</div>;
    }

    // ツール呼び出しマーカーを分離して表示
    const parts = message.content.split('[取引データの検索を実行しました]');
    return (
      <div className="space-y-4">
        <div className="whitespace-pre-wrap">{parts[0]}</div>

        {parts.length > 1 && message.toolCallResult && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg">
              <Search className="h-4 w-4" />
              <span>取引データの検索を実行しました（{message.toolCallResult.data.total}件）</span>
            </div>

            {message.toolCallResult.data.records.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/30">
                      <th className="p-2 text-left">日時</th>
                      <th className="p-2 text-left">種類</th>
                      <th className="p-2 text-left">通貨ペア</th>
                      <th className="p-2 text-right">ロット</th>
                      <th className="p-2 text-right">始値</th>
                      <th className="p-2 text-right">終値</th>
                      <th className="p-2 text-right">損益</th>
                    </tr>
                  </thead>
                  <tbody>
                    {message.toolCallResult.data.records.map((record, index) => (
                      <tr key={index} className="border-b border-muted/20">
                        <td className="p-2">
                          {format(new Date(record.openTime), 'yyyy/MM/dd HH:mm', { locale: ja })}
                        </td>
                        <td className="p-2">{record.type === 'buy' ? '買' : '売'}</td>
                        <td className="p-2">{record.item}</td>
                        <td className="p-2 text-right">{record.size.toFixed(2)}</td>
                        <td className="p-2 text-right">{record.openPrice.toFixed(3)}</td>
                        <td className="p-2 text-right">{record.closePrice.toFixed(3)}</td>
                        <td className={`p-2 text-right ${record.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {record.profit.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full py-8 px-4">
      <div className="w-full max-w-3xl mx-auto flex gap-4">
        <div className={`w-8 h-8 rounded-sm flex items-center justify-center shrink-0 ${
          message.role === 'assistant'
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        }`}>
          {message.role === 'assistant' ? 'AI' : '👤'}
        </div>
        <div className={`flex-1 space-y-2 ${
          message.role === 'user'
            ? 'p-4 bg-primary text-primary-foreground rounded-lg'
            : ''
        }`}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
