'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { supabaseClient } from '@/utils/supabase/realtime';
import type { ChatRoom } from '@/utils/supabase/realtime';
import { Plus } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface ChatSidebarProps {
  currentChatId: string | null;
  onSelectChat: (chatId: string | null) => void;
}

export function ChatSidebar({ currentChatId, onSelectChat }: ChatSidebarProps) {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);

  // 認証情報の確認
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        console.log('サイドバー: 認証チェックを開始します');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('サイドバー: 認証チェックエラー:', error);
          return;
        }
        
        if (!session) {
          console.log('サイドバー: 認証セッションが見つかりません');
          return;
        }
        
        console.log('サイドバー: 認証済みユーザー:', session.user.id);
        console.log('サイドバー: アクセストークン:', session.access_token ? '存在します' : '存在しません');
        
        // セッション情報を保存
        setSession(session);
        
        // アクセストークンをヘッダーにセット
        if (session.access_token) {
          supabaseClient.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token
          });
        }
      } catch (err) {
        console.error('サイドバー: 認証チェック中にエラーが発生しました:', err);
      }
    };
    
    checkAuth();
  }, []);

  useEffect(() => {
    const fetchChatRooms = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log('サイドバー: チャットルームを取得します');
        const { data, error } = await supabaseClient
          .from('chat_rooms')
          .select('*')
          .order('updated_at', { ascending: false });

        if (error) {
          console.error('サイドバー: チャットルーム取得エラー:', error);
          throw error;
        }
        
        console.log('サイドバー: 取得したチャットルーム:', data);
        setChatRooms(data || []);
      } catch (err) {
        console.error('チャットルームの取得に失敗:', err);
        setError('チャットルームの取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    fetchChatRooms();

    // リアルタイム購読を設定
    const subscription = supabaseClient
      .channel('chat_rooms')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_rooms'
        },
        (payload) => {
          console.log('サイドバー: リアルタイム更新を受信:', payload);
          if (payload.eventType === 'INSERT') {
            setChatRooms((prev) => [payload.new as ChatRoom, ...prev]);
          } else if (payload.eventType === 'DELETE') {
            setChatRooms((prev) =>
              prev.filter((room) => room.id !== payload.old.id)
            );
          } else if (payload.eventType === 'UPDATE') {
            setChatRooms((prev) =>
              prev.map((room) =>
                room.id === payload.new.id ? (payload.new as ChatRoom) : room
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      console.log('サイドバー: 購読を解除します');
      subscription.unsubscribe();
    };
  }, []);

  const createNewChat = async () => {
    try {
      console.log('サイドバー: 新しいチャットルームを作成します');
      const { data, error } = await supabaseClient
        .from('chat_rooms')
        .insert({ title: '新しいチャット' })
        .select()
        .single();

      if (error) {
        console.error('サイドバー: チャットルーム作成エラー:', error);
        throw error;
      }
      
      console.log('サイドバー: 作成されたチャットルーム:', data);
      if (data) {
        onSelectChat(data.id);
      }
    } catch (err) {
      console.error('チャットルームの作成に失敗:', err);
      setError('チャットルームの作成に失敗しました');
    }
  };

  return (
    <div className="w-64 h-full border-r bg-muted/10 flex flex-col">
      <div className="p-4">
        <Button
          onClick={createNewChat}
          className="w-full"
          disabled={isLoading}
        >
          <Plus className="w-4 h-4 mr-2" />
          新しいチャット
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="text-center text-red-500 p-4">{error}</div>
        ) : chatRooms.length === 0 ? (
          <div className="text-center text-muted-foreground p-4">
            チャットルームがありません
          </div>
        ) : (
          <div className="space-y-2">
            {chatRooms.map((room) => (
              <button
                key={room.id}
                onClick={() => onSelectChat(room.id)}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  currentChatId === room.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <div className="truncate">{room.title}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {new Date(room.updated_at).toLocaleString('ja-JP')}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 