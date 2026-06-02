export interface StoryChoice {
  id: string;
  text: string;
  nextNodeId: string | null;
}

export interface StoryPremise {
  background: string;
  character: string;
  scene: string;
}

export interface StoryNode {
  id: string;
  storyId: string;
  parentId: string | null;
  content: string;
  choices: StoryChoice[];
  depth: number;
  createdAt: number;
  choiceText?: string;
}

export interface Story {
  id: string;
  title: string;
  premise: StoryPremise;
  currentNodeId: string;
  nodeIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface TreeNode {
  node: StoryNode;
  children: TreeNode[];
  isOnCurrentPath: boolean;
}

export type GenerationMode = 'llm' | 'template' | 'hybrid';

export interface GenerationResult {
  content: string;
  choices: Omit<StoryChoice, 'nextNodeId'>[];
  mode: GenerationMode;
}

export interface LLMConfig {
  apiKey?: string;
  endpoint?: string;
  model?: string;
  timeout?: number;
}
