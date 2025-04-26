'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { useRealtimeChat } from '@/hooks/useRealtimeChat';
import { ChatSidebar } from '@/app/components/chat/ChatSidebar';
import { ChatMessage } from '@/app/components/chat/ChatMessage';
import { supabaseClient } from '@/utils/supabase/realtime';
import { Send, Menu } from 'lucide-react';
import cuid from 'cuid';
import { checkAuthAndSetSession, getCurrentUserId } from '@/utils/auth';
import FilterModal from '@/app/components/FilterModal';
import { Filter } from 'lucide-react';
import { TradeFilter } from '@/types/trade';
import { formatDateTime } from '@/utils/date';

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
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<TradeFilter>({});
  const [activeFilterCount, setActiveFilterCount] = useState(0);

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

        // 現在のセッションを取得
        const { data: { session } } = await supabaseClient.auth.getSession();

        if (!session) {
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
        console.error('チャットルームの作成中にエラーが発生しました:', err);
      } finally {
        setIsCreatingChat(false);
      }
    };

    if (!currentChatId && !isCreatingChat) {
      checkExistingChatRoom();
    }
  }, [currentChatId, isCreatingChat, hasAttemptedChatCreation]);

  // メッセージ送信時のAI応答待ちステータスを管理
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMessage = messages[messages.length - 1];
    setIsAiResponding(lastMessage.role === 'user');
  }, [messages]);

  // アクティブなフィルターの数を計算
  useEffect(() => {
    const count = Object.values(currentFilter).filter(value => {
      if (value === undefined || value === null) return false;
      if (Array.isArray(value) && value.length === 0) return false;
      if (typeof value === 'string' && value === '') return false;
      return true;
    }).length;
    setActiveFilterCount(count);
  }, [currentFilter]);

  /**
   * フィルターを適用する
   */
  const handleApplyFilter = (filter: TradeFilter) => {
    setCurrentFilter(filter);

    // チャットフックにフィルターを設定
    if (Object.keys(filter).length > 0) {
      const filterDescription = createFilterDescription(filter);
      setInput(`以下の条件で取引データを検索: ${filterDescription}`);
    }
  };

  /**
   * フィルター説明文を生成する
   */
  const createFilterDescription = (filter: TradeFilter): string => {
    const descriptions: string[] = [];

    if (filter.startDate && filter.endDate) {
      descriptions.push(`期間: ${formatDateTime(filter.startDate)}～${formatDateTime(filter.endDate)}`);
    } else if (filter.startDate) {
      descriptions.push(`開始日: ${formatDateTime(filter.startDate)}以降`);
    } else if (filter.endDate) {
      descriptions.push(`終了日: ${formatDateTime(filter.endDate)}まで`);
    }

    if (filter.type) {
      descriptions.push(`タイプ: ${filter.type === 'buy' ? '買い' : '売り'}`);
    }

    if (filter.item) {
      descriptions.push(`通貨ペア: ${filter.item}`);
    }

    if (filter.profitMin !== undefined) {
      descriptions.push(`利益: ${filter.profitMin}円以上`);
    }

    if (filter.profitMax !== undefined) {
      descriptions.push(`損益: ${filter.profitMax}円以下`);
    }

    return descriptions.join('、') || 'すべての取引';
  };

  /**
   * メッセージを送信する
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentChatId) return;

    try {
      // フィルターをメッセージ送信時に渡す
      await sendMessage(input, currentFilter);
      setInput('');
    } catch (err) {
      console.error('メッセージの送信中にエラーが発生しました:', err);
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
    <div className="flex h-[100dvh] bg-white dark:bg-gray-900 relative">
      {/* オーバーレイ - サイドバー表示時のみ表示 */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* サイドバー */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-50 w-[260px] shrink-0
        transform transition-transform duration-200 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
        bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700
        h-[100dvh] md:h-full
      `}>
        <ChatSidebar
          currentChatId={currentChatId}
          onSelectChat={(chatId) => {
            setCurrentChatId(chatId);
            setIsSidebarOpen(false); // モバイルでは選択後に自動で閉じる
          }}
        />
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 w-full md:w-auto h-[100dvh] md:h-full">
        {/* ヘッダー - モバイルのみ表示 */}
        <div className="md:hidden flex items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(true)}
            className="mr-2"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-semibold">チャット</span>
        </div>

        {/* メッセージエリア */}
        <div className="flex-1 overflow-y-auto">
          {isLoading || isCreatingChat ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <p className="text-red-500 dark:text-red-400">{error}</p>
              <Button onClick={() => currentChatId && sendMessage(input)}>再試行</Button>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground dark:text-gray-400 p-4">
              <p className="text-center">メッセージを入力して会話を開始してください</p>
            </div>
          ) : (
            <div>
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isAiResponding && (
                <div className="w-full py-8 px-4">
                  <div className="w-full max-w-3xl mx-auto flex gap-4">
                    <div className="w-8 h-8 rounded-sm flex items-center justify-center shrink-0 bg-primary text-primary-foreground">
                      AI
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 入力エリア */}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="max-w-3xl mx-auto p-2 sm:p-4">
            <form onSubmit={handleSubmit} className="flex flex-col space-y-2">
              {/* フィルターUI */}
              <div className="flex justify-start">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs flex items-center gap-1 h-8"
                  onClick={() => setIsFilterModalOpen(true)}
                >
                  <Filter className="h-3 w-3" />
                  フィルター
                  {activeFilterCount > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full bg-primary w-4 h-4 text-[10px] text-primary-foreground">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </div>

              <div className="flex space-x-2 sm:space-x-4">
                <div className="flex-1 relative">
                  <Textarea
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      adjustTextareaHeight(e);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="メッセージを入力..."
                    className="resize-none min-h-[40px] max-h-[200px] pr-16 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 rounded-lg text-sm sm:text-base"
                    disabled={isLoading || isCreatingChat || !currentChatId}
                    rows={1}
                    style={{ height: '40px' }}
                  />
                  <div className="absolute right-2 bottom-2 text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 pointer-events-none">
                    Shift + Enter で改行
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={isLoading || isCreatingChat || !input.trim() || !currentChatId}
                  className="self-end rounded-lg"
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                  <span className="sr-only">送信</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* フィルターモーダル */}
      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={handleApplyFilter}
        type="chat"
        currentFilter={currentFilter}
      />
    </div>
  );
}
