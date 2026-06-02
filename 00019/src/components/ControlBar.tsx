import { useState } from 'react'
import { Send, Play, Square, Download } from 'lucide-react'
import { useDebateStore } from '@/store/debateStore'

export default function ControlBar() {
  const { currentSession, isDebating, isGenerating, startDebate, sendUserMessage, endDebate } = useDebateStore()
  const [input, setInput] = useState('')

  if (!currentSession) return null

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return
    const msg = input
    setInput('')
    await sendUserMessage(msg)
  }

  const handleExport = () => {
    const data = JSON.stringify(currentSession, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `debate_${currentSession.id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="border-t border-[#1A1A1A] bg-[#0D0D0D] px-6 py-4">
      {!isDebating && currentSession.messages.length === 0 ? (
        <div className="flex items-center gap-3">
          <button
            onClick={startDebate}
            className="flex items-center gap-2 bg-[#E63946] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#C62D3A] transition-all active:scale-95 shadow-[0_0_20px_rgba(230,57,70,0.3)]"
          >
            <Play className="w-4 h-4" />
            开始辩论
          </button>
          <div className="flex-1 text-sm text-gray-500">
            你将持 <span className="text-emerald-400">{currentSession.userStance}</span>，AI持 <span className="text-orange-400">{currentSession.aiStance}</span>
          </div>
        </div>
      ) : !isDebating ? (
        <div className="flex items-center gap-3">
          <div className="flex-1 text-sm text-gray-400">
            辩论已结束
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-[#2A2A2A] text-gray-300 px-4 py-2.5 rounded-xl hover:bg-[#333] transition-colors border border-[#1A1A1A]"
          >
            <Download className="w-4 h-4" />
            导出JSON
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isGenerating ? 'AI正在思考...' : '输入你的反驳...'}
            disabled={isGenerating}
            className="flex-1 bg-[#2A2A2A] border border-[#1A1A1A] rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-[#E63946] transition-colors text-sm disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isGenerating}
            className="flex items-center gap-2 bg-[#E63946] text-white px-5 py-3 rounded-xl font-semibold hover:bg-[#C62D3A] transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            发送
          </button>
          <button
            onClick={endDebate}
            disabled={isGenerating}
            className="flex items-center gap-2 bg-[#2A2A2A] text-gray-300 px-4 py-3 rounded-xl hover:bg-[#333] transition-colors border border-[#1A1A1A] disabled:opacity-40"
          >
            <Square className="w-4 h-4" />
            结束
          </button>
        </div>
      )}
    </div>
  )
}
