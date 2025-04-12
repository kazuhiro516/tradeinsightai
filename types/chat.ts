export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

export interface ChatHistoryItem {
  chatId: string;
  title: string;
  lastMessageAt: string;
} 