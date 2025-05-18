'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { useRealtimeChat } from '@/hooks/useRealtimeChat';
import { ChatSidebar } from '@/app/components/chat/ChatSidebar';
import { ChatMessage } from '@/app/components/chat/ChatMessage';
import { supabaseClient } from '@/utils/supabase/realtime';
import { Send, PanelLeft, X } from 'lucide-react';
import { getCurrentUserId } from '@/utils/auth';
import FilterModal from '@/app/components/FilterModal';
import { Filter } from 'lucide-react';
import { TradeFilter, TRADE_TYPE_LABELS } from '@/types/trade';
import { formatJST, formatDateOnly } from '@/utils/date';

/**
 * チャットページコンポーネント
 * チャット機能のメイン画面
 */
export default function ChatPage() {
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isCreatingChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<TradeFilter>({});
  const [activeFilterCount, setActiveFilterCount] = useState(0);
  const [filterTags, setFilterTags] = useState<Array<{key: string, label: string}>>([]);
  // フィルターが適用されているかどうかを追跡する状態
  const [isFilterApplied, setIsFilterApplied] = useState(false);

  const {
    messages,
    isLoading,
    error,
    sendMessage
  } = useRealtimeChat(currentChatId || '');

  // ページロード時に最新のチャットルームを自動選択する
  useEffect(() => {
    const fetchLatestChatRoom = async () => {
      try {
        const { userId } = await getCurrentUserId();
        if (!userId) return;

        const { data, error } = await supabaseClient
          .from('chat_rooms')
          .select('*')
          .eq('userId', userId)
          .order('updatedAt', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
          setCurrentChatId(data[0].id);
        }
      } catch (err) {
        console.error('最新チャットルームの取得に失敗しました:', err);
      }
    };

    // 現在選択中のチャットルームがなければ最新のものを選択
    if (!currentChatId) {
      fetchLatestChatRoom();
    }
  }, [currentChatId]);

  // メッセージ送信時のAI応答待ちステータスを管理
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMessage = messages[messages.length - 1];
    setIsAiResponding(lastMessage.role === 'user');
  }, [messages]);

  // アクティブなフィルターの数を計算
  useEffect(() => {
    // タグの数をアクティブフィルター数として使用
    setActiveFilterCount(filterTags.length);
  }, [filterTags]);

  /**
   * フィルターを適用する
   */
  const handleApplyFilter = (filter: TradeFilter) => {
    // 有効なフィルターがある場合のみ設定
    if (Object.keys(filter).length > 0) {
      // フィルター情報をステートに保存
      setCurrentFilter(filter);
      setIsFilterApplied(true);

      // フィルターからタグを生成
      const tags = generateFilterTags(filter);
      setFilterTags(tags);

      // 入力欄はクリアする（ユーザーには表示しない）
      setInput('');
    } else {
      // フィルターがない場合はリセット
      setCurrentFilter({});
      setFilterTags([]);
      setInput('');
      setIsFilterApplied(false);
    }
  };

  /**
   * フィルター説明文を生成する
   */
  const createFilterDescription = (filter: TradeFilter): string => {
    const descriptions: string[] = [];

    if (filter.startDate && filter.endDate) {
      descriptions.push(`期間: ${formatJST(filter.startDate)}～${formatJST(filter.endDate)}`);
    } else if (filter.startDate) {
      descriptions.push(`開始日: ${formatJST(filter.startDate)}以降`);
    } else if (filter.endDate) {
      descriptions.push(`終了日: ${formatJST(filter.endDate)}まで`);
    }

    if (filter.type) {
      // typeがall, buy, sellのいずれかであればTRADE_TYPE_LABELSを使う
      const typeLabel = TRADE_TYPE_LABELS[filter.type as keyof typeof TRADE_TYPE_LABELS] || filter.type;
      descriptions.push(`タイプ: ${typeLabel}`);
    }

    if (filter.items && filter.items.length > 0) {
      descriptions.push(`通貨ペア: ${filter.items[0]}`);
    }

    // 損益のフィルター説明を修正
    if (filter.profitMin !== undefined && filter.profitMin >= 0) {
      descriptions.push(`利益: プラス`);
    } else if (filter.profitMax !== undefined && filter.profitMax <= 0) {
      descriptions.push(`利益: マイナス`);
    }

    return descriptions.join(', ') || 'すべての取引';
  };

  /**
   * フィルターからタグを生成する
   */
  const generateFilterTags = (filter: TradeFilter): Array<{key: string, label: string}> => {
    const tags: Array<{key: string, label: string}> = [];

    if (filter.startDate && filter.endDate) {
      tags.push({
        key: 'period',
        label: `期間: ${formatDateOnly(filter.startDate)}～${formatDateOnly(filter.endDate)}`
      });
    } else if (filter.startDate) {
      tags.push({
        key: 'startDate',
        label: `開始日: ${formatDateOnly(filter.startDate)}以降`
      });
    } else if (filter.endDate) {
      tags.push({
        key: 'endDate',
        label: `終了日: ${formatDateOnly(filter.endDate)}まで`
      });
    }

    if (filter.type && filter.type !== 'all') {
      const typeLabel = TRADE_TYPE_LABELS[filter.type as keyof typeof TRADE_TYPE_LABELS] || filter.type;
      tags.push({
        key: 'type',
        label: `タイプ: ${typeLabel}`
      });
    }

    if (filter.items && filter.items.length > 0) {
      tags.push({
        key: 'item',
        label: `通貨ペア: ${filter.items[0]}`
      });
    }

    // 損益のタグを追加
    if (filter.profitMin !== undefined && filter.profitMin >= 0) {
      tags.push({
        key: 'profit',
        label: `利益: プラス`
      });
    } else if (filter.profitMax !== undefined && filter.profitMax <= 0) {
      tags.push({
        key: 'loss',
        label: `利益: マイナス`
      });
    }

    return tags;
  };

  /**
   * タグを削除してフィルターを更新する
   * @param tagKey 削除するタグのキー
   */
  const handleRemoveTag = (tagKey: string) => {
    // 新しいフィルターオブジェクトを作成（ディープコピー）
    const updatedFilter: TradeFilter = { ...currentFilter };

    // tagKeyに基づいて対応するフィルターを削除
    switch (tagKey) {
      case 'period':
      case 'startDate':
      case 'endDate':
        // 日付フィルターを削除
        delete updatedFilter.startDate;
        delete updatedFilter.endDate;
        break;
      case 'type':
        // タイプフィルターを削除
        delete updatedFilter.type;
        break;
      case 'item':
        // 通貨ペアフィルターを削除
        delete updatedFilter.items;
        break;
      case 'profit':
      case 'loss':
        // 損益フィルターを削除
        delete updatedFilter.profitMin;
        delete updatedFilter.profitMax;
        break;
    }

    // フィルターが空になった場合はフィルター適用状態をリセット
    if (Object.keys(updatedFilter).length === 0) {
      setCurrentFilter({});
      setFilterTags([]);
      setIsFilterApplied(false);
    } else {
      // 更新されたフィルターを設定
      setCurrentFilter(updatedFilter);
      // タグを再生成
      const tags = generateFilterTags(updatedFilter);
      setFilterTags(tags);
    }
  };

  /**
   * メッセージを送信する
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !isFilterApplied || !currentChatId) return;

    try {
      let messageToSend = input.trim();

      // フィルターが適用されていて、かつユーザー入力がある場合
      if (isFilterApplied) {
        if (messageToSend) {
          // ユーザーの質問とフィルター情報を組み合わせる（AIにのみ送信）
          messageToSend = `以下の条件で取引データを検索: ${createFilterDescription(currentFilter)}\n\n${messageToSend}`;
        } else {
          // 入力がなく、フィルターのみの場合
          messageToSend = `以下の条件で取引データを検索: ${createFilterDescription(currentFilter)}`;
        }
      }

      // フィルターをメッセージ送信時に渡す
      await sendMessage(messageToSend, isFilterApplied ? currentFilter : undefined);
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
        {/* サイドバーヘッダー（SPのみ） */}
        <div className="md:hidden flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <span className="font-semibold">チャット</span>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            aria-label="サイドバーを閉じる"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
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
            <PanelLeft className="h-5 w-5" />
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
          ) : !currentChatId ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground dark:text-gray-400 p-4">
              <p className="text-center">左側のメニューからチャットルームを選択するか、新しいチャットを作成してください</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground dark:text-gray-400 p-4">
              <p className="text-center">メッセージを入力して会話を開始してください</p>
            </div>
          ) : (
            <div>
              {messages.map((message) => {
                // 型互換性の問題を解決するための型変換関数
                const safeMetadata = message.metadata ? {
                  toolCallResult: message.metadata.toolCallResult ? {
                    type: 'trade_records' as const,
                    data: {
                      records: (message.metadata.toolCallResult.data.records ?? []).map(record => ({
                        openTime: record.openTime,
                        type: record.type,
                        item: record.item,
                        size: record.size,
                        openPrice: record.openPrice,
                        closePrice: record.closePrice ?? 0, // undefinedの場合は0を使用
                        profit: record.profit ?? 0 // undefinedの場合は0を使用
                      })),
                      total: message.metadata.toolCallResult.data.total
                    }
                  } : undefined
                } : undefined;

                // 安全に型変換したメッセージを渡す
                return <ChatMessage
                  key={message.id}
                  message={{
                    id: message.id,
                    role: message.role,
                    content: message.content,
                    createdAt: message.createdAt,
                    metadata: safeMetadata
                  }}
                />
              })}
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
              <div className="relative bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm">
                {/* フィルタータグの表示エリア */}
                {filterTags.length > 0 && (
                  <div className="px-4 pt-3 pb-1 flex flex-wrap gap-2">
                    {filterTags.map((tag) => (
                      <div
                        key={tag.key}
                        className="inline-flex items-center bg-blue-600 dark:bg-blue-700 text-white text-xs px-2 py-1 rounded-md shadow-sm"
                      >
                        <span className="mr-1">{tag.label}</span>
                        <button
                          type="button"
                          className="hover:bg-blue-700 dark:hover:bg-blue-800 rounded-full p-0.5 transition-colors"
                          onClick={() => handleRemoveTag(tag.key)}
                        >
                          <X className="h-3 w-3 text-white/90" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <Textarea
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    adjustTextareaHeight(e);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="メッセージを入力..."
                  className={`resize-none min-h-[120px] max-h-[300px] pr-12 py-3 px-4 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-gray-900 dark:text-white text-sm sm:text-base rounded-xl ${filterTags.length > 0 ? 'pt-1' : ''}`}
                  disabled={isLoading || isCreatingChat || !currentChatId}
                  rows={5}
                  style={{ height: 'auto' }}
                />
                {/* 送信ボタン */}
                <div className="absolute bottom-2 right-2">
                  <Button
                    type="submit"
                    disabled={isLoading || isCreatingChat || !input.trim() || !currentChatId}
                    size="icon"
                    className="h-8 w-8 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"
                  >
                    <Send className="h-4 w-4" />
                    <span className="sr-only">送信</span>
                  </Button>
                </div>
                {/* フィルターボタン */}
                <div className="absolute bottom-2 left-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                    onClick={() => setIsFilterModalOpen(true)}
                  >
                    <Filter className="h-4 w-4" />
                    <span className="sr-only">フィルター</span>
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex items-center justify-center rounded-full bg-primary w-4 h-4 text-[10px] text-primary-foreground">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </div>
                {/* キーボードヒント */}
                <div className="absolute left-12 bottom-2 text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 pointer-events-none">
                  Shift + Enter で改行
                </div>
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
        currentFilter={currentFilter}
      />
    </div>
  );
}
