import { useEffect, useRef } from 'react'
import { Bot, User, Loader2 } from 'lucide-react'
import StarRating from './StarRating'
import { useDebateStore } from '@/store/debateStore'

export default function ChatArea() {
  const { currentSession, isDebating, isGenerating, scoreAIMessage } = useDebateStore()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentSession?.messages.length, isGenerating])

  if (!currentSession) return null

  const messages = currentSession.messages

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
      {messages.length === 0 && (
        <div className="flex items-center justify-center h-full text-gray-500 text-sm">
          辩论尚未开始，点击「开始辩论」
        </div>
      )}
      {messages.map((msg) => {
        const isAI = msg.role === 'ai'
        return (
          <div key={msg.id} className={`flex gap-3 ${isAI ? 'justify-start' : 'justify-end'}`}>
            {isAI && (
              <div className="shrink-0 w-8 h-8 rounded-full bg-[#2A2A2A] flex items-center justify-center border border-[#333]">
                <Bot className="w-4 h-4 text-[#E63946]" />
              </div>
            )}
            <div className={`max-w-[70%] ${isAI ? 'order-2' : ''}`}>
              <div
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  isAI
                    ? 'bg-[#2A2A2A] text-gray-200 rounded-tl-sm'
                    : 'bg-[#E63946] text-white rounded-tr-sm'
                }`}
              >
                {msg.content}
              </div>
              {isAI && isDebating && msg.score === undefined && messages.indexOf(msg) > 0 && (
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-xs text-gray-500">逻辑性评分</span>
                  <StarRating score={msg.score} onScore={(s) => scoreAIMessage(msg.id, s)} />
                </div>
              )}
              {isAI && msg.score !== undefined && (
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-xs text-gray-500">已评分</span>
                  <StarRating score={msg.score} onScore={() => {}} />
                </div>
              )}
            </div>
            {!isAI && (
              <div className="shrink-0 w-8 h-8 rounded-full bg-[#E63946]/20 flex items-center justify-center border border-[#E63946]/30">
                <User className="w-4 h-4 text-[#E63946]" />
              </div>
            )}
          </div>
        )
      })}
      {isGenerating && (
        <div className="flex gap-3 justify-start">
          <div className="shrink-0 w-8 h-8 rounded-full bg-[#2A2A2A] flex items-center justify-center border border-[#333]">
            <Bot className="w-4 h-4 text-[#E63946]" />
          </div>
          <div className="bg-[#2A2A2A] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-[#E63946] animate-spin" />
            <span className="text-sm text-gray-400">正在思考回应...</span>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
