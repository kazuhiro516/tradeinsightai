// app/(適切なフォルダ)/MessageList.tsx
"use client";
import { UIMessage } from "ai";
import React from "react";
import { ChatMessage } from "./chat/ChatMessage";

interface MessageListProps {
  messages: UIMessage[];
  error: string | null;
  isTyping: boolean;
}

// ChatMessage.tsxのDisplayMessage型をローカルで再定義
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

const toDisplayMessage = (m: UIMessage): DisplayMessage | null => {
  if (m.role !== 'user' && m.role !== 'assistant') return null;
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    createdAt: m.createdAt ? (typeof m.createdAt === 'string' ? m.createdAt : m.createdAt.toISOString()) : undefined,
    // metadata等が必要な場合はここで変換
  };
};

const MessageList: React.FC<MessageListProps> = ({
  messages,
  error,
  isTyping,
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((m) => {
        const msg = toDisplayMessage(m);
        if (!msg) return null;
        return <ChatMessage key={msg.id} message={msg} />;
      })}

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
