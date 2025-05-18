// app/(適切なフォルダ)/Chat.tsx
"use client";

import { useChat, type UseChatOptions } from "@ai-sdk/react";
import { useState, FC, useEffect, useRef } from "react";
import { Send, Filter, ChevronDown, ChevronUp, User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { TradeFilter } from '@/types/trade';

import FilterModal from "./FilterModal";
import { PAGINATION } from "@/constants/pagination";

const Chat: FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [expandedTools, setExpandedTools] = useState<{[key: string]: boolean}>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // useChatフック
  const {
    messages,
    input,
    handleInputChange,
    setInput,
    handleSubmit,
    isLoading,
  } = useChat({
    api: "/api/chat",
    onError: (error) => {
      console.error("Chat error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage || "エラーが発生しました");
    },
    onResponse: (response) => {
      if (!response.ok) {
        setError(`APIエラー: ${response.status}`);
        return;
      }
      setError(null); // エラーをクリア
    },
  } as UseChatOptions);

  // トグル機能の切り替え
  const toggleToolDetail = (messageId: string, partIndex: number) => {
    const key = `${messageId}-${partIndex}`;
    setExpandedTools(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // 新しいメッセージが追加されたら自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 送信ボタン押下時
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsTyping(true);
    try {
      await handleSubmit(e);
    } catch (err) {
      console.error("Submit error:", err);
      setError("メッセージの送信に失敗しました");
    } finally {
      setIsTyping(false);
    }
  };

  // モーダルで「適用」ボタンを押したときに受け取るコールバック
  const handleApplyFilter = (filter: TradeFilter) => {
    // フィルターオブジェクトをJSON文字列化して、チャット入力欄に代入
    setInput(`filter: ${JSON.stringify(filter, null, 2)}`);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* メッセージ一覧 - スクロール可能なエリア */}
      <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 space-y-3 sm:space-y-4">
        {messages.map(message => (
          <div key={message.id} className={cn(
            "max-w-2xl w-full mx-auto flex",
            message.role === 'user' ? 'justify-end' : 'justify-start'
          )}>
            <div className={cn(
              "flex items-end gap-2 w-full",
              message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            )}>
              {/* アイコン */}
              <div className="flex-shrink-0">
                {message.role === 'user' ? (
                  <User className="w-7 h-7 text-blue-500 bg-blue-100 dark:bg-blue-900 rounded-full p-1" />
                ) : (
                  <Bot className="w-7 h-7 text-green-600 bg-green-100 dark:bg-green-900 rounded-full p-1" />
                )}
              </div>
              {/* メッセージバブル */}
              <div className={cn(
                "rounded-2xl px-4 py-3 shadow-sm text-sm sm:text-base whitespace-pre-wrap break-words",
                message.role === 'user'
                  ? 'bg-blue-50 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                  : 'bg-white dark:bg-gray-800 border border-border text-gray-900 dark:text-gray-100'
              )}>
                <div className="font-semibold mb-1 flex items-center gap-1">
                  {message.role === 'user' ? 'あなた' : 'AI'}
                </div>
                <div>{message.parts?.map((part, i) => {
                  const toolKey = `${message.id}-${i}`;
                  const isExpanded = expandedTools[toolKey] || false;
                  switch (part.type) {
                    case 'text':
                      return <div key={toolKey}>{part.text}</div>;
                    case 'tool-invocation':
                      return (
                        <div key={toolKey} className="my-2">
                          <button
                            onClick={() => toggleToolDetail(message.id, i)}
                            className="flex items-center justify-between text-xs sm:text-sm text-gray-600 mb-1 hover:text-gray-900 focus:outline-none w-full border border-gray-200 p-1.5 sm:p-2 rounded"
                          >
                            <span className="text-left truncate">
                              ツール呼び出し: {part.toolInvocation.toolName}
                            </span>
                            <span className="flex-shrink-0 ml-2">
                              {isExpanded ? (
                                <ChevronUp size={16} />
                              ) : (
                                <ChevronDown size={16} />
                              )}
                            </span>
                          </button>
                          {isExpanded && (
                            <pre className="bg-gray-100 dark:bg-gray-900 p-2 rounded text-xs overflow-auto max-h-[300px]">
                              {JSON.stringify(part.toolInvocation, null, 2)}
                            </pre>
                          )}
                        </div>
                      );
                  }
                })}</div>
              </div>
            </div>
          </div>
        ))}

        {/* 入力中表示 */}
        {(isLoading || isTyping) && (
          <div className="max-w-2xl w-full mx-auto flex justify-start">
            <div className="flex items-end gap-2">
              <Bot className="w-7 h-7 text-green-600 bg-green-100 dark:bg-green-900 rounded-full p-1" />
              <div className="rounded-2xl px-4 py-3 shadow-sm bg-white dark:bg-gray-800 border border-border text-gray-900 dark:text-gray-100 text-sm sm:text-base animate-pulse">
                <div className="font-semibold mb-1 flex items-center gap-1">AI</div>
                <div>応答を生成中...</div>
              </div>
            </div>
          </div>
        )}

        {/* エラー表示 */}
        {error && (
          <div className="max-w-2xl w-full mx-auto flex justify-center">
            <div className="rounded-2xl px-4 py-3 shadow-sm bg-red-100 text-red-700 text-sm sm:text-base">
              <div className="font-semibold mb-1">エラー:</div>
              <div>{error}</div>
            </div>
          </div>
        )}

        {/* 自動スクロール用の参照ポイント */}
        <div ref={messagesEndRef} />
      </div>

      {/* 入力欄 - 常に下部に固定 */}
      <div className="bg-white dark:bg-gray-900 border-t border-border p-2 sm:p-4">
        <form onSubmit={onSubmit} className="flex items-end gap-2 max-w-2xl mx-auto">
          {/* フィルターアイコン */}
          <button
            type="button"
            onClick={() => setShowFilterModal(true)}
            className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
            aria-label="フィルターを開く"
          >
            <Filter className="w-5 h-5" />
          </button>

          {/* テキスト入力 */}
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="メッセージを入力..."
            className="flex-1 p-2 rounded-lg border border-input bg-background text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm sm:text-base"
            disabled={isLoading || isTyping}
            aria-label="メッセージ入力"
          />

          {/* 送信ボタン */}
          <button
            type="submit"
            disabled={isLoading || isTyping || !input.trim()}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400"
            aria-label="送信"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>

      {/* フィルターモーダル */}
      <FilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleApplyFilter}
        currentFilter={{
          type: 'all',
          items: [],
          page: PAGINATION.DEFAULT_PAGE,
          pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
          sortBy: 'openTime',
          sortOrder: 'desc'
        }}
      />
    </div>
  );
};

export default Chat;
