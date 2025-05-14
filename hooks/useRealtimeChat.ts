import { useState, useEffect } from 'react';
import { supabaseClient } from '@/utils/supabase/realtime';
import cuid from 'cuid';
import { checkAuthAndSetSession, getCurrentUserId } from '@/utils/auth';
import { ChatMessage as DisplayMessage } from '@/types/chat';
import { TradeFilter, TradeRecordsResponse } from '@/types/trade';

// 拡張したメッセージ型を定義
interface ExtendedDisplayMessage extends DisplayMessage {
  metadata?: {
    toolCallResult?: {
      type: 'trade_records';
      data: TradeRecordsResponse;
    };
    userFilter?: TradeFilter;
  };
}

// データベースのメッセージ型を定義
interface DbMessage {
  id: string;
  sender: string;
  message: string;
  chatRoomId: string;
  userId: string;
  createdAt: string;
  metadata?: {
    toolCallResult?: {
      type: 'trade_records';
      data: TradeRecordsResponse;
    };
    userFilter?: TradeFilter;
  };
}

/**
 * リアルタイムチャット機能を提供するカスタムフック
 * @param chatId チャットルームID
 */
export function useRealtimeChat(chatId: string) {
  const [messages, setMessages] = useState<ExtendedDisplayMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 認証情報の確認
  useEffect(() => {
    checkAuthAndSetSession();
  }, []);

  // メッセージの取得とリアルタイム購読
  useEffect(() => {
    if (!chatId) return;

    setIsLoading(true);
    setError(null);

    // 初期メッセージを取得
    const fetchInitialMessages = async () => {
      try {
        const { data, error } = await supabaseClient
          .from('chat_messages')
          .select('*')
          .eq('chatRoomId', chatId)
          .order('createdAt', { ascending: true });

        if (error) throw error;

        // データベースのsender/messageフィールドをrole/contentに変換
        const formattedMessages: ExtendedDisplayMessage[] = (data as DbMessage[])?.map(msg => ({
          id: msg.id,
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.message,
          createdAt: msg.createdAt,
          metadata: msg.metadata
        })) || [];

        setMessages(formattedMessages);
      } catch (err) {
        console.error('メッセージの取得に失敗しました', err);
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
          if (payload.eventType === 'INSERT') {
            // 新しいメッセージをrole/content形式に変換
            const newMsg = payload.new as DbMessage;
            const formattedMsg: ExtendedDisplayMessage = {
              id: newMsg.id,
              role: newMsg.sender === 'user' ? 'user' : 'assistant',
              content: newMsg.message,
              createdAt: newMsg.createdAt,
              metadata: newMsg.metadata
            };
            setMessages((prev) => [...prev, formattedMsg]);

            // AIの応答を生成（ユーザーメッセージの場合のみ）
            if (newMsg.sender === 'user') {
              // ペイロードから直接メタデータを取得して渡す
              generateAIResponse(newMsg.message, newMsg.metadata?.userFilter);
            }
          } else if (payload.eventType === 'DELETE') {
            setMessages((prev) =>
              prev.filter((msg) => msg.id !== payload.old.id)
            );
          } else if (payload.eventType === 'UPDATE') {
            const updatedMsg = payload.new as DbMessage;
            const formattedMsg: ExtendedDisplayMessage = {
              id: updatedMsg.id,
              role: updatedMsg.sender === 'user' ? 'user' : 'assistant',
              content: updatedMsg.message,
              createdAt: updatedMsg.createdAt,
              metadata: updatedMsg.metadata
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
      subscription.unsubscribe();
    };
  }, [chatId]);

  /**
   * AIの応答を生成する関数
   * @param userMessage ユーザーメッセージ
   * @param userFilter ユーザーフィルター（リアルタイムイベントから取得）
   */
  const generateAIResponse = async (userMessage: string, userFilter?: TradeFilter) => {
    try {
      // ユーザーIDを取得
      const { userId, supabaseId } = await getCurrentUserId();
      if (!userId || !supabaseId) return;

      // セッション取得
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) return;

      try {
        const response = await fetch('/api/chat-ai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            message: userMessage,
            filter: userFilter,
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const aiResponse = data.message;

        // 空の応答はスキップ
        if (!aiResponse || aiResponse.trim() === '') {
          // フォールバック応答を表示
          const fallbackResponse = 'ご質問ありがとうございます。申し訳ありませんが、応答の生成中に問題が発生しました。もう一度お試しください。';

          await supabaseClient.from('chat_messages').insert({
            id: cuid(),
            chatRoomId: chatId,
            message: fallbackResponse,
            sender: 'assistant',
            userId,
            createdAt: new Date().toISOString()
          });

          return;
        }

        // AIメッセージを保存
        await supabaseClient.from('chat_messages').insert({
          id: cuid(),
          chatRoomId: chatId,
          message: aiResponse,
          sender: 'assistant',
          userId,
          createdAt: new Date().toISOString(),
          metadata: data.hasToolCalls ? {
            toolCallResult: {
              type: 'trade_records',
              data: data.toolCallResults
            }
          } : null
        });
      } catch (err) {
        // エラー時のフォールバック応答
        const fallbackResponse = `${userMessage}についての質問ありがとうございます。ただいま処理中にエラーが発生しました。しばらくしてからもう一度お試しください。`;
        console.error('AI応答生成エラー', err);

        // フォールバック応答を保存
        await supabaseClient.from('chat_messages').insert({
          id: cuid(),
          chatRoomId: chatId,
          message: fallbackResponse,
          sender: 'assistant',
          userId,
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('AI応答生成エラー', err);
    }
  };

  /**
   * メッセージを送信する関数
   * @param message 送信するメッセージ
   * @param filter 適用するフィルター (オプション)
   */
  const sendMessage = async (message: string, filter?: TradeFilter) => {
    if (!chatId || !message.trim()) return;

    try {
      // ユーザーIDを取得
      const { userId } = await getCurrentUserId();
      if (!userId) {
        throw new Error('ユーザーが認証されていません');
      }

      const { error } = await supabaseClient.from('chat_messages').insert({
        id: cuid(),
        chatRoomId: chatId,
        message,
        sender: 'user',
        userId,
        createdAt: new Date().toISOString(),
        // フィルターがある場合はメタデータに含める
        metadata: filter ? { userFilter: filter } : undefined
      });

      if (error) throw error;
    } catch (err) {
      console.error('メッセージの送信エラー', err);
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
