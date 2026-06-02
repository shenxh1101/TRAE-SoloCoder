import { X, Download, Clock, Trophy, Swords, FileText } from 'lucide-react'
import { useDebateStore } from '@/store/debateStore'
import type { DebateSummary } from '@/utils/types'

export default function SummaryModal() {
  const { currentSession, showSummary, dismissSummary } = useDebateStore()

  if (!showSummary || !currentSession?.summary) return null

  const summary: DebateSummary = currentSession.summary

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return m > 0 ? `${m}分${s}秒` : `${s}秒`
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl w-full max-w-lg mx-4 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A2A]">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#E63946]" />
            <h2 className="text-white font-bold text-lg">辩论摘要</h2>
          </div>
          <button
            onClick={dismissSummary}
            className="text-gray-500 hover:text-white transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Swords className="w-4 h-4 text-[#E63946]" />
              <span className="text-sm font-semibold text-gray-300">辩题</span>
            </div>
            <p className="text-white text-base">{summary.topic}</p>
            <div className="flex gap-4 mt-2">
              <span className="text-xs text-emerald-400">你：{summary.userStance}</span>
              <span className="text-xs text-orange-400">AI：{summary.aiStance}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#0D0D0D] rounded-xl p-3 border border-[#2A2A2A]">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Swords className="w-3.5 h-3.5 text-[#E63946]" />
                <span className="text-xs text-gray-400">总回合</span>
              </div>
              <p className="text-xl font-bold text-white">{summary.totalRounds}</p>
            </div>
            <div className="bg-[#0D0D0D] rounded-xl p-3 border border-[#2A2A2A]">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Trophy className="w-3.5 h-3.5 text-[#D4A574]" />
                <span className="text-xs text-gray-400">AI评分</span>
              </div>
              <p className="text-xl font-bold text-[#D4A574]">{summary.averageScore}/5</p>
            </div>
            <div className="bg-[#0D0D0D] rounded-xl p-3 border border-[#2A2A2A]">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Clock className="w-3.5 h-3.5 text-[#D4A574]" />
                <span className="text-xs text-gray-400">时长</span>
              </div>
              <p className="text-xl font-bold text-white">{formatDuration(summary.duration)}</p>
            </div>
          </div>

          <div className="bg-[#0D0D0D] rounded-xl p-4 border border-[#2A2A2A]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-400">AI人设</span>
              <span className="text-sm font-semibold text-[#E63946]">{summary.aiPersona.name} ({summary.aiPersona.id})</span>
            </div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">逻辑评分趋势</span>
              <span className="text-xs text-[#D4A574]">均分 {summary.averageScore}/5</span>
            </div>
            <div className="h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#E63946] to-[#D4A574] rounded-full transition-all duration-500"
                style={{ width: `${(summary.averageScore / 5) * 100}%` }}
              />
            </div>
            {summary.scoreHistory.length > 0 && (
              <div className="flex items-center gap-1.5 mt-2">
                {summary.scoreHistory.map((s, i) => (
                  <div key={i} className="flex flex-col items-center gap-0.5">
                    <span className="text-xs text-[#D4A574]">{s.score}</span>
                    <div className="w-4 h-4 rounded bg-[#D4A574]/20 border border-[#D4A574]/40 flex items-center justify-center">
                      <span className="text-[8px] text-[#D4A574]">R{i + 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-xs text-emerald-400 font-semibold">你的关键论点</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {summary.keyArguments.user.map((arg, i) => (
                  <span key={i} className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-md border border-emerald-500/20">
                    {arg}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <span className="text-xs text-orange-400 font-semibold">AI关键论点</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {summary.keyArguments.ai.map((arg, i) => (
                  <span key={i} className="text-xs bg-orange-500/10 text-orange-400 px-2 py-1 rounded-md border border-orange-500/20">
                    {arg}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#2A2A2A] flex items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-[#2A2A2A] text-gray-300 px-5 py-2.5 rounded-xl hover:bg-[#333] transition-colors border border-[#333]"
          >
            <Download className="w-4 h-4" />
            导出JSON
          </button>
          <button
            onClick={dismissSummary}
            className="flex-1 bg-[#E63946] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-[#C62D3A] transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}
