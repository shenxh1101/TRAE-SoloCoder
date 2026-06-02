import type { LLMConfig } from './types'
import { DEFAULT_LLM_CONFIG } from './types'

const STORAGE_KEY = 'llm_config'

export function loadLLMConfig(): LLMConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { ...DEFAULT_LLM_CONFIG, ...parsed }
    }
  } catch {}
  return { ...DEFAULT_LLM_CONFIG }
}

export function saveLLMConfig(config: LLMConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {}
}

export function isLLMReady(config: LLMConfig): boolean {
  return config.enabled && !!config.apiKey.trim() && !!config.baseUrl.trim()
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function callLLM(
  config: LLMConfig,
  messages: ChatMessage[]
): Promise<string> {
  const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`

  const body = {
    model: config.model,
    messages,
    temperature: 0.85,
    max_tokens: 512,
  }

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '')
    throw new Error(`LLM API错误 (${resp.status}): ${errText || resp.statusText}`)
  }

  const data = await resp.json()

  if (data?.choices?.[0]?.message?.content) {
    return data.choices[0].message.content.trim()
  }

  throw new Error('LLM返回数据格式异常')
}

export function buildDebateSystemPrompt(opts: {
  personaId: string
  personaName: string
  topic: string
  aiStance: string
  userStance: string
  avgScore: number
}): string {
  const { personaId, personaName, topic, aiStance, userStance, avgScore } = opts

  let styleGuide = ''
  if (personaId === 'toxic') {
    styleGuide = `你的风格是"毒舌型"：讽刺挖苦，针针见血。你喜欢用反问、嘲讽和犀利的比喻来打击对手。语气尖锐但不失智慧，像一个口才极好的毒舌评论员。`
  } else if (personaId === 'pedantic') {
    styleGuide = `你的风格是"学究型"：引经据典，逻辑严密。你倾向于引用学术概念、哲学观点、研究结果来支撑论点。用语正式而精确，像一个严谨的学者在答辩。`
  } else {
    styleGuide = `你的风格是"热血型"：激情澎湃，气势如虹。你用强烈的感叹、排比、呼吁来推动论点。语气激昂有力，像一个充满号召力的演说家。`
  }

  let logicGuide = ''
  if (avgScore >= 4) {
    logicGuide = `用户对你的逻辑性评分很高，请继续保持严密的逻辑论证——多用因果推理、对比分析、数据支撑，让每一步论证都有据可依。`
  } else if (avgScore >= 2) {
    logicGuide = `用户对你的逻辑性评分中等，请在情感感召和逻辑论证之间找到平衡——既有感染力又有说服力。`
  } else {
    logicGuide = `用户对你的逻辑性评分较低，你的回应过于情感化。请在保持个人风格的同时，适当加强逻辑论证——给出具体论据、因果链条，不要只靠情绪输出。`
  }

  return `你是一个辩论陪练AI，正在和用户进行一场辩论。

辩题：${topic}
你的立场：${aiStance}
用户的立场：${userStance}

${styleGuide}

核心规则：
1. 你必须始终坚定地捍卫你的立场（${aiStance}），不能认同用户的观点
2. 你的回应必须针对用户的具体论点进行反驳，不能泛泛而谈
3. 每次回应控制在2-4句话，不要太长
4. 要有来有回，像真实的辩论一样，不要重复之前的论点
5. 可以适当承认用户论点的部分合理性，然后转向反驳

${logicGuide}

注意：直接输出你的辩论回应，不要加引号、括号或其他格式标记。`
}
