'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { supabaseClient } from '@/utils/supabase/realtime';
import type { ChatRoom } from '@/types/chat';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
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
  const [isDeletingRoom, setIsDeletingRoom] = useState<string | null>(null);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');

  console.log('サイドバー: チャットルーム:', chatRooms);

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

        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session || !session.user) {
          console.error('ユーザーが認証されていません');
          setError('認証されていません。ログインしてください。');
          return;
        }

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
            if (newRoom.userId === user.id) {
              setChatRooms((prev) => {
                // 重複を避けるために既存のルームをチェック
                const exists = prev.some(room => room.id === newRoom.id);
                if (exists) return prev;
                return [newRoom, ...prev].sort((a, b) => 
                  new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                );
              });
            }
          } else if (payload.eventType === 'DELETE') {
            setChatRooms((prev) =>
              prev.filter((room) => room.id !== payload.old.id)
            );
          } else if (payload.eventType === 'UPDATE') {
            const updatedRoom = payload.new as ChatRoom;
            if (updatedRoom.userId === user.id) {
              setChatRooms((prev) => {
                const updated = prev.map((room) =>
                  room.id === updatedRoom.id ? { ...room, ...updatedRoom } : room
                );
                return updated.sort((a, b) => 
                  new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                );
              });
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

  const deleteChat = async (roomId: string, event: React.MouseEvent) => {
    try {
      event.stopPropagation(); // 親要素のクリックイベントを停止
      setIsDeletingRoom(roomId);

      const { error } = await supabaseClient
        .from('chat_rooms')
        .delete()
        .eq('id', roomId);

      if (error) {
        console.error('チャットルーム削除エラー:', error);
        throw error;
      }

      // 現在選択中のチャットが削除された場合、選択を解除
      if (currentChatId === roomId) {
        onSelectChat(null);
      }

    } catch (err) {
      console.error('チャットルームの削除に失敗:', err);
      setError('チャットルームの削除に失敗しました');
    } finally {
      setIsDeletingRoom(null);
    }
  };

  const startEditing = (roomId: string, currentTitle: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingRoomId(roomId);
    setEditingTitle(currentTitle);
  };

  const cancelEditing = (event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingRoomId(null);
    setEditingTitle('');
  };

  const updateTitle = async (roomId: string, event: React.MouseEvent) => {
    try {
      event.stopPropagation();
      if (!editingTitle.trim()) return;

      const { error } = await supabaseClient
        .from('chat_rooms')
        .update({
          title: editingTitle.trim(),
          updatedAt: new Date().toISOString()
        })
        .eq('id', roomId)
        .select()
        .single();

      if (error) {
        console.error('チャットルームのタイトル更新エラー:', error);
        throw error;
      }

      setEditingRoomId(null);
      setEditingTitle('');
    } catch (err) {
      console.error('チャットルームのタイトル更新に失敗:', err);
      setError('タイトルの更新に失敗しました');
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
              <div
                key={room.id}
                onClick={() => onSelectChat(room.id)}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors group relative cursor-pointer ${
                  currentChatId === room.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectChat(room.id);
                  }
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    {editingRoomId === room.id ? (
                      <div 
                        className="flex items-center gap-2" 
                        onClick={e => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          className={`w-full px-2 py-1 rounded border ${
                            currentChatId === room.id
                              ? 'bg-primary-foreground text-primary'
                              : 'bg-background'
                          }`}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter') {
                              updateTitle(room.id, e as any);
                            } else if (e.key === 'Escape') {
                              cancelEditing(e as any);
                            }
                          }}
                          autoFocus
                        />
                        <div className="flex gap-1">
                          <div
                            onClick={(e) => updateTitle(room.id, e)}
                            className="p-1 rounded-md hover:bg-primary/20"
                            role="button"
                            tabIndex={0}
                          >
                            <Check className="w-4 h-4" />
                          </div>
                          <div
                            onClick={cancelEditing}
                            className="p-1 rounded-md hover:bg-primary/20"
                            role="button"
                            tabIndex={0}
                          >
                            <X className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="truncate flex items-center gap-2">
                          <span>{room.title}</span>
                          <div
                            onClick={(e) => startEditing(room.id, room.title, e)}
                            className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-primary/20 ${
                              currentChatId === room.id 
                                ? 'text-primary-foreground' 
                                : 'text-muted-foreground'
                            }`}
                            role="button"
                            tabIndex={0}
                            aria-label="チャットルームの名前を編集"
                          >
                            <Pencil className="w-3 h-3" />
                          </div>
                        </div>
                      </>
                    )}
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="truncate">
                        作成: {room.createdAt ? new Date(room.createdAt).toLocaleString('ja-JP', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          timeZone: 'Asia/Tokyo'
                        }).replace(/\//g, '-') : ''}
                      </div>
                      <div className="truncate">
                        更新: {room.updatedAt ? new Date(room.updatedAt).toLocaleString('ja-JP', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          timeZone: 'Asia/Tokyo'
                        }).replace(/\//g, '-') : ''}
                      </div>
                    </div>
                  </div>
                  <div
                    onClick={(e) => deleteChat(room.id, e)}
                    className={`ml-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive ${
                      currentChatId === room.id 
                        ? 'text-primary-foreground hover:text-destructive' 
                        : 'text-muted-foreground'
                    } ${isDeletingRoom === room.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        deleteChat(room.id, e as any);
                      }
                    }}
                    aria-label="チャットルームを削除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 