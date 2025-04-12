import { useChat as useVercelChat, Message } from 'ai/react';

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
    id: chatId || undefined,
    api: '/api/chat',
    initialMessages,
    onResponse: (response: Response) => {
      console.log('AIレスポンス受信:', response);
    },
    onFinish: (message: Message) => {
      console.log('AIレスポンス完了:', message);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
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