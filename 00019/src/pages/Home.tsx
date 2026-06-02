import { useEffect } from 'react'
import { useDebateStore } from '@/store/debateStore'
import TopicSelector from '@/components/TopicSelector'
import PersonaSwitch from '@/components/PersonaSwitch'
import ChatArea from '@/components/ChatArea'
import ControlBar from '@/components/ControlBar'
import SummaryModal from '@/components/SummaryModal'
import ApiSettings from '@/components/ApiSettings'
import { Swords, History, RotateCcw } from 'lucide-react'

export default function Home() {
  const { currentSession, isDebating, sessions, loadSessions, loadLLMConfig } = useDebateStore()

  useEffect(() => {
    loadSessions()
    loadLLMConfig()
  }, [loadSessions, loadLLMConfig])

  const handleNewDebate = () => {
    useDebateStore.setState({ currentSession: null, isDebating: false, showSummary: false, isGenerating: false })
  }

  return (
    <div className="flex h-screen bg-[#0D0D0D] overflow-hidden">
      <aside className="w-80 shrink-0 border-r border-[#1A1A1A] flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1A1A1A] flex items-center gap-2.5">
          <Swords className="w-6 h-6 text-[#E63946]" />
          <h1 className="text-white font-bold text-lg tracking-tight">AI辩论陪练</h1>
        </div>

        <div className="flex-1 overflow-y-auto">
          {currentSession ? (
            <div className="p-5 space-y-5">
              <div className="bg-[#2A2A2A] rounded-xl p-4 border border-[#1A1A1A]">
                <div className="text-xs text-gray-500 mb-1">当前辩题</div>
                <div className="text-white text-sm font-semibold">{currentSession.topic}</div>
                <div className="flex flex-col gap-0.5 mt-2">
                  <span className="text-xs text-emerald-400">你：{currentSession.userStance}</span>
                  <span className="text-xs text-orange-400">AI：{currentSession.aiStance}</span>
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-2">AI人设</div>
                <PersonaSwitch />
              </div>

              <div className="flex items-center justify-between">
                <ApiSettings />
              </div>

              <button
                onClick={handleNewDebate}
                className="flex items-center gap-2 w-full bg-[#2A2A2A] text-gray-400 px-4 py-2.5 rounded-xl hover:text-white hover:bg-[#333] transition-colors text-sm border border-[#1A1A1A]"
              >
                <RotateCcw className="w-4 h-4" />
                选择新辩题
              </button>

              {sessions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <History className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-xs text-gray-500">历史辩论 ({sessions.length})</span>
                  </div>
                  <div className="space-y-2">
                    {sessions.slice(0, 5).map((s) => (
                      <a
                        key={s.id}
                        href={`/record/${s.id}`}
                        className="block bg-[#0D0D0D] rounded-lg p-3 border border-[#1A1A1A] hover:border-[#E63946]/30 transition-colors"
                      >
                        <div className="text-white text-xs font-medium truncate">{s.topic}</div>
                        <div className="text-gray-500 text-xs mt-1">
                          {s.messages.filter(m => m.role === 'user').length}回合
                          {s.summary ? ` · 评分${s.summary.averageScore}` : ''}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto">
                <TopicSelector />
              </div>
              <div className="px-5 py-3 border-t border-[#1A1A1A]">
                <ApiSettings />
              </div>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        {currentSession ? (
          <>
            <ChatArea />
            <ControlBar />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <Swords className="w-16 h-16 text-[#E63946]/30 mx-auto" />
              <div>
                <h2 className="text-white text-xl font-bold">选择一个辩题开始</h2>
                <p className="text-gray-500 text-sm mt-1">从左侧选择预设辩题或输入自定义辩题</p>
              </div>
            </div>
          </div>
        )}
      </main>

      <SummaryModal />
    </div>
  )
}
