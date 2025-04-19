'use client';

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

interface ChatMessageProps {
  message: DisplayMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
  // メッセージの内容を表示する関数
  const renderContent = () => {
    // 特別なマーカーでツール呼び出しを検出
    const hasToolCallMarker = message.content.includes('[取引データの検索を実行しました]');

    // 通常のテキスト表示
    if (!hasToolCallMarker) {
      return <div className="whitespace-pre-wrap">{message.content}</div>;
    }

    // ツール呼び出しマーカーを分離して表示
    const parts = message.content.split('[取引データの検索を実行しました]');
    return (
      <div className="space-y-2">
        <div className="whitespace-pre-wrap">{parts[0]}</div>

        {parts.length > 1 && (
          <div className="mt-2 text-xs text-gray-500 bg-gray-100 p-2 rounded">
            取引データの検索を実行しました
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full py-8 px-4">
      <div className="w-full max-w-3xl mx-auto flex gap-4">
        <div className={`w-8 h-8 rounded-sm flex items-center justify-center shrink-0 ${
          message.role === 'assistant'
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        }`}>
          {message.role === 'assistant' ? 'AI' : '👤'}
        </div>
        <div className={`flex-1 space-y-2 ${
          message.role === 'user'
            ? 'p-4 bg-primary text-primary-foreground rounded-lg'
            : ''
        }`}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
