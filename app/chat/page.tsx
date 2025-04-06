'use client';

import { useState, useEffect, useRef } from 'react';
import { useChat } from '@/hooks/useChat';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { Card } from '@/app/components/ui/card';
import { ChatSidebar } from '@/app/components/chat/ChatSidebar';
import { Message } from '@/types/chat';

export default function ChatPage() {
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    chatId: currentChatId
  });

  const fetchChatHistory = async (chatId: string) => {
    try {
      setIsLoadingHistory(true);
      setError(null);
      const response = await fetch(`/api/chat-history?chatId=${chatId}`);
      if (!response.ok) {
        throw new Error('チャット履歴の取得に失敗しました');
      }
      const data = await response.json();
      return data.messages;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      return [];
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (currentChatId) {
      fetchChatHistory(currentChatId);
    }
  }, [currentChatId]);

  const handleSelectChat = (chatId: string | null) => {
    setCurrentChatId(chatId);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex h-screen">
      <ChatSidebar
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
      />
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <p className="text-red-500">{error}</p>
              <Button
                onClick={() => currentChatId && fetchChatHistory(currentChatId)}
                variant="outline"
              >
                再試行
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message: Message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <Card className={`max-w-[80%] p-4 ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100'
                  }`}>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </Card>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        <div className="p-4 border-t">
          <form onSubmit={handleSubmit} className="flex space-x-4">
            <Textarea
              value={input}
              onChange={handleInputChange}
              placeholder="メッセージを入力..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              送信
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
} 