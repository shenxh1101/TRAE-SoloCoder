import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useDebateStore } from '@/store/debateStore'
import { ArrowLeft, Download, Clock, Trophy, Swords, Bot, User, Trash2 } from 'lucide-react'

export default function Record() {
  const { id } = useParams<{ id: string }>()
  const { sessions, loadSessions, deleteSession } = useDebateStore()

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  const session = sessions.find(s => s.id === id)

  const handleExport = () => {
    if (!session) return
    const data = JSON.stringify(session, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `debate_${session.id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDelete = () => {
    if (!session || !id) return
    deleteSession(id)
  }

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return m > 0 ? `${m}分${s}秒` : `${s}秒`
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-gray-500">未找到辩论记录</p>
          <Link to="/" className="text-[#E63946] hover:underline text-sm">返回首页</Link>
        </div>
      </div>
    )
  }

  const summary = session.summary

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      <header className="border-b border-[#1A1A1A] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-white font-bold text-lg">{session.topic}</h1>
            <div className="flex gap-4 mt-0.5">
              <span className="text-xs text-emerald-400">你：{session.userStance}</span>
              <span className="text-xs text-orange-400">AI：{session.aiStance}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-[#2A2A2A] text-gray-300 px-4 py-2 rounded-xl hover:bg-[#333] transition-colors text-sm border border-[#1A1A1A]"
          >
            <Download className="w-4 h-4" />
            导出JSON
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 bg-[#2A2A2A] text-red-400 px-4 py-2 rounded-xl hover:bg-[#333] transition-colors text-sm border border-[#1A1A1A]"
          >
            <Trash2 className="w-4 h-4" />
            删除
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {summary && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
              <div className="flex items-center gap-2 mb-2">
                <Swords className="w-4 h-4 text-[#E63946]" />
                <span className="text-xs text-gray-400">总回合</span>
              </div>
              <p className="text-2xl font-bold text-white">{summary.totalRounds}</p>
            </div>
            <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-4 h-4 text-[#D4A574]" />
                <span className="text-xs text-gray-400">AI评分</span>
              </div>
              <p className="text-2xl font-bold text-[#D4A574]">{summary.averageScore}/5</p>
            </div>
            <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-[#D4A574]" />
                <span className="text-xs text-gray-400">时长</span>
              </div>
              <p className="text-2xl font-bold text-white">{formatDuration(summary.duration)}</p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h2 className="text-white font-bold text-base">辩论过程</h2>
          <div className="space-y-3">
            {session.messages.map((msg) => {
              const isAI = msg.role === 'ai'
              return (
                <div key={msg.id} className={`flex gap-3 ${isAI ? '' : 'justify-end'}`}>
                  {isAI && (
                    <div className="shrink-0 w-7 h-7 rounded-full bg-[#2A2A2A] flex items-center justify-center border border-[#333] mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-[#E63946]" />
                    </div>
                  )}
                  <div className={`max-w-[75%] ${isAI ? '' : ''}`}>
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        isAI
                          ? 'bg-[#2A2A2A] text-gray-200 rounded-tl-sm'
                          : 'bg-[#E63946] text-white rounded-tr-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                    {isAI && msg.score !== undefined && (
                      <div className="mt-1 text-xs text-[#D4A574]">
                        逻辑性：{'★'.repeat(msg.score)}{'☆'.repeat(5 - msg.score)}
                      </div>
                    )}
                  </div>
                  {!isAI && (
                    <div className="shrink-0 w-7 h-7 rounded-full bg-[#E63946]/20 flex items-center justify-center border border-[#E63946]/30 mt-0.5">
                      <User className="w-3.5 h-3.5 text-[#E63946]" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
