'use client'

import { useChat, type UseChatOptions } from '@ai-sdk/react'
import { useState } from 'react'
import { Send } from 'lucide-react'
import type { FC } from 'react'

const Chat: FC = () => {
  const [error, setError] = useState<string | null>(null);
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat',
    onError: (error) => {
      console.error('Chat error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage || 'エラーが発生しました');
    },
    onResponse: (response) => {
      if (!response.ok) {
        setError(`APIエラー: ${response.status}`);
        return;
      }
      console.log('API response status:', response.status);
      setError(null); // エラーをクリア
    }
  } as UseChatOptions)
  const [isTyping, setIsTyping] = useState(false)

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    setError(null); // 送信時にエラーをクリア
    setIsTyping(true);
    try {
      await handleSubmit(e);
    } catch (err) {
      console.error('Submit error:', err);
      setError('メッセージの送信に失敗しました');
    } finally {
      setIsTyping(false);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] rounded-lg p-3 ${m.role === 'user' ? 'bg-blue-500 text-white' : 'bg-white text-gray-800'}`}>
              {m.content}
            </div>
          </div>
        ))}
        {error && (
          <div className="flex justify-center">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          </div>
        )}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-800 rounded-lg p-3">
              AIが入力中...
            </div>
          </div>
        )}
      </div>
      <div className="p-4 bg-white border-t">
        <form onSubmit={onSubmit} className="flex space-x-2">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="メッセージを入力..."
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" disabled={isTyping} className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  )
}

export default Chat;
