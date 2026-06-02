import { RecipeVariant, VariantType } from '../types';

const API_CONFIG = {
  baseUrl: (import.meta.env.VITE_AI_API_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
  apiKey: import.meta.env.VITE_AI_API_KEY || '',
  model: import.meta.env.VITE_AI_MODEL || 'gpt-4o-mini',
};

export interface AIRecipeResponse {
  variants: Array<{
    type: VariantType;
    name: string;
    description: string;
    ingredientChanges: Array<{
      original: string;
      replacement: string;
      reason: string;
    }>;
    fullIngredients: string[];
  }>;
}

const SYSTEM_PROMPT = `你是一位创意美食设计师，擅长将家常菜改造成不同风格的创意菜品。
请根据用户输入的菜名，生成三个变体版本：
1. 低卡健康版 - 适合减脂期，用健康食材替换高热量食材，替换2-3种关键食材
2. 豪华宴客版 - 适合宴请，使用高端食材提升档次，替换2-3种关键食材
3. 异国风味版 - 融入外国菜系特色（如泰式、意式、日式、法式、墨西哥、印度等），选择一种菜系风格，替换2-3种关键食材

每个变体必须包含：
- name: 变体的创意名称
- description: 100字以内的菜品描述
- ingredientChanges: 2-3个关键食材的替换，每个包含 original（原食材）、replacement（替换食材）、reason（改动原因）
- fullIngredients: 完整的食材清单，包括保留的食材和新替换的食材

请严格按照JSON格式返回，不要有多余的文字说明、markdown标记或代码块，只返回纯JSON。`;

function buildUserPrompt(
  dishName: string,
  allergens: string[],
  voteHistory?: Array<{ type: VariantType; score: number }>
): string {
  let prompt = `请为"${dishName}"这道菜生成三个创意变体。\n\n`;

  if (allergens.length > 0) {
    prompt += `⚠️ 严格遵守：所有变体必须完全避开以下食材和饮食限制：${allergens.join('、')}。不得使用任何相关食材。\n\n`;
  }

  if (voteHistory && voteHistory.length > 0) {
    const typeLabels: Record<VariantType, string> = {
      'low-calorie': '低卡健康版',
      'luxury': '豪华宴客版',
      'exotic': '异国风味版'
    };
    prompt += `📊 用户偏好参考（基于历史投票评分，+1表示喜欢，-1表示不喜欢）：\n`;
    const sortedHistory = [...voteHistory].sort((a, b) => b.score - a.score);
    sortedHistory.forEach(v => {
      const preference = v.score > 0 ? '喜欢' : v.score < 0 ? '不喜欢' : '中性';
      prompt += `- ${typeLabels[v.type]}: ${preference} (评分: ${v.score > 0 ? '+' : ''}${v.score})\n`;
    });
    prompt += `请在生成时，对用户喜欢的风格增加创意和细节，对不喜欢的风格保持简洁或弱化。\n\n`;
    prompt += `排序要求：三个变体按照用户偏好评分从高到低排序返回。\n\n`;
  }

  prompt += `请返回严格的JSON格式，结构如下：
{
  "variants": [
    {
      "type": "low-calorie",
      "name": "创意菜品名称",
      "description": "简短描述",
      "ingredientChanges": [
        {"original": "原食材", "replacement": "替换食材", "reason": "改动原因"}
      ],
      "fullIngredients": ["食材1", "食材2", "食材3", "..."]
    },
    {
      "type": "luxury",
      "name": "创意菜品名称",
      "description": "简短描述",
      "ingredientChanges": [
        {"original": "原食材", "replacement": "替换食材", "reason": "改动原因"}
      ],
      "fullIngredients": ["食材1", "食材2", "食材3", "..."]
    },
    {
      "type": "exotic",
      "name": "创意菜品名称",
      "description": "简短描述",
      "ingredientChanges": [
        {"original": "原食材", "replacement": "替换食材", "reason": "改动原因"}
      ],
      "fullIngredients": ["食材1", "食材2", "食材3", "..."]
    }
  ]
}`;

  return prompt;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function extractJSON(text: string): string {
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    return text.substring(jsonStart, jsonEnd + 1);
  }
  return text.trim();
}

function validateResponse(data: unknown): data is AIRecipeResponse {
  if (!data || typeof data !== 'object') return false;
  
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.variants)) return false;
  if (obj.variants.length !== 3) return false;

  const validTypes: VariantType[] = ['low-calorie', 'luxury', 'exotic'];
  const foundTypes = new Set<VariantType>();

  for (const variant of obj.variants) {
    if (!variant || typeof variant !== 'object') return false;
    
    const v = variant as Record<string, unknown>;
    if (!validTypes.includes(v.type as VariantType)) return false;
    if (foundTypes.has(v.type as VariantType)) return false;
    foundTypes.add(v.type as VariantType);
    
    if (typeof v.name !== 'string' || !v.name.trim()) return false;
    if (typeof v.description !== 'string') return false;
    
    if (!Array.isArray(v.ingredientChanges)) return false;
    if (v.ingredientChanges.length < 2 || v.ingredientChanges.length > 3) return false;
    
    for (const change of v.ingredientChanges) {
      if (!change || typeof change !== 'object') return false;
      const c = change as Record<string, unknown>;
      if (typeof c.original !== 'string' || !c.original.trim()) return false;
      if (typeof c.replacement !== 'string' || !c.replacement.trim()) return false;
      if (typeof c.reason !== 'string' || !c.reason.trim()) return false;
    }
    
    if (!Array.isArray(v.fullIngredients)) return false;
    if (v.fullIngredients.length < 3) return false;
    for (const ing of v.fullIngredients) {
      if (typeof ing !== 'string' || !ing.trim()) return false;
    }
  }

  return foundTypes.size === 3;
}

async function callAI(prompt: string): Promise<AIRecipeResponse> {
  if (!API_CONFIG.apiKey) {
    throw new Error('未配置 AI API Key。请在项目根目录创建 .env 文件并配置 VITE_AI_API_KEY。');
  }

  if (!API_CONFIG.baseUrl) {
    throw new Error('未配置 AI API URL。请在 .env 文件中配置 VITE_AI_API_URL。');
  }

  const endpoint = `${API_CONFIG.baseUrl}/chat/completions`;
  
  console.log('🤖 正在调用 AI API:', endpoint);
  console.log('📝 Prompt 长度:', prompt.length);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_CONFIG.apiKey}`,
      },
      body: JSON.stringify({
        model: API_CONFIG.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.85,
        top_p: 0.9,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        } else if (errorData.error) {
          errorMessage = JSON.stringify(errorData.error);
        }
      } catch {
        errorMessage = `${errorMessage}: ${response.statusText}`;
      }
      throw new Error(`API 调用失败: ${errorMessage}`);
    }

    const data = await response.json();
    
    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      throw new Error('API 返回格式异常: 缺少 choices 字段');
    }

    const content = data.choices[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new Error('API 返回内容为空或格式错误');
    }

    console.log('✅ AI 响应接收成功，长度:', content.length);

    const jsonStr = extractJSON(content);
    let parsed: unknown;
    
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('JSON 解析失败，原始内容:', content);
      throw new Error(`AI 返回的 JSON 格式错误: ${parseError instanceof Error ? parseError.message : '未知错误'}`);
    }

    if (!validateResponse(parsed)) {
      console.error('响应验证失败:', parsed);
      throw new Error('AI 返回的数据结构不符合要求，请重试');
    }

    console.log('✅ 响应验证通过，包含 3 个变体');
    return parsed as AIRecipeResponse;

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error(`网络连接失败: 无法连接到 ${API_CONFIG.baseUrl}。请检查 API URL 是否正确，以及网络连接是否正常。`);
      }
      if (error.message.includes('401') || error.message.includes('Unauthorized') || error.message.includes('authentication')) {
        throw new Error('API Key 无效或已过期。请检查 .env 文件中的 VITE_AI_API_KEY 配置是否正确。');
      }
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        throw new Error('API 调用频率超限。请稍后重试，或检查您的 API 配额。');
      }
      if (error.message.includes('404')) {
        throw new Error(`API 地址未找到 (404)。请检查 VITE_AI_API_URL 是否正确，应为: https://api.openai.com/v1`);
      }
      throw error;
    }
    throw new Error('调用 AI API 时发生未知错误');
  }
}

export interface GenerateOptions {
  dishName: string;
  allergens: string[];
  voteHistory?: Array<{ type: VariantType; score: number }>;
}

export async function generateRecipeVariantsWithAI(
  options: GenerateOptions
): Promise<RecipeVariant[]> {
  const { dishName, allergens, voteHistory } = options;

  if (!dishName.trim()) {
    throw new Error('请输入菜名');
  }

  let sortedVoteHistory: Array<{ type: VariantType; score: number }> | undefined;
  
  if (voteHistory && voteHistory.length > 0) {
    sortedVoteHistory = [...voteHistory].sort((a, b) => b.score - a.score);
    console.log('📊 用户投票偏好:', sortedVoteHistory);
  }

  const prompt = buildUserPrompt(dishName.trim(), allergens, sortedVoteHistory);
  const response = await callAI(prompt);

  let orderedTypes: VariantType[] = ['low-calorie', 'luxury', 'exotic'];
  
  if (sortedVoteHistory && sortedVoteHistory.length > 0) {
    const typeScores: Record<VariantType, number> = {
      'low-calorie': 0,
      'luxury': 0,
      'exotic': 0
    };
    
    sortedVoteHistory.forEach(v => {
      typeScores[v.type] = v.score;
    });
    
    orderedTypes = orderedTypes.sort((a, b) => typeScores[b] - typeScores[a]);
    console.log('🔄 根据投票调整显示顺序:', orderedTypes);
  }

  const variantsMap = new Map<VariantType, AIRecipeResponse['variants'][0]>();
  response.variants.forEach(v => variantsMap.set(v.type, v));

  const result: RecipeVariant[] = orderedTypes.map(type => {
    const variant = variantsMap.get(type);
    if (!variant) {
      throw new Error(`AI 响应缺少 ${type} 变体`);
    }
    return {
      id: generateId(),
      type: variant.type,
      name: variant.name,
      originalDish: dishName.trim(),
      ingredientChanges: variant.ingredientChanges.map(c => ({
        original: c.original.trim(),
        replacement: c.replacement.trim(),
        reason: c.reason.trim()
      })),
      fullIngredients: variant.fullIngredients.map(ing => ing.trim()).filter(Boolean),
      description: variant.description.trim()
    };
  });

  console.log('✅ 菜谱生成完成:', result.map(r => r.name));
  return result;
}

export function isAIConfigured(): boolean {
  return !!API_CONFIG.apiKey && !!API_CONFIG.baseUrl;
}

export function getAIConfig() {
  return {
    baseUrl: API_CONFIG.baseUrl,
    model: API_CONFIG.model,
    hasKey: isAIConfigured(),
    maskedKey: API_CONFIG.apiKey ? `${API_CONFIG.apiKey.slice(0, 6)}...${API_CONFIG.apiKey.slice(-4)}` : '未配置'
  };
}
