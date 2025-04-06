import { useChat as useVercelChat } from 'ai/react';
import { Message } from 'ai';

interface UseChatProps {
  chatId: string | null;
  initialMessages?: Message[];
}

export function useChat({ chatId, initialMessages = [] }: UseChatProps) {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit: vercelHandleSubmit,
    isLoading,
    setMessages
  } = useVercelChat({
    api: '/api/chat',
    body: {
      chatId
    },
    initialMessages,
    onResponse: (response) => {
      // レスポンスの処理をカスタマイズ
      console.log('AIレスポンス受信:', response);
    },
    onFinish: (message) => {
      // 完了時の処理
      console.log('AIレスポンス完了:', message);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    // Vercel AI SDKのhandleSubmitを呼び出す
    await vercelHandleSubmit(e);
  };

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    setMessages
  };
} 