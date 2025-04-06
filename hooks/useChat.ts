import { useState, useCallback } from 'react';
import { Message } from '@/types/chat';

interface UseChatProps {
  chatId: string | null;
}

export function useChat({ chatId }: UseChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMessage.content,
          chatId
        })
      });

      if (!response.ok) {
        throw new Error('チャットの送信に失敗しました');
      }

      const data = await response.json();
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.message
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('チャットエラー:', error);
      // エラーメッセージを表示するなどの処理を追加
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, chatId]);

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading
  };
} 