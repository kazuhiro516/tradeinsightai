'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { supabaseClient } from '@/utils/supabase/realtime';
import type { ChatRoom } from '@/types/chat';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import cuid from 'cuid';
import { checkAuthAndSetSession, getCurrentUserId } from '@/utils/auth';
import { toast } from 'react-hot-toast';
import { formatDateTime } from '@/utils/date';

interface ChatSidebarProps {
  currentChatId: string | null;
  onSelectChat: (chatId: string | null) => void;
  className?: string;
}

/**
 * チャットサイドバーコンポーネント
 * チャットルームの一覧表示、作成、削除、編集を行う
 */
export function ChatSidebar({ currentChatId, onSelectChat, className = '' }: ChatSidebarProps) {
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

  /**
   * タイトル編集時のキーボードイベントを処理する
   */
  const handleEditKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      // エンターキーでタイトルを保存
      updateTitle(event);
    } else if (event.key === 'Escape') {
      // エスケープキーで編集をキャンセル
      cancelEditing(event);
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <Button
          onClick={createNewChat}
          disabled={isLoading}
          className="w-full justify-start gap-2"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          新しいチャット
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="p-4 text-red-500 dark:text-red-400">{error}</div>
        ) : chatRooms.length === 0 ? (
          <div className="p-4 text-muted-foreground dark:text-gray-400">
            チャットルームがありません
          </div>
        ) : (
          <div className="space-y-1">
            {chatRooms.map((room) => (
              <div
                key={room.id}
                onClick={() => onSelectChat(room.id)}
                className={`group flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors ${
                  currentChatId === room.id
                    ? 'bg-muted/50'
                    : 'hover:bg-muted/30'
                }`}
              >
                {editingRoomId === room.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={handleEditKeyDown}
                      className="flex-1 bg-transparent border-none focus:outline-none"
                      autoFocus
                    />
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => updateTitle(e)}
                        className="h-6 w-6"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => cancelEditing(e)}
                        className="h-6 w-6"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <span className="block truncate">{room.title}</span>
                      <div className="text-xs text-muted-foreground mt-1">
                        <div className="truncate">
                          作成: {room.createdAt ? formatDateTime(room.createdAt) : ''}
                        </div>
                        <div className="truncate">
                          更新: {room.updatedAt ? formatDateTime(room.updatedAt) : ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => startEditing(room.id, room.title, e)}
                        className="h-6 w-6"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => deleteChat(room.id, e)}
                        className="h-6 w-6"
                        disabled={isDeletingRoom === room.id}
                      >
                        {isDeletingRoom === room.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
