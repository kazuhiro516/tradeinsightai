'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { useRealtimeChat } from '@/hooks/useRealtimeChat';
import { ChatSidebar } from '@/app/components/chat/ChatSidebar';
import { ChatMessage } from '@/app/components/chat/ChatMessage';
import { supabaseClient } from '@/utils/supabase/realtime';
import { Send } from 'lucide-react';
import cuid from 'cuid';
import { checkAuthAndSetSession, getCurrentUserId } from '@/utils/auth';

/**
 * チャットページコンポーネント
 * チャット機能のメイン画面
 */
export default function ChatPage() {
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [hasAttemptedChatCreation, setHasAttemptedChatCreation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isLoading,
    error,
    sendMessage
  } = useRealtimeChat(currentChatId || '');

  // ページロード時に既存のチャットを確認し、なければ自動的にチャットルームを作成
  useEffect(() => {
    // ページの再レンダリングによる重複実行を防止するためのチェック
    if (hasAttemptedChatCreation) return;

    const checkExistingChatRoom = async () => {
      if (isCreatingChat) return;

      try {
        setIsCreatingChat(true);
        setHasAttemptedChatCreation(true);

        // 認証チェック
        const isAuthenticated = await checkAuthAndSetSession();
        if (!isAuthenticated) {
          setIsCreatingChat(false);
          return;
        }

        // ユーザーIDを取得
        const { userId } = await getCurrentUserId();
        if (!userId) {
          setIsCreatingChat(false);
          return;
        }

        // 既存のチャットルームを確認
        const { data: existingChats, error: fetchError } = await supabaseClient
          .from('chat_rooms')
          .select('*')
          .eq('userId', userId)
          .order('updatedAt', { ascending: false })
          .limit(1);

        if (fetchError) {
          setIsCreatingChat(false);
          return;
        }

        if (existingChats && existingChats.length > 0) {
          setCurrentChatId(existingChats[0].id);
          setIsCreatingChat(false);
          return;
        }

        // 既存のチャットルームがない場合は新規作成
        const now = new Date().toISOString();
        const newChatId = cuid();

        const { data, error } = await supabaseClient
          .from('chat_rooms')
          .insert({
            id: newChatId,
            title: '新しいチャット',
            userId,
            createdAt: now,
            updatedAt: now,
          })
          .select()
          .single();

        if (error) {
          setIsCreatingChat(false);
          return;
        }

        if (data) {
          setCurrentChatId(data.id);
        }
      } catch (err) {
        // エラーは無視します
      } finally {
        setIsCreatingChat(false);
      }
    };

    if (!currentChatId && !isCreatingChat) {
      checkExistingChatRoom();
    }
  }, [currentChatId, isCreatingChat, hasAttemptedChatCreation]);

  /**
   * チャットルームを選択する
   */
  const handleSelectChat = (chatId: string | null) => {
    setCurrentChatId(chatId);
  };

  /**
   * メッセージを送信する
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentChatId) return;

    try {
      await sendMessage(input);
      setInput('');
    } catch (err) {
      // エラーは表示されます
    }
  };

  /**
   * キーボードイベントを処理する
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        handleSubmit(e);
      }
    }
  };

  /**
   * テキストエリアの高さを自動調整
   */
  const adjustTextareaHeight = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`; // 最大高さを200pxに制限
  };

  /**
   * メッセージ一覧の最下部にスクロール
   */
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
          {isLoading || isCreatingChat ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <p className="text-red-500">{error}</p>
              <Button onClick={() => currentChatId && sendMessage(input)}>再試行</Button>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <p>メッセージを入力して会話を開始してください</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t">
          <form onSubmit={handleSubmit} className="flex space-x-4">
            <div className="flex-1 relative">
              <Textarea
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  adjustTextareaHeight(e);
                }}
                onKeyDown={handleKeyDown}
                placeholder="メッセージを入力..."
                className="resize-none min-h-[40px] max-h-[200px] pr-16"
                disabled={isLoading || isCreatingChat || !currentChatId}
                rows={1}
                style={{ height: '40px' }}
              />
              <div className="absolute right-2 bottom-2 text-xs text-gray-400 pointer-events-none">
                Shift + Enter で改行
              </div>
            </div>
            <Button
              type="submit"
              disabled={isLoading || isCreatingChat || !input.trim() || !currentChatId}
              className="self-end"
            >
              <Send className="h-4 w-4 mr-2" />
              送信
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
