import { useState, useEffect } from 'react';
import { supabaseClient } from '@/utils/supabase/realtime';
import { createClient } from '@/utils/supabase/client';
import cuid from 'cuid';

// 表示のためのメッセージ型を内部で定義
interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

// データベースのメッセージ型を定義
interface DbMessage {
  id: string;
  sender: string;
  message: string;
  chatRoomId: string;
  userId: string;
  createdAt: string;
}

export function useRealtimeChat(chatId: string) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          .eq('chatRoomId', chatId)
          .order('createdAt', { ascending: true });

        if (error) {
          console.error('Error fetching messages:', error);
          throw error;
        }
        console.log('Fetched messages:', data);
        
        // データベースのsender/messageフィールドをrole/contentに変換
        const formattedMessages: DisplayMessage[] = (data as DbMessage[])?.map(msg => ({
          id: msg.id,
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.message,
          createdAt: msg.createdAt
        })) || [];
        
        setMessages(formattedMessages);
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
          filter: `chatRoomId=eq.${chatId}`
        },
        (payload) => {
          console.log('Received payload:', payload);
          if (payload.eventType === 'INSERT') {
            // 新しいメッセージをrole/content形式に変換
            const newMsg = payload.new as DbMessage;
            const formattedMsg: DisplayMessage = {
              id: newMsg.id,
              role: newMsg.sender === 'user' ? 'user' : 'assistant',
              content: newMsg.message,
              createdAt: newMsg.createdAt
            };
            setMessages((prev) => [...prev, formattedMsg]);
            
            // AIの応答を生成（ユーザーメッセージの場合のみ）
            if (newMsg.sender === 'user') {
              generateAIResponse(newMsg.message);
            }
          } else if (payload.eventType === 'DELETE') {
            setMessages((prev) =>
              prev.filter((msg) => msg.id !== payload.old.id)
            );
          } else if (payload.eventType === 'UPDATE') {
            const updatedMsg = payload.new as DbMessage;
            const formattedMsg: DisplayMessage = {
              id: updatedMsg.id,
              role: updatedMsg.sender === 'user' ? 'user' : 'assistant',
              content: updatedMsg.message,
              createdAt: updatedMsg.createdAt
            };
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === formattedMsg.id ? formattedMsg : msg
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

  // AIの応答を生成する関数
  const generateAIResponse = async (userMessage: string) => {
    try {
      // ここに実際のAI応答処理を実装します
      // 簡易実装としてエコー応答を作成
      const aiResponse = `${userMessage}についての質問ありがとうございます。お手伝いします。`;
      
      // セッション取得
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session || !session.user) {
        console.error('AI応答生成: ユーザーが認証されていません');
        return;
      }
      
      // ユーザー情報取得
      const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .select('id')
        .eq('supabaseId', session.user.id)
        .single();
        
      if (userError || !userData) {
        console.error('AI応答生成: ユーザー情報の取得に失敗しました');
        return;
      }
      
      // AIメッセージを保存
      const { error } = await supabaseClient.from('chat_messages').insert({
        id: cuid(),
        chatRoomId: chatId,
        message: aiResponse,
        sender: 'assistant',
        userId: userData.id,
        createdAt: new Date().toISOString()
      });
      
      if (error) {
        console.error('AI応答保存エラー:', error);
      }
    } catch (err) {
      console.error('AI応答生成エラー:', err);
    }
  };

  const sendMessage = async (message: string) => {
    if (!chatId || !message.trim()) return;

    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      
      if (!session || !session.user) {
        throw new Error('ユーザーが認証されていません');
      }

      const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .select('id')
        .eq('supabaseId', session.user.id)
        .single();
        
      if (userError || !userData) {
        throw new Error('ユーザー情報の取得に失敗しました');
      }

      const { error } = await supabaseClient.from('chat_messages').insert({
        id: cuid(),
        chatRoomId: chatId,
        message,
        sender: 'user',
        userId: userData.id,          
        createdAt: new Date().toISOString() 
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