'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ChatHistoryItem } from '@/types/chat';

interface ChatSidebarProps {
  onSelectChat: (chatId: string | null) => void;
  currentChatId: string | null;
}

export function ChatSidebar({ onSelectChat, currentChatId }: ChatSidebarProps) {
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChatHistory = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/chat-history');
        
        if (!response.ok) {
          throw new Error('チャット履歴の取得に失敗しました');
        }
        
        const data = await response.json();
        if (!data.chatHistory || !Array.isArray(data.chatHistory)) {
          throw new Error('チャット履歴の形式が不正です');
        }
        setChatHistory(data.chatHistory);
      } catch (err) {
        setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
        setChatHistory([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChatHistory();
  }, []);

  const handleNewChat = () => {
    onSelectChat(null);
  };

  const handleSelectChat = (chatId: string) => {
    onSelectChat(chatId);
  };

  const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    
    if (!confirm('このチャットを削除してもよろしいですか？')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/chat-history?chatId=${chatId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('チャットの削除に失敗しました');
      }
      
      setChatHistory(chatHistory.filter(chat => chat.chatId !== chatId));
      
      if (currentChatId === chatId) {
        onSelectChat(null);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '不明なエラーが発生しました');
    }
  };

  return (
    <div className="flex flex-col h-full border-r">
      <div className="p-4 border-b">
        <Button 
          onClick={handleNewChat} 
          className="w-full flex items-center justify-center gap-2"
          variant="outline"
        >
          <Plus size={16} />
          新規チャット
        </Button>
      </div>
      
      <ScrollArea className="flex-1 p-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        ) : chatHistory.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-muted-foreground">チャット履歴がありません</p>
          </div>
        ) : (
          <div className="space-y-2">
            {chatHistory.map((chat) => (
              <div
                key={chat.chatId}
                className={`p-3 rounded-md cursor-pointer hover:bg-accent transition-colors ${
                  currentChatId === chat.chatId ? 'bg-accent' : ''
                }`}
                onClick={() => handleSelectChat(chat.chatId)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{chat.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(chat.lastMessageAt), 'yyyy/MM/dd HH:mm', { locale: ja })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={(e) => handleDeleteChat(e, chat.chatId)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
} 