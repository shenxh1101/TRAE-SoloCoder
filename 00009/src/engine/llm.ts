import type { GenerationResult, LLMConfig, StoryNode, StoryPremise } from './types';
import { generateByTemplate } from './template';

const DEFAULT_CONFIG: Required<LLMConfig> = {
  apiKey: '',
  endpoint: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-3.5-turbo',
  timeout: 30000,
};

export async function generateByLLM(
  premise: StoryPremise,
  config: LLMConfig = {},
  nodes?: Record<string, StoryNode>,
  currentNode?: StoryNode,
  lastChoice?: string
): Promise<GenerationResult> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  if (!fullConfig.apiKey) {
    console.log('LLM API key not configured, falling back to template generation');
    return generateByTemplate(premise, currentNode, lastChoice);
  }

  try {
    const systemPrompt = `你是一个顶尖的互动故事写作大师。你需要根据用户提供的故事设定创作引人入胜的互动故事段落，并为读者提供三个截然不同的选择来推动故事发展。

严格遵循以下格式要求，返回纯JSON（不要包裹在markdown代码块中）：
{
  "content": "故事段落内容（150-300字）",
  "choices": ["选项1（不超过30字）", "选项2（不超过30字）", "选项3（不超过30字）"]
}

创作要求：
1. 故事内容要连贯、引人入胜，有画面感和沉浸感
2. 三个选项必须有明显的差异，分别代表勇敢/谨慎/创新三种不同的策略倾向
3. 每个选项要有足够的悬念，让读者难以抉择
4. 适当设置伏笔和悬念，保持故事的张力
5. 描写要有细节，包括环境、情感和感官体验`;

    let userPrompt = '';

    if (currentNode && nodes) {
      const storyHistory = buildStoryHistory(nodes, currentNode);
      userPrompt = `【故事设定】
背景：${premise.background}
主角：${premise.character}
初始场景：${premise.scene}

【之前的故事发展】
${storyHistory}

【读者刚刚选择了】${lastChoice || '无'}

请根据以上上下文，继续创作故事的下一个段落。要注意与之前的情节自然衔接，同时引入新的转折或挑战。`;

    } else {
      userPrompt = `请根据以下设定创作互动故事的开篇场景：

【背景】${premise.background}
【主角】${premise.character}
【初始场景】${premise.scene}

要求：
1. 以${premise.character}的视角开始叙述
2. 生动描绘${premise.background}的世界观
3. 从${premise.scene}切入，迅速建立悬念
4. 让读者立刻被吸引，想要了解接下来会发生什么
5. 三个选项要让读者面临真正的抉择困境`;
    }

    const response = await fetchWithTimeout(
      fullConfig.endpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${fullConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: fullConfig.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.85,
          max_tokens: 1000,
        }),
      },
      fullConfig.timeout
    );

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`LLM API error: ${response.status} - ${errorBody.slice(0, 200)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response content from LLM');
    }

    const parsed = parseLLMResponse(content);

    if (!parsed.content || parsed.content.length < 20) {
      throw new Error('LLM generated content too short or empty');
    }

    if (parsed.choices.length < 2) {
      throw new Error('LLM generated insufficient choices');
    }

    return {
      ...parsed,
      mode: 'llm',
    };
  } catch (error) {
    console.error('LLM generation failed, falling back to template:', error);
    return generateByTemplate(premise, currentNode, lastChoice);
  }
}

function buildStoryHistory(
  nodes: Record<string, StoryNode>,
  currentNode: StoryNode,
  maxDepth: number = 5
): string {
  const history: string[] = [];
  let node: StoryNode | null = currentNode;
  let depth = 0;

  while (node && depth < maxDepth) {
    const entry: string[] = [];
    if (node.choiceText) {
      entry.push(`→ 选择：${node.choiceText}`);
    }
    entry.push(node.content.length > 150
      ? node.content.slice(0, 150) + '...'
      : node.content
    );
    history.unshift(entry.join('\n'));

    if (node.parentId && nodes[node.parentId]) {
      node = nodes[node.parentId];
    } else {
      break;
    }
    depth++;
  }

  return history.join('\n\n---\n\n');
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`LLM request timed out after ${timeout}ms`);
    }
    throw error;
  }
}

function parseLLMResponse(raw: string): Omit<GenerationResult, 'mode'> {
  let content = raw.trim();

  const codeBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    content = codeBlockMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(content);

    if (parsed.content && typeof parsed.content === 'string') {
      const choices = extractChoices(parsed);
      if (choices.length >= 2) {
        return { content: parsed.content, choices: choices.slice(0, 3) };
      }
    }

    if (parsed.story && typeof parsed.story === 'string') {
      const choices = extractChoices(parsed, 'options');
      if (choices.length >= 2) {
        return { content: parsed.story, choices: choices.slice(0, 3) };
      }
    }

    if (parsed.text && typeof parsed.text === 'string') {
      const choices = extractChoices(parsed);
      return { content: parsed.text, choices: choices.length >= 2 ? choices.slice(0, 3) : generateFallbackChoices() };
    }

    const stringValues = Object.values(parsed).filter((v): v is string => typeof v === 'string' && v.length > 50);
    if (stringValues.length > 0) {
      const arraysValues = Object.values(parsed).filter((v): v is unknown[] => Array.isArray(v));
      const choicesArr = arraysValues.find(a => a.length >= 2 && a.every(item => typeof item === 'string' || (typeof item === 'object' && item !== null)));
      if (choicesArr) {
        const choices = choicesArr.map((c: unknown) => {
          if (typeof c === 'string') return c;
          if (typeof c === 'object' && c !== null) {
            const obj = c as Record<string, unknown>;
            return String(obj.text || obj.choice || obj.option || obj.label || JSON.stringify(c));
          }
          return String(c);
        }).filter((t: string) => t.length > 0 && t.length <= 100);
        return { content: stringValues[0], choices: choices.length >= 2 ? choices.slice(0, 3).map(t => ({ id: '', text: t })) : generateFallbackChoices() };
      }
    }
  } catch (e) {
    console.error('Failed to parse LLM JSON response:', e);
  }

  const contentMatch = content.match(/"content"\s*:\s*"([\s\S]*?)(?:"\s*[,}])/);
  const storyMatch = content.match(/"story"\s*:\s*"([\s\S]*?)(?:"\s*[,}])/);
  const extractedContent = contentMatch?.[1] || storyMatch?.[1] || '';

  if (extractedContent) {
    const unescaped = extractedContent.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    const choicesMatch = content.match(/"choices"\s*:\s*\[([\s\S]*?)\]/);
    let choices: { id: string; text: string }[] = [];

    if (choicesMatch) {
      try {
        const choicesJson = JSON.parse(`[${choicesMatch[1]}]`);
        choices = choicesJson.map((c: unknown) => {
          if (typeof c === 'string') return { id: '', text: c };
          if (typeof c === 'object' && c !== null) {
            const obj = c as Record<string, unknown>;
            return { id: '', text: String(obj.text || obj.choice || obj.option || '') };
          }
          return { id: '', text: String(c) };
        }).filter((c: { text: string }) => c.text.trim());
      } catch {
        const choiceTexts = choicesMatch[1].match(/"([^"]+)"/g) || [];
        choices = choiceTexts.map((t) => ({ id: '', text: t.replace(/"/g, '') }));
      }
    }

    return {
      content: unescaped,
      choices: choices.length >= 2 ? choices.slice(0, 3) : generateFallbackChoices(),
    };
  }

  return {
    content: content.replace(/```json|```/g, '').replace(/^\s*[\[{]/, '').replace(/[}\]]\s*$/, '').trim(),
    choices: generateFallbackChoices(),
  };
}

function extractChoices(
  parsed: Record<string, unknown>,
  key: string = 'choices'
): { id: string; text: string }[] {
  const arr = parsed[key];
  if (!Array.isArray(arr)) return [];

  return arr
    .map((c: unknown) => {
      if (typeof c === 'string') return { id: '', text: c };
      if (typeof c === 'object' && c !== null) {
        const obj = c as Record<string, unknown>;
        return { id: '', text: String(obj.text || obj.choice || obj.option || obj.label || '') };
      }
      return { id: '', text: String(c) };
    })
    .filter((c: { text: string }) => c.text.trim() && c.text.length <= 100);
}

function generateFallbackChoices(): { id: string; text: string }[] {
  return [
    { id: '', text: '勇敢地面对挑战' },
    { id: '', text: '寻找另一条道路' },
    { id: '', text: '停下来思考对策' },
  ];
}

export function updateLLMConfig(config: Partial<LLMConfig>): void {
  try {
    if (config.apiKey) {
      localStorage.setItem('llm_api_key', config.apiKey);
    }
    if (config.endpoint) {
      localStorage.setItem('llm_endpoint', config.endpoint);
    }
    if (config.model) {
      localStorage.setItem('llm_model', config.model);
    }
  } catch (e) {
    console.error('Failed to save LLM config:', e);
  }
}

export function loadLLMConfig(): LLMConfig {
  try {
    const apiKey = localStorage.getItem('llm_api_key') || '';
    const endpoint = localStorage.getItem('llm_endpoint') || undefined;
    const model = localStorage.getItem('llm_model') || undefined;
    return { apiKey, endpoint, model };
  } catch (e) {
    return {};
  }
}
