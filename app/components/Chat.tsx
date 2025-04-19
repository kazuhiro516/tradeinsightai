// app/(適切なフォルダ)/Chat.tsx
"use client";

import { useChat, type UseChatOptions } from "@ai-sdk/react";
import { useState, FC, useEffect, useRef } from "react";
import { Send, Filter, ChevronDown, ChevronUp } from "lucide-react";

import FilterModal from "./FilterModal";

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
      console.log("API response status:", response.status);
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
  const handleApplyFilter = (filter: Record<string, unknown>) => {
    // フィルターオブジェクトをJSON文字列化して、チャット入力欄に代入
    setInput(`filter: ${JSON.stringify(filter, null, 2)}`);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* メッセージ一覧 - スクロール可能なエリア */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
          <div key={message.id} className={`p-3 rounded-lg ${
            message.role === 'user' ? 'bg-blue-100 ml-12' : 'bg-white mr-12'
          }`}>
            <div className="font-bold mb-1">
              {message.role === 'user' ? 'あなた' : 'AI'}:
            </div>
            <div className="whitespace-pre-wrap">
              {message.parts?.map((part, i) => {
                const toolKey = `${message.id}-${i}`;
                const isExpanded = expandedTools[toolKey] || false;

                console.log('isExpanded:', isExpanded);

                switch (part.type) {
                  case 'text':
                    return <div key={toolKey}>{part.text}</div>;
                  case 'tool-invocation':
                    return (
                      <div key={toolKey} className="my-2">
                        <button
                          onClick={() => toggleToolDetail(message.id, i)}
                          className="flex items-center justify-between text-xs text-gray-600 mb-1 hover:text-gray-900 focus:outline-none w-full border border-gray-200 p-2 rounded"
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
                          <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
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
          <div className="p-3 rounded-lg bg-white mr-12">
            <div className="font-bold mb-1">AI:</div>
            <div className="animate-pulse">応答を生成中...</div>
          </div>
        )}

        {/* エラー表示 */}
        {error && (
          <div className="p-3 rounded-lg bg-red-100 text-red-700">
            <div className="font-bold mb-1">エラー:</div>
            <div>{error}</div>
          </div>
        )}

        {/* 自動スクロール用の参照ポイント */}
        <div ref={messagesEndRef} />
      </div>

      {/* 入力欄 - 常に下部に固定 */}
      <div className="bg-white border-t p-4">
        <form onSubmit={onSubmit} className="flex space-x-2">
          {/* フィルターアイコン */}
          <button
            type="button"
            onClick={() => setShowFilterModal(true)}
            className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            <Filter className="w-5 h-5" />
          </button>

          {/* テキスト入力 */}
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="メッセージを入力..."
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading || isTyping}
          />

          {/* 送信ボタン */}
          <button
            type="submit"
            disabled={isLoading || isTyping || !input.trim()}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>

      {/* フィルターモーダル */}
      <FilterModal
        type="chat"
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleApplyFilter}
      />
    </div>
  );
};

export default Chat;
