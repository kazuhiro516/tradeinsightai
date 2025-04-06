'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { useChat } from '@/hooks/useChat';
import { ChatSidebar } from '@/app/components/chat/ChatSidebar';

export default function ChatPage() {
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat({
    chatId: currentChatId,
    initialMessages: chatMessages
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
      setChatMessages(data.messages || []);
      setMessages(data.messages || []);
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
    } else {
      setChatMessages([]);
      setMessages([]);
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
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoadingHistory ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <p className="text-red-500">{error}</p>
              <Button onClick={() => currentChatId && fetchChatHistory(currentChatId)}>再試行</Button>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <p>チャット履歴がありません</p>
              <p className="text-sm">新しいチャットを開始してください</p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-lg p-3 bg-muted">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 rounded-full bg-primary animate-bounce"></div>
                      <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </>
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