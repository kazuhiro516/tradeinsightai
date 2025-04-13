'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { supabaseClient } from '@/utils/supabase/realtime';
import type { ChatRoom } from '@/types/chat';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import cuid from 'cuid';
import { checkAuthAndSetSession, getCurrentUserId } from '@/utils/auth';
import { toast } from 'react-hot-toast';

interface ChatSidebarProps {
  currentChatId: string | null;
  onSelectChat: (chatId: string | null) => void;
}

/**
 * チャットサイドバーコンポーネント
 * チャットルームの一覧表示、作成、削除、編集を行う
 */
export function ChatSidebar({ currentChatId, onSelectChat }: ChatSidebarProps) {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeletingRoom, setIsDeletingRoom] = useState<string | null>(null);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');

  // 認証情報の確認
  useEffect(() => {
    checkAuthAndSetSession();
  }, []);

  // チャットルームの取得と購読
  useEffect(() => {
    const fetchChatRooms = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { userId } = await getCurrentUserId();
        if (!userId) {
          setError('認証されていません。ログインしてください。');
          return;
        }

        const { data, error } = await supabaseClient
          .from('chat_rooms')
          .select('*')
          .eq('userId', userId)
          .order('updatedAt', { ascending: false });

        if (error) throw error;

        setChatRooms(data || []);
      } catch (err: unknown) {
        console.error('チャットルームの取得中にエラーが発生しました:', err);
        toast.error('チャットルームの取得に失敗しました');
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
          // ユーザーIDを取得
          const { userId } = await getCurrentUserId();
          if (!userId) return;

          // 現在のユーザーのチャットルームの変更のみを処理
          if (payload.eventType === 'INSERT') {
            const newRoom = payload.new as ChatRoom;
            if (newRoom.userId === userId) {
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
            if (updatedRoom.userId === userId) {
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
      subscription.unsubscribe();
    };
  }, []);

  /**
   * 新しいチャットルームを作成する
   */
  const createNewChat = async () => {
    try {
      // ユーザーIDを取得
      const { userId } = await getCurrentUserId();
      if (!userId) {
        setError('認証されていません。ログインしてください。');
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
          userId,
          createdAt: now,
          updatedAt: now,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        onSelectChat(data.id);
      }
    } catch (err: unknown) {
      console.error('チャットルームの作成中にエラーが発生しました:', err);
      toast.error('チャットルームの作成に失敗しました');
    }
  };

  /**
   * チャットルームを削除する
   */
  const deleteChat = async (roomId: string, event: React.MouseEvent | React.KeyboardEvent) => {
    try {
      event.stopPropagation(); // 親要素のクリックイベントを停止
      setIsDeletingRoom(roomId);

      const { error } = await supabaseClient
        .from('chat_rooms')
        .delete()
        .eq('id', roomId);

      if (error) throw error;

      // 現在選択中のチャットが削除された場合、選択を解除
      if (currentChatId === roomId) {
        onSelectChat(null);
      }

    } catch (err: unknown) {
      console.error('チャットルームの削除中にエラーが発生しました:', err);
      toast.error('チャットルームの削除に失敗しました');
    } finally {
      setIsDeletingRoom(null);
    }
  };

  /**
   * チャットルームのタイトル編集を開始する
   */
  const startEditing = (roomId: string, currentTitle: string, event: React.MouseEvent | React.KeyboardEvent) => {
    event.stopPropagation();
    setEditingRoomId(roomId);
    setEditingTitle(currentTitle);
  };

  /**
   * チャットルームのタイトル編集をキャンセルする
   */
  const cancelEditing = (event: React.MouseEvent | React.KeyboardEvent) => {
    event.stopPropagation();
    setEditingRoomId(null);
    setEditingTitle('');
  };

  /**
   * チャットルームのタイトルを更新する
   */
  const updateTitle = async (event: React.MouseEvent | React.KeyboardEvent) => {
    try {
      event.stopPropagation();
      if (!editingRoomId || !editingTitle.trim()) return;

      const { error } = await supabaseClient
        .from('chat_rooms')
        .update({
          title: editingTitle.trim(),
          updatedAt: new Date().toISOString()
        })
        .eq('id', editingRoomId)
        .select()
        .single();

      if (error) throw error;

      setEditingRoomId(null);
      setEditingTitle('');
    } catch (err: unknown) {
      console.error('チャットルームのタイトル更新中にエラーが発生しました:', err);
      toast.error('タイトルの更新に失敗しました');
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
                          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                            e.stopPropagation();
                            if (e.key === 'Enter') {
                              updateTitle(e);
                            } else if (e.key === 'Escape') {
                              cancelEditing(e);
                            }
                          }}
                          autoFocus
                        />
                        <div className="flex gap-1">
                          <div
                            onClick={(e) => updateTitle(e)}
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
                    onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        deleteChat(room.id, e);
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
