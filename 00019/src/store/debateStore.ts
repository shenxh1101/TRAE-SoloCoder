import { create } from 'zustand'
import type { DebateSession, DebateMessage, PersonaId, DebateSummary, LLMConfig } from '@/utils/types'
import { DEFAULT_LLM_CONFIG } from '@/utils/types'
import {
  generateAIResponse,
  generateAIOpening,
  generateSummary,
  TOPICS,
} from '@/utils/aiEngine'
import { loadLLMConfig } from '@/utils/llmService'

interface DebateState {
  sessions: DebateSession[]
  currentSession: DebateSession | null
  isDebating: boolean
  isGenerating: boolean
  showSummary: boolean
  llmConfig: LLMConfig
  lastAIMessageScore: number | null

  selectTopic: (topicIndex: number, userPicksPro: boolean) => void
  setCustomTopic: (topic: string, userPicksPro: boolean) => void
  setPersona: (persona: PersonaId) => void
  startDebate: () => void
  sendUserMessage: (content: string) => Promise<void>
  scoreAIMessage: (messageId: string, score: number) => void
  endDebate: () => void
  dismissSummary: () => void
  deleteSession: (id: string) => void
  loadSessions: () => void
  loadLLMConfig: () => void
  updateLLMConfig: (config: LLMConfig) => void
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function calcAvgScore(messages: DebateMessage[]): number {
  const scored = messages.filter(m => m.role === 'ai' && m.score !== undefined)
  if (scored.length === 0) return 3
  return scored.reduce((sum, m) => sum + (m.score || 0), 0) / scored.length
}

function getLastAIScore(messages: DebateMessage[]): number | null {
  const aiMessages = messages.filter(m => m.role === 'ai')
  if (aiMessages.length === 0) return null
  const last = aiMessages[aiMessages.length - 1]
  return last.score !== undefined ? last.score : null
}

function persistSessions(sessions: DebateSession[]) {
  try {
    localStorage.setItem('debate_sessions', JSON.stringify(sessions))
  } catch {}
}

export const useDebateStore = create<DebateState>((set, get) => ({
  sessions: [],
  currentSession: null,
  isDebating: false,
  isGenerating: false,
  showSummary: false,
  llmConfig: DEFAULT_LLM_CONFIG,
  lastAIMessageScore: null,

  selectTopic: (topicIndex, userPicksPro) => {
    const topic = TOPICS[topicIndex]
    if (!topic) return
    const session: DebateSession = {
      id: genId(),
      topic: topic.title,
      userStance: userPicksPro ? topic.proStance : topic.conStance,
      aiStance: userPicksPro ? topic.conStance : topic.proStance,
      persona: 'toxic',
      messages: [],
      averageScore: 3,
      createdAt: Date.now(),
    }
    set({ currentSession: session, isDebating: false, showSummary: false, lastAIMessageScore: null })
  },

  setCustomTopic: (topic, userPicksPro) => {
    const session: DebateSession = {
      id: genId(),
      topic,
      userStance: userPicksPro ? `支持：${topic}` : `反对：${topic}`,
      aiStance: userPicksPro ? `反对：${topic}` : `支持：${topic}`,
      persona: 'toxic',
      messages: [],
      averageScore: 3,
      createdAt: Date.now(),
    }
    set({ currentSession: session, isDebating: false, showSummary: false, lastAIMessageScore: null })
  },

  setPersona: (persona) => {
    const { currentSession } = get()
    if (!currentSession) return
    set({ currentSession: { ...currentSession, persona } })
  },

  startDebate: () => {
    const { currentSession } = get()
    if (!currentSession) return

    const topicDef = TOPICS.find(t => t.title === currentSession.topic)
    const userPicksPro = currentSession.userStance.includes('支持') || currentSession.userStance === topicDef?.proStance

    let openingContent: string
    if (topicDef) {
      openingContent = generateAIOpening(topicDef, userPicksPro)
    } else {
      openingContent = `我坚决反对你的立场。${currentSession.topic}——这个命题本身就值得被质疑。让我来告诉你，为什么你的观点站不住脚。`
    }

    const aiMessage: DebateMessage = {
      id: genId(),
      role: 'ai',
      content: openingContent,
      timestamp: Date.now(),
    }

    const updatedSession = {
      ...currentSession,
      messages: [aiMessage],
    }
    set({ currentSession: updatedSession, isDebating: true, lastAIMessageScore: null })
  },

  sendUserMessage: async (content) => {
    const { currentSession, llmConfig, lastAIMessageScore } = get()
    if (!currentSession || !content.trim()) return

    const userMsg: DebateMessage = {
      id: genId(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    }

    const messagesAfterUser = [...currentSession.messages, userMsg]
    const avgScore = calcAvgScore(messagesAfterUser)

    set({
      currentSession: { ...currentSession, messages: messagesAfterUser, averageScore: avgScore },
      isGenerating: true,
    })

    try {
      const aiContent = await generateAIResponse(
        content,
        currentSession.persona,
        lastAIMessageScore,
        avgScore,
        {
          topic: currentSession.topic,
          aiStance: currentSession.aiStance,
          userStance: currentSession.userStance,
          history: currentSession.messages,
        },
        llmConfig
      )

      const aiMsg: DebateMessage = {
        id: genId(),
        role: 'ai',
        content: aiContent,
        timestamp: Date.now(),
      }

      const latestSession = get().currentSession
      if (!latestSession) return

      const updatedSession = {
        ...latestSession,
        messages: [...latestSession.messages, aiMsg],
        averageScore: calcAvgScore([...latestSession.messages, aiMsg]),
      }
      set({ currentSession: updatedSession, isGenerating: false, lastAIMessageScore: null })
    } catch {
      const latestSession = get().currentSession
      if (!latestSession) return

      const aiMsg: DebateMessage = {
        id: genId(),
        role: 'ai',
        content: '抱歉，我暂时无法回应。请稍后重试。',
        timestamp: Date.now(),
      }

      const updatedSession = {
        ...latestSession,
        messages: [...latestSession.messages, aiMsg],
      }
      set({ currentSession: updatedSession, isGenerating: false, lastAIMessageScore: null })
    }
  },

  scoreAIMessage: (messageId, score) => {
    const { currentSession } = get()
    if (!currentSession) return

    const messages = currentSession.messages.map(m =>
      m.id === messageId ? { ...m, score } : m
    )
    const avgScore = calcAvgScore(messages)
    const lastScore = getLastAIScore(messages)

    set({
      currentSession: { ...currentSession, messages, averageScore: avgScore },
      lastAIMessageScore: lastScore,
    })
  },

  endDebate: () => {
    const { currentSession, sessions } = get()
    if (!currentSession) return

    const endedAt = Date.now()
    const summary: DebateSummary = generateSummary({
      ...currentSession,
      endedAt,
    })

    const updatedSession: DebateSession = {
      ...currentSession,
      endedAt,
      summary,
    }

    const existingIdx = sessions.findIndex(s => s.id === updatedSession.id)
    let newSessions: DebateSession[]
    if (existingIdx >= 0) {
      newSessions = [...sessions]
      newSessions[existingIdx] = updatedSession
    } else {
      newSessions = [updatedSession, ...sessions]
    }

    persistSessions(newSessions)
    set({
      currentSession: updatedSession,
      sessions: newSessions,
      isDebating: false,
      isGenerating: false,
      showSummary: true,
      lastAIMessageScore: null,
    })
  },

  dismissSummary: () => {
    set({ showSummary: false })
  },

  deleteSession: (id) => {
    const { sessions, currentSession } = get()
    const newSessions = sessions.filter(s => s.id !== id)
    persistSessions(newSessions)
    set({
      sessions: newSessions,
      currentSession: currentSession?.id === id ? null : currentSession,
    })
  },

  loadSessions: () => {
    try {
      const data = localStorage.getItem('debate_sessions')
      if (data) {
        set({ sessions: JSON.parse(data) })
      }
    } catch {}
  },

  loadLLMConfig: () => {
    set({ llmConfig: loadLLMConfig() })
  },

  updateLLMConfig: (config) => {
    set({ llmConfig: config })
  },
}))
