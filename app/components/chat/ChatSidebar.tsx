'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { supabaseClient } from '@/utils/supabase/realtime';
import type { ChatRoom } from '@/utils/supabase/realtime';
import { Plus } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import cuid from 'cuid';

interface ChatSidebarProps {
  currentChatId: string | null;
  onSelectChat: (chatId: string | null) => void;
}

export function ChatSidebar({ currentChatId, onSelectChat }: ChatSidebarProps) {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

        // セッションからユーザー情報を取得
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session || !session.user) {
          console.error('ユーザーが認証されていません');
          setError('認証されていません。ログインしてください。');
          return;
        }

        // ユーザー情報を取得
        const response = await fetch(`/api/users?supabaseId=${session.user.id}`);
        const user = await response.json();
        if (response.status !== 200) {
          console.error('ユーザー取得エラー:', user.error);
          setError('ユーザー情報の取得に失敗しました');
          return;
        }

        console.log('サイドバー: チャットルームを取得します');
        const { data, error } = await supabaseClient
          .from('chat_rooms')
          .select('*')
          .eq('userId', user.id)
          .order('updatedAt', { ascending: false });

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
        async (payload) => {
          console.log('サイドバー: リアルタイム更新を受信:', payload);
          
          // セッションからユーザー情報を取得
          const { data: { session } } = await supabaseClient.auth.getSession();
          if (!session || !session.user) return;

          // ユーザー情報を取得
          const response = await fetch(`/api/users?supabaseId=${session.user.id}`);
          const user = await response.json();
          if (response.status !== 200) return;

          // 現在のユーザーのチャットルームの変更のみを処理
          if (payload.eventType === 'INSERT') {
            const newRoom = payload.new as ChatRoom;
            if (newRoom.user_id === user.id) {
              setChatRooms((prev) => [newRoom, ...prev]);
            }
          } else if (payload.eventType === 'DELETE') {
            setChatRooms((prev) =>
              prev.filter((room) => room.id !== payload.old.id)
            );
          } else if (payload.eventType === 'UPDATE') {
            const updatedRoom = payload.new as ChatRoom;
            if (updatedRoom.user_id === user.id) {
              setChatRooms((prev) =>
                prev.map((room) =>
                  room.id === updatedRoom.id ? updatedRoom : room
                )
              );
            }
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
      
      // セッションからユーザー情報を取得
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session || !session.user) {
        console.error('ユーザーが認証されていません');
        setError('認証されていません。ログインしてください。');
        return;
      }
      const supabaseId = session.user.id;

      // サーバーサイドAPIを呼び出してユーザーを取得
      const response = await fetch(`/api/users?supabaseId=${supabaseId}`);
      const user = await response.json();
      if (response.status !== 200) {
        console.error('ユーザー取得エラー:', user.error);
        setError('ユーザー情報の取得に失敗しました');
        return;
      }
      
      // タイムスタンプとIDを設定
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