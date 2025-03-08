// app/(適切なフォルダ)/Chat.tsx
"use client";

import { useChat, type UseChatOptions } from "@ai-sdk/react";
import { useState, FC } from "react";
import { Send, Filter } from "lucide-react";

import MessageList from "./MessageList";
import FilterModal from "./FilterModal";

const Chat: FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // useChatフック
  const {
    messages,
    input,
    handleInputChange,
    setInput, // フィルターからの文字列を直接入力欄に反映したい場合に使用
    handleSubmit,
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
  const handleApplyFilter = (filter: Record<string, any>) => {
    // フィルターオブジェクトをJSON文字列化して、チャット入力欄に代入
    setInput(`filter: ${JSON.stringify(filter, null, 2)}`);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* メッセージ一覧 */}
      <MessageList messages={messages} error={error} isTyping={isTyping} />

      {/* 入力欄 */}
      <div className="p-4 bg-white border-t">
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
          />

          {/* 送信ボタン */}
          <button
            type="submit"
            disabled={isTyping}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
      />
    </div>
  );
};

export default Chat;
