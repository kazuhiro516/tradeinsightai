"use client";

import { useChat, type UseChatOptions } from "@ai-sdk/react";
import { useState, FC, useEffect, useRef } from "react";
import { Send, Filter, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { TradeFilter } from '@/types/trade';

import FilterModal from "./FilterModal";
import { PAGINATION } from "@/constants/pagination";

const Home: FC = () => {
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

  // キー入力時の処理を追加
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading && !isTyping) {
        const formEvent = new Event('submit', { bubbles: true, cancelable: true }) as unknown as React.FormEvent<HTMLFormElement>;
        onSubmit(formEvent);
      }
    }
  };

  // textareaの高さを自動調整
  const adjustTextareaHeight = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 400)}px`; // 最大高さを400pxに制限
  };

  // モーダルで「適用」ボタンを押したときに受け取るコールバック
  const handleApplyFilter = (filter: TradeFilter) => {
    // フィルターオブジェクトをJSON文字列化して、チャット入力欄に代入
    setInput(`filter: ${JSON.stringify(filter, null, 2)}`);
  };

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900">
      {/* メッセージ一覧 - スクロール可能なエリア */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 max-w-2xl w-full">
              <div className="flex justify-center mb-6">
                <AlertCircle className="h-12 w-12 text-yellow-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">一時チャット</h1>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                このチャットが閉じられたり、メモリから破棄されたり、ページが更新されると、
                メッセージは保存されません。
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                質問を入力して、取引データについて相談してください。
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.map(message => (
              <div key={message.id} className={`p-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-100 dark:bg-blue-900 ml-12'
                  : 'bg-gray-50 dark:bg-gray-800 mr-12'
              }`}>
                <div className="font-bold mb-1 text-gray-900 dark:text-white">
                  {message.role === 'user' ? 'あなた' : 'AI'}:
                </div>
                <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                  {message.parts?.map((part, i) => {
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
                              className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300 mb-1 hover:text-gray-900 dark:hover:text-white focus:outline-none w-full border border-gray-200 dark:border-gray-600 p-2 rounded"
                            >
                              <span className="text-left">
                                ツール呼び出し: {part.toolInvocation.toolName}
                              </span>
                              <span>
                                {isExpanded ? (
                                  <ChevronUp size={16} />
                                ) : (
                                  <ChevronDown size={16} />
                                )}
                              </span>
                            </button>

                            {isExpanded && (
                              <pre className="bg-gray-100 dark:bg-gray-700 p-2 rounded text-xs overflow-auto text-gray-800 dark:text-gray-200">
                                {JSON.stringify(part.toolInvocation, null, 2)}
                              </pre>
                            )}
                          </div>
                        );
                    }
                  })}
                </div>
              </div>
            ))}

            {/* 入力中表示 */}
            {(isLoading || isTyping) && (
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 mr-12 max-w-3xl mx-auto">
                <div className="font-bold mb-1 text-gray-900 dark:text-white">AI:</div>
                <div className="animate-pulse text-gray-800 dark:text-gray-200">応答を生成中...</div>
              </div>
            )}

            {/* エラー表示 */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-200 max-w-3xl mx-auto">
                <div className="font-bold mb-1">エラー:</div>
                <div>{error}</div>
              </div>
            )}

            {/* 自動スクロール用の参照ポイント */}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 入力欄 - 常に下部に固定 */}
      <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4">
        <form onSubmit={onSubmit} className="flex space-x-2 max-w-3xl mx-auto">
          {/* フィルターアイコン */}
          <button
            type="button"
            onClick={() => setShowFilterModal(true)}
            className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 self-end"
          >
            <Filter className="w-5 h-5" />
          </button>

          {/* テキスト入力 */}
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => {
                handleInputChange(e);
                adjustTextareaHeight(e);
              }}
              onKeyDown={handleKeyDown}
              placeholder="メッセージを入力..."
              className="w-full p-2 border rounded-lg resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              style={{ minHeight: '44px' }}
              disabled={isLoading || isTyping}
            />
          </div>

          {/* 送信ボタン */}
          <button
            type="submit"
            disabled={!input.trim() || isLoading || isTyping}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed self-end"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>

      {/* フィルターモーダル */}
      <FilterModal
        currentFilter={{
          type: 'all',
          items: [],
          page: PAGINATION.DEFAULT_PAGE,
          pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
          sortBy: 'openTime',
          sortOrder: 'desc'
        }}
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleApplyFilter}
      />
    </div>
  );
};

export default Home;
