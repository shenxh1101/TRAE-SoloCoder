import type { GenerationResult, StoryNode, StoryPremise, LLMConfig } from './types';
import { generateByLLM, loadLLMConfig } from './llm';
import { generateByTemplate } from './template';

export async function generateStoryNode(
  premise: StoryPremise,
  nodes?: Record<string, StoryNode>,
  currentNode?: StoryNode,
  lastChoice?: string,
  config?: LLMConfig
): Promise<GenerationResult> {
  const llmConfig = config || loadLLMConfig();

  if (llmConfig.apiKey) {
    try {
      const result = await generateByLLM(premise, llmConfig, nodes, currentNode, lastChoice);
      return result;
    } catch (error) {
      console.warn('LLM generation failed, using template fallback:', error);
      return generateByTemplate(premise, currentNode, lastChoice);
    }
  } else {
    return generateByTemplate(premise, currentNode, lastChoice);
  }
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export function generateTitleFromPremise(premise: StoryPremise): string {
  const parts = [premise.background, premise.character, premise.scene].filter(Boolean);
  const combined = parts.join(' - ');

  if (combined.length <= 20) {
    return combined || '未知的故事';
  }

  const match = combined.match(/^(.{10,30})[，。！？,.!?\-]/);
  if (match) {
    return match[1];
  }

  return combined.substring(0, 18) + '...';
}
