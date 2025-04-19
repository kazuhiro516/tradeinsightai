/**
 * チャットメッセージの型定義
 */
import { TradeRecordsResponse } from './trade';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
  metadata?: {
    toolCallResult?: {
      type: 'trade_records';
      data: TradeRecordsResponse;
    };
  };
}

/**
 * チャットルームの型定義
 */
export interface ChatRoom {
  id: string;
  title: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * チャット履歴アイテムの型定義
 */
export interface ChatHistoryItem {
  chatId: string;
  title: string;
  lastMessageAt: string;
}

/**
 * チャットAPIレスポンスの型定義
 */
export interface ChatApiResponse {
  message?: string;
  error?: string;
  details?: string;
  hasToolCalls?: boolean;
}

export interface ChatThread {
  id: string;
  messages: ChatMessage[];
}
