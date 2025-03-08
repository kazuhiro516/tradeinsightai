// app/(適切なフォルダ)/MessageList.tsx
"use client";
import { UIMessage } from "ai";
import React from "react";

interface MessageListProps {
  messages: UIMessage[];
  error: string | null;
  isTyping: boolean;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  error,
  isTyping,
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((m) => (
        <div
          key={m.id}
          className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[70%] rounded-lg p-3 ${
              m.role === "user"
                ? "bg-blue-500 text-white"
                : "bg-white text-gray-800"
            }`}
          >
            {m.content}
          </div>
        </div>
      ))}

      {/* エラー表示 */}
      {error && (
        <div className="flex justify-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      )}

      {/* AIの入力中 */}
      {isTyping && (
        <div className="flex justify-start">
          <div className="bg-white text-gray-800 rounded-lg p-3">AIが入力中...</div>
        </div>
      )}
    </div>
  );
};

export default MessageList;
