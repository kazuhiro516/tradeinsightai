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
        console.log('既存のチャットルームを確認します');

        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session || !session.user) {
          console.error('ユーザーが認証されていません');
          setIsCreatingChat(false);
          return;
        }
        const supabaseId = session.user.id;

        // サーバーサイドAPIを呼び出してユーザーを取得
        const response = await fetch(`/api/users?supabaseId=${supabaseId}`);
        const user = await response.json();
        if (response.status !== 200) {
          console.error('ユーザー取得エラー:', user.error);
          setIsCreatingChat(false);
          return;
        }

        // 既存のチャットルームを確認
        const { data: existingChats, error: fetchError } = await supabaseClient
          .from('chat_rooms')
          .select('*')
          .eq('userId', user.id)
          .order('updatedAt', { ascending: false })
          .limit(1);

        if (fetchError) {
          console.error('チャットルーム取得エラー:', fetchError);
          setIsCreatingChat(false);
          return;
        }

        if (existingChats && existingChats.length > 0) {
          console.log('既存のチャットルームを使用します:', existingChats[0]);
          setCurrentChatId(existingChats[0].id);
          setIsCreatingChat(false);
          return;
        }

        // 既存のチャットルームがない場合は新規作成
        console.log('新しいチャットルームを作成します');
        const now = new Date().toISOString();
        const newChatId = cuid();

        const { data, error } = await supabaseClient
          .from('chat_rooms')
          .insert({
            id: newChatId,
            title: '新しいチャット',
            userId: user.id,
            createdAt: now,
            updatedAt: now,
          })
          .select()
          .single();

        if (error) {
          console.error('チャットルーム作成エラー:', error);
          setIsCreatingChat(false);
          return;
        }

        console.log('作成されたチャットルーム:', data);
        if (data) {
          setCurrentChatId(data.id);
        }
      } catch (err) {
        console.error('チャットルーム処理に失敗:', err);
      } finally {
        setIsCreatingChat(false);
      }
    };

    if (!currentChatId && !isCreatingChat) {
      checkExistingChatRoom();
    }
  }, [currentChatId, isCreatingChat, hasAttemptedChatCreation]);

  // メッセージが作成されたらチャットタイトルを更新
  useEffect(() => {
    const updateChatTitle = async () => {
      if (!currentChatId || messages.length === 0) return;
      
      // 最初のメッセージが送信された時にのみタイトルを更新
      const userMessages = messages.filter(msg => msg.role === 'user');
      if (userMessages.length === 1) {
        const firstMessage = userMessages[0];
        // メッセージの最初の10文字を要約としてタイトルに設定（10文字以下の場合はそのまま）
        const summaryTitle = firstMessage.content.length > 10 
          ? `${firstMessage.content.substring(0, 10)}...` 
          : firstMessage.content;
        
        try {
          const { error } = await supabaseClient
            .from('chat_rooms')
            .update({ 
              title: summaryTitle,
              updatedAt: new Date().toISOString()
            })
            .eq('id', currentChatId);
          
          if (error) {
            console.error('チャットタイトル更新エラー:', error);
          } else {
            console.log('チャットタイトルを更新しました:', summaryTitle);
          }
        } catch (err) {
          console.error('チャットタイトル更新に失敗:', err);
        }
      }
    };
    
    updateChatTitle();
  }, [currentChatId, messages]);

  const handleSelectChat = (chatId: string | null) => {
    setCurrentChatId(chatId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentChatId) return;

    try {
      await sendMessage(input);
      setInput('');
    } catch (err) {
      console.error('メッセージの送信に失敗:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        handleSubmit(e);
      }
    }
  };

  // テキストエリアの高さを自動調整
  const adjustTextareaHeight = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`; // 最大高さを200pxに制限
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
