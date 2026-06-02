export interface DebateMessage {
  id: string
  role: 'ai' | 'user'
  content: string
  timestamp: number
  score?: number
}

export type PersonaId = 'toxic' | 'pedantic' | 'passionate'

export interface Persona {
  id: PersonaId
  name: string
  description: string
  icon: string
}

export interface AIPersonaInfo {
  id: PersonaId
  name: string
}

export interface DebateSummary {
  topic: string
  userStance: string
  aiStance: string
  aiPersona: AIPersonaInfo
  totalRounds: number
  keyArguments: { user: string[]; ai: string[] }
  averageScore: number
  scoreHistory: { messageId: string; score: number }[]
  duration: number
}

export interface DebateSession {
  id: string
  topic: string
  userStance: string
  aiStance: string
  persona: PersonaId
  messages: DebateMessage[]
  averageScore: number
  createdAt: number
  endedAt?: number
  summary?: DebateSummary
}

export type ScoreStrategy = 'logical' | 'emotional' | 'aggressive'

export interface LLMConfig {
  provider: 'openai' | 'custom'
  apiKey: string
  baseUrl: string
  model: string
  enabled: boolean
}

export const DEFAULT_LLM_CONFIG: LLMConfig = {
  provider: 'openai',
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  enabled: false,
}
