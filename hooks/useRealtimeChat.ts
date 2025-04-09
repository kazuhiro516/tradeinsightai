import { useState, useEffect } from 'react';
import { supabaseClient } from '@/utils/supabase/realtime';
import type { ChatMessage } from '@/utils/supabase/realtime';
import { createClient } from '@/utils/supabase/client';

export function useRealtimeChat(chatId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);

  // 認証情報の確認
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        console.log('認証チェックを開始します');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('認証チェックエラー:', error);
          return;
        }
        
        if (!session) {
          console.log('認証セッションが見つかりません');
          return;
        }
        
        console.log('認証済みユーザー:', session.user.id);
        console.log('アクセストークン:', session.access_token ? '存在します' : '存在しません');
        
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
        console.error('認証チェック中にエラーが発生しました:', err);
      }
    };
    
    checkAuth();
  }, []);

  useEffect(() => {
    if (!chatId) return;

    setIsLoading(true);
    setError(null);

    // 初期メッセージを取得
    const fetchInitialMessages = async () => {
      try {
        console.log('Fetching initial messages for chatId:', chatId);
        const { data, error } = await supabaseClient
          .from('chat_messages')
          .select('*')
          .eq('chat_room_id', chatId)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching messages:', error);
          throw error;
        }
        console.log('Fetched messages:', data);
        setMessages(data || []);
      } catch (err) {
        console.error('メッセージの取得に失敗:', err);
        setError('メッセージの取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialMessages();

    // リアルタイム購読を設定
    const subscription = supabaseClient
      .channel(`chat_room:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_room_id=eq.${chatId}`
        },
        (payload) => {
          console.log('Received payload:', payload);
          if (payload.eventType === 'INSERT') {
            setMessages((prev) => [...prev, payload.new as ChatMessage]);
          } else if (payload.eventType === 'DELETE') {
            setMessages((prev) =>
              prev.filter((msg) => msg.id !== payload.old.id)
            );
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === payload.new.id ? (payload.new as ChatMessage) : msg
              )
            );
          }
        }
      )
      .subscribe();

    // クリーンアップ関数
    return () => {
      console.log('Unsubscribing from channel:', `chat_room:${chatId}`);
      subscription.unsubscribe();
    };
  }, [chatId]);

  const sendMessage = async (content: string) => {
    if (!chatId || !content.trim()) return;

    try {
      const { error } = await supabaseClient.from('chat_messages').insert({
        chat_room_id: chatId,
        content,
        role: 'user'
      });

      if (error) throw error;
    } catch (err) {
      console.error('メッセージの送信に失敗:', err);
      throw new Error('メッセージの送信に失敗しました');
    }
  };

  return {
    messages,
    isLoading,
    error,
    sendMessage
  };
} 