'use client';

import { useState } from 'react';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Button } from '@/app/components/ui/button';

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
  metadata?: {
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
  };
}

interface ChatMessageProps {
  message: DisplayMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [isToolResultExpanded, setIsToolResultExpanded] = useState(false);
  const hasToolResults = message.metadata?.toolCallResult &&
    message.metadata.toolCallResult.data.records &&
    message.metadata.toolCallResult.data.records.length > 0;

  // デバッグログ
  console.log('ChatMessage metadata:', message.metadata);
  console.log('hasToolResults:', hasToolResults);

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
        <div className="flex-1">
          <div className={`whitespace-pre-wrap ${
            message.role === 'user'
              ? 'p-4 bg-primary text-primary-foreground rounded-lg'
              : ''
          }`}>
            {message.content}
          </div>

          {hasToolResults && (
            <div className="mt-4">
              <Button
                variant="ghost"
                className="w-full flex items-center justify-between p-2 hover:bg-muted/30 rounded-lg text-xs text-muted-foreground"
                onClick={() => setIsToolResultExpanded(!isToolResultExpanded)}
              >
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  <span>取引データの検索結果（{message.metadata?.toolCallResult?.data.total || 0}件）</span>
                </div>
                {isToolResultExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>

              {isToolResultExpanded && (
                <div className="overflow-x-auto bg-muted/10 rounded-lg p-4 mt-2">
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
                      {message.metadata?.toolCallResult?.data.records.map((record, index) => (
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
      </div>
    </div>
  );
}
