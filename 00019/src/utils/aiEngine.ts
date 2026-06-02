import type { PersonaId, ScoreStrategy, LLMConfig, DebateMessage } from './types'
import { callLLM, buildDebateSystemPrompt, isLLMReady } from './llmService'

export interface TopicDef {
  title: string
  proStance: string
  conStance: string
  aiOpeningCon: string
  aiOpeningPro: string
}

export const TOPICS: TopicDef[] = [
  {
    title: '人工智能是否会取代人类工作',
    proStance: 'AI将取代大部分人类工作',
    conStance: 'AI不会取代人类工作',
    aiOpeningCon: '说AI会取代人类工作，未免太看低人类的创造力了。每一次技术革命都消灭了旧岗位，但同时也创造了更多新岗位——蒸汽机如此，计算机如此，AI也不例外。人类独有的同理心、判断力和创造力，是算法永远无法复制的。',
    aiOpeningPro: '历史已经给出了答案：从棋手到画师，从司机到翻译，AI正在一个接一个地接管曾经被认为"只有人类能做"的工作。这不是危言耸听，而是正在发生的现实。当GPT能写代码、Midjourney能出图，你凭什么觉得你的岗位是例外？',
  },
  {
    title: '社交媒体对人类社会利大于弊',
    proStance: '社交媒体利大于弊',
    conStance: '社交媒体弊大于利',
    aiOpeningCon: '社交媒体把人与人之间的距离拉近了？别开玩笑了。它制造的是一种虚假的连接感——你有一千个好友，却没有一个可以说心里话的人。焦虑、抑郁、信息茧房、网络暴力，这些才是社交媒体真正的"社交"成果。',
    aiOpeningPro: '社交媒体让知识 democratize，让弱者有发声渠道，让异国他乡的亲人随时可见。阿拉伯之春、#MeToo运动，哪个不是社交媒体赋予普通人力量？弊端当然有，但比起它带来的信息民主化与全球连接，那些不过是成长的阵痛。',
  },
  {
    title: '大学教育是否仍然必要',
    proStance: '大学教育仍然必要',
    conStance: '大学教育已经不必要',
    aiOpeningCon: '四年大学，花几十万，出来发现学的东西跟工作完全不搭——这就是你说的"必要"？互联网时代，MIT的课免费看，GitHub上的项目随便练，还有什么知识是必须坐在教室里才能获得的？大学不过是一个过度膨胀的文凭工厂。',
    aiOpeningPro: '大学从来不只是传授知识的地方。它是思维的熔炉、人脉的沃土、独立人格的孵化器。你在课堂上学到的批判性思维，在社团里锻炼的协作能力，在深夜讨论中碰撞出的灵感——这些是任何在线课程都给不了的。',
  },
  {
    title: '远程办公将取代传统办公室',
    proStance: '远程办公将取代传统办公室',
    conStance: '传统办公室不会被取代',
    aiOpeningCon: '你以为在家穿着睡衣就能高效工作？少了面对面碰撞出的灵感火花，缺了茶水间里的即兴讨论，团队的创造力只会日渐萎缩。更别提多少人远程办公的真相是：边带孩子边开会，冰箱和床之间来回游荡，工作和生活的界限彻底崩塌。',
    aiOpeningPro: '传统办公室本质上是一种工业时代的管控思维——你需要被"看到"在工作。远程办公打破了地理枷锁，让人才不再被城市绑架，通勤时间归零，生活品质飙升。Google、Meta都已经拥抱混合办公，这是不可逆的潮流。',
  },
  {
    title: '基因编辑技术应该被全面开放',
    proStance: '基因编辑应该全面开放',
    conStance: '基因编辑不应全面开放',
    aiOpeningCon: '全面开放基因编辑？你是在为科幻灾难片写剧本吗？当富人可以"定制"更聪明、更漂亮的下一代，人类社会将迎来最残酷的基因鸿沟——这比任何阶级分化都更加不可逾越。我们连AI的伦理问题都没搞清楚，就要打开基因的潘多拉魔盒？',
    aiOpeningPro: '基因编辑能根治遗传病、消除先天缺陷、让千万家庭免于痛苦，你却要因为"可能的伦理风险"把它锁在实验室里？每一项革命性技术都曾被恐惧——试管婴儿当年也被视为禁忌，如今呢？全面开放不等于没有监管，但拒绝开放等于让本可避免的苦难继续。',
  },
  {
    title: '全民基本收入制度应该实施',
    proStance: '应该实施全民基本收入',
    conStance: '不应该实施全民基本收入',
    aiOpeningCon: '全民基本收入？听起来很美好，钱从哪来？要么大幅加税扼杀经济活力，要么印钞引发通胀让所有人的钱都不值钱。更可怕的是，当不工作也能拿到钱，有多少人还会选择奋斗？这是一个养懒汉的制度，最终会让整个社会一起变穷。',
    aiOpeningPro: '当AI和自动化消灭了半数工作岗位，你拿什么来维持社会稳定？全民基本收入不是施舍，而是技术进步必须支付的代价。它能消除贫困陷阱，让人有勇气创业、学习、照顾家庭，而不是被困在毫无意义的低薪劳动中。芬兰的实验已经证明了它的效果。',
  },
]

export const PERSONAS = [
  { id: 'toxic' as PersonaId, name: '毒舌型', description: '讽刺挖苦，针针见血', icon: '😈' },
  { id: 'pedantic' as PersonaId, name: '学究型', description: '引经据典，逻辑严密', icon: '🎓' },
  { id: 'passionate' as PersonaId, name: '热血型', description: '激情澎湃，气势如虹', icon: '🔥' },
]

interface ParsedArgument {
  keywords: string[]
  mainClaim: string
  argumentType: 'absolute' | 'causal' | 'comparative' | 'example' | 'general'
  emotionWords: string[]
  hasEvidence: boolean
  sentenceStructure: 'simple' | 'compound' | 'complex'
}

function extractAllNounsAndVerbs(input: string): string[] {
  const segments = input
    .replace(/[，。！？、；：""''【】（）《》\s\n\r,.!?;:]/g, '|')
    .split('|')
    .filter(s => s.length >= 2)
  return segments
}

function parseArgument(input: string): ParsedArgument {
  const allWords = extractAllNounsAndVerbs(input)

  const absoluteWords = ['一定', '必然', '绝对', '永远', '绝不', '所有', '全部', '不可能', '必然', '肯定', '必定', '不会', '就是']
  const causalWords = ['因为', '所以', '导致', '使得', '引起', '造成', '由于', '因此', '于是', '结果', '故而']
  const comparativeWords = ['比', '相比', '不如', '相对', '更多', '更少', '更好', '更差', '优于', '劣于', '超过', '不及']
  const exampleWords = ['比如', '例如', '像', '如', '举例', '以', '就拿', '比方说', '举个例子']
  const evidenceWords = ['研究', '数据', '统计', '报告', '调查', '实验', '证明', '表明', '显示', '根据']

  const hasAbsolute = absoluteWords.some(w => input.includes(w))
  const hasCausal = causalWords.some(w => input.includes(w))
  const hasComparative = comparativeWords.some(w => input.includes(w))
  const hasExample = exampleWords.some(w => input.includes(w))
  const hasEvidence = evidenceWords.some(w => input.includes(w))

  let argumentType: ParsedArgument['argumentType'] = 'general'
  if (hasAbsolute) argumentType = 'absolute'
  else if (hasCausal) argumentType = 'causal'
  else if (hasComparative) argumentType = 'comparative'
  else if (hasExample) argumentType = 'example'

  const emotionMarkers = ['！', '!', '？', '?', '难道', '竟然', '居然', '可笑', '荒唐', '荒谬']
  const emotionWords = emotionMarkers.filter(w => input.includes(w))

  const sentenceCount = input.split(/[。！？.!?]/).filter(s => s.trim()).length
  const commaCount = (input.match(/[，,]/g) || []).length
  let sentenceStructure: ParsedArgument['sentenceStructure'] = 'simple'
  if (sentenceCount <= 1 && commaCount <= 2) sentenceStructure = 'simple'
  else if (sentenceCount >= 3 || commaCount >= 5) sentenceStructure = 'complex'
  else sentenceStructure = 'compound'

  const mainClaim = allWords.length > 0 ? allWords[0] : input.slice(0, 10)

  return {
    keywords: allWords.slice(0, 8),
    mainClaim,
    argumentType,
    emotionWords,
    hasEvidence,
    sentenceStructure,
  }
}

interface ResponseStrategy {
  logicConnectors: string[]
  emotionalMarkers: string[]
  sentenceLength: 'short' | 'medium' | 'long'
  structurePreference: 'counter' | 'extend' | 'redirect'
}

function getResponseStrategy(
  lastScore: number | null,
  avgScore: number
): ResponseStrategy {
  if (lastScore !== null) {
    if (lastScore <= 1) {
      return {
        logicConnectors: ['但是', '不过', '话说回来'],
        emotionalMarkers: ['！', '？', '你以为呢', '难道不是吗', '啊'],
        sentenceLength: 'short',
        structurePreference: 'counter',
      }
    }
    if (lastScore >= 5) {
      return {
        logicConnectors: ['因为', '所以', '然而', '因此', '由此可见', '进一步来说', '从这个角度看'],
        emotionalMarkers: [],
        sentenceLength: 'long',
        structurePreference: 'extend',
      }
    }
  }

  if (avgScore >= 4) {
    return {
      logicConnectors: ['因为', '所以', '然而', '因此', '由此可见'],
      emotionalMarkers: [],
      sentenceLength: 'long',
      structurePreference: 'extend',
    }
  }
  if (avgScore <= 1) {
    return {
      logicConnectors: ['但是', '不过'],
      emotionalMarkers: ['！', '？', '难道不是吗'],
      sentenceLength: 'short',
      structurePreference: 'counter',
    }
  }

  return {
    logicConnectors: ['然而', '但是', '因此'],
    emotionalMarkers: ['！'],
    sentenceLength: 'medium',
    structurePreference: 'counter',
  }
}

interface PersonaLexicon {
  openings: string[]
  counters: string[]
  agreements: string[]
  transitions: string[]
  conclusions: string[]
  toneWords: string[]
}

const TOXIC_LEXICON: PersonaLexicon = {
  openings: ['别逗了', '醒醒吧', '得了吧', '少来这套', '又来'],
  counters: ['恰恰相反', '你搞错了因果', '这是典型的偷换概念', '你的逻辑有问题', '这根本站不住脚'],
  agreements: ['就算你说的没错', '退一步说', '即便如此', '就算承认这一点'],
  transitions: ['再说了', '更重要的是', '还有', '另外'],
  conclusions: ['所以说', '到头来', '归根结底', '简而言之'],
  toneWords: ['可笑', '荒谬', '荒唐', '幼稚', '天真', '自欺欺人', '一厢情愿'],
}

const PEDANTIC_LEXICON: PersonaLexicon = {
  openings: ['从学术角度看', '需要指出的是', '值得注意的是', '这里需要厘清'],
  counters: ['这一论断存在以下问题', '这个推论忽略了关键变量', '因果关系需要更严格的验证', '概念界定存在模糊之处'],
  agreements: ['诚然', '不可否认', '在一定程度上', '就局部而言'],
  transitions: ['进一步来看', '从方法论角度', '从历史维度', '从逻辑结构上'],
  conclusions: ['综上所述', '由此可见', '因此可以得出', '基于以上分析'],
  toneWords: ['方法论', '概念框架', '因果推断', '实证研究', '理论建构'],
}

const PASSIONATE_LEXICON: PersonaLexicon = {
  openings: ['说得好！', '这正是关键！', '你触及了核心！', '没错！'],
  counters: ['恰恰相反！', '不对！', '这正是我们要反驳的！', '不能这样看！'],
  agreements: ['你说的有道理！', '这一点我认同！', '说得没错！'],
  transitions: ['更重要的是！', '别忘了！', '你想想！', '再想想！'],
  conclusions: ['所以我们必须行动！', '这就是为什么！', '历史将证明！', '让我们面对现实！'],
  toneWords: ['力量', '勇气', '变革', '未来', '觉醒', '突破', '使命'],
}

const PERSONA_LEXICONS: Record<PersonaId, PersonaLexicon> = {
  toxic: TOXIC_LEXICON,
  pedantic: PEDANTIC_LEXICON,
  passionate: PASSIONATE_LEXICON,
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function buildCounterArgument(
  parsed: ParsedArgument,
  persona: PersonaId,
  strategy: ResponseStrategy
): string {
  const lex = PERSONA_LEXICONS[persona]
  const mainKw = parsed.keywords[0] || '这个论点'
  const subKws = parsed.keywords.slice(1, 4)

  const parts: string[] = []

  if (strategy.sentenceLength === 'short') {
    parts.push(pick(lex.openings))
    parts.push(pick(lex.counters))
    if (mainKw !== '这个论点') {
      parts.push(`关于"${mainKw}"`)
    }
    parts.push(pick(lex.conclusions))
  } else if (strategy.sentenceLength === 'long') {
    parts.push(pick(lex.openings) + '——')

    if (parsed.argumentType === 'absolute') {
      parts.push(`${pick(lex.counters)}：绝对化的判断在复杂现实中几乎永远不成立。`)
      parts.push(`${pick(strategy.logicConnectors)}，"${mainKw}"这个概念的适用范围本身就有边界。`)
      if (subKws.length > 0) {
        parts.push(`${pick(strategy.logicConnectors)}，你提到的${subKws.slice(0, 2).join('、')}等概念也需要更精确的界定。`)
      }
    } else if (parsed.argumentType === 'causal') {
      parts.push(`${pick(lex.counters)}：相关不等于因果。`)
      parts.push(`${pick(strategy.logicConnectors)}，你归因于"${mainKw}"的现象，可能有更深层的结构性原因。`)
      if (parsed.hasEvidence) {
        parts.push(`${pick(strategy.logicConnectors)}，即使数据显示相关性，也不能直接推断因果链条。`)
      }
    } else if (parsed.argumentType === 'comparative') {
      parts.push(`${pick(lex.counters)}：比较的前提是可比性。`)
      parts.push(`${pick(strategy.logicConnectors)}，你拿"${mainKw}"来比较，但比较维度本身就存在选择性偏差。`)
      if (subKws.length > 0) {
        parts.push(`${pick(strategy.logicConnectors)}，换一个维度看${subKws.slice(0, 2).join('、')}，结论可能完全相反。`)
      }
    } else if (parsed.argumentType === 'example') {
      parts.push(`${pick(lex.counters)}：个案不等于普遍规律。`)
      parts.push(`${pick(strategy.logicConnectors)}，"${mainKw}"这个例子本身可能存在幸存者偏差。`)
      parts.push(`${pick(strategy.logicConnectors)}，论证需要系统性证据支撑，而不是精心挑选的轶事。`)
    } else {
      parts.push(`${pick(lex.counters)}：你关于"${mainKw}"的论证前提需要更坚实的支撑。`)
      if (subKws.length > 0) {
        parts.push(`${pick(strategy.logicConnectors)}，${subKws.slice(0, 2).join('、')}等相关概念也需要进一步厘清。`)
      }
    }

    parts.push(pick(lex.conclusions))
    if (persona === 'pedantic') {
      parts.push('，论证的严谨性是辩论的基础。')
    }
  } else {
    parts.push(pick(lex.counters))
    parts.push(`${pick(strategy.logicConnectors)}，"${mainKw}"这个点站不住脚。`)
    if (subKws.length > 0) {
      parts.push(`${pick(strategy.logicConnectors)}，${subKws.slice(0, 2).join('、')}也同样值得商榷。`)
    }
  }

  let response = parts.join('')

  if (strategy.emotionalMarkers.length > 0 && persona !== 'pedantic') {
    if (Math.random() > 0.4) {
      response += pick(strategy.emotionalMarkers)
    }
  }

  if (persona === 'toxic' && strategy.sentenceLength !== 'long') {
    if (Math.random() > 0.5) {
      response += pick(['', ' 这太' + pick(lex.toneWords) + '了。', ' 真是' + pick(lex.toneWords) + '。'])
    }
  }

  return response
}

function generateLocalResponse(
  userInput: string,
  persona: PersonaId,
  lastScore: number | null,
  avgScore: number
): string {
  const parsed = parseArgument(userInput)
  const strategy = getResponseStrategy(lastScore, avgScore)
  return buildCounterArgument(parsed, persona, strategy)
}

export async function generateAIResponse(
  userInput: string,
  persona: PersonaId,
  lastScore: number | null,
  avgScore: number,
  sessionContext: {
    topic: string
    aiStance: string
    userStance: string
    history: DebateMessage[]
  },
  llmConfig: LLMConfig
): Promise<string> {
  if (isLLMReady(llmConfig)) {
    try {
      const personaInfo = PERSONAS.find(p => p.id === persona)!
      const systemPrompt = buildDebateSystemPrompt({
        personaId: persona,
        personaName: personaInfo.name,
        topic: sessionContext.topic,
        aiStance: sessionContext.aiStance,
        userStance: sessionContext.userStance,
        avgScore,
      })

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...sessionContext.history.slice(-8).map(m => ({
          role: (m.role === 'ai' ? 'assistant' : 'user') as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user' as const, content: userInput },
      ]

      return await callLLM(llmConfig, messages)
    } catch (err) {
      console.warn('LLM调用失败，降级到本地生成:', err)
    }
  }

  return generateLocalResponse(userInput, persona, lastScore, avgScore)
}

export function generateAIOpening(topic: TopicDef, userPicksPro: boolean): string {
  return userPicksPro ? topic.aiOpeningCon : topic.aiOpeningPro
}

export function generateSummary(
  session: {
    topic: string
    userStance: string
    aiStance: string
    messages: { role: string; content: string; score?: number; id: string }[]
    persona: PersonaId
    createdAt: number
    endedAt?: number
  }
) {
  const userMsgs = session.messages.filter(m => m.role === 'user')
  const aiMsgs = session.messages.filter(m => m.role === 'ai')
  const scoredMsgs = aiMsgs.filter(m => m.score !== undefined)
  const avgScore = scoredMsgs.length > 0
    ? scoredMsgs.reduce((sum, m) => sum + (m.score || 0), 0) / scoredMsgs.length
    : 0

  const userKeyArgs = userMsgs.slice(0, 5).map(m => {
    const parsed = parseArgument(m.content)
    return parsed.keywords.length > 0 ? parsed.keywords.slice(0, 2).join('、') : m.content.slice(0, 20)
  })

  const aiKeyArgs = aiMsgs.slice(0, 5).map(m => {
    const parsed = parseArgument(m.content)
    return parsed.keywords.length > 0 ? parsed.keywords.slice(0, 2).join('、') : m.content.slice(0, 20)
  })

  const scoreHistory = aiMsgs
    .filter(m => m.score !== undefined)
    .map(m => ({ messageId: m.id, score: m.score! }))

  const personaInfo = PERSONAS.find(p => p.id === session.persona)

  return {
    topic: session.topic,
    userStance: session.userStance,
    aiStance: session.aiStance,
    aiPersona: {
      id: session.persona,
      name: personaInfo?.name || session.persona,
    },
    totalRounds: userMsgs.length,
    keyArguments: { user: userKeyArgs, ai: aiKeyArgs },
    averageScore: Math.round(avgScore * 10) / 10,
    scoreHistory,
    duration: session.endedAt
      ? Math.round((session.endedAt - session.createdAt) / 1000)
      : 0,
  }
}
