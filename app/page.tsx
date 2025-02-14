'use client'

import { useChat } from 'ai/react'
import { useState } from 'react'
import { Send } from 'lucide-react'
import type { FC } from 'react'

const Chat: FC = () => {
  const { messages, input, handleInputChange, handleSubmit } = useChat()
  const [isTyping, setIsTyping] = useState(false)

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    setIsTyping(true)
    try {
      handleSubmit(e)
    } finally {
      setIsTyping(false)
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
