import { create } from 'zustand';
import type { Story, StoryNode, StoryChoice, StoryPremise, LLMConfig } from '../engine/types';
import { generateStoryNode, generateId, generateTitleFromPremise } from '../engine/generator';
import { storage } from '../utils/storage';
import { getCurrentPath } from '../utils/tree';
import { exportToMarkdown, downloadMarkdown, generateFilename } from '../utils/export';

interface StoryState {
  story: Story | null;
  nodes: Record<string, StoryNode>;
  isGenerating: boolean;
  godMode: boolean;
  transitionState: 'idle' | 'leaving' | 'entering';
  error: string | null;
  generationMode: 'llm' | 'template' | 'hybrid' | null;

  actions: {
    initStory: (premise: StoryPremise, config?: LLMConfig) => Promise<void>;
    makeChoice: (choiceId: string, config?: LLMConfig) => Promise<void>;
    rollback: () => void;
    jumpToNode: (nodeId: string) => void;
    reset: () => void;
    toggleGodMode: () => void;
    exportMarkdown: () => void;
    loadSavedState: () => void;
    clearError: () => void;
  };
}

const initialState: Omit<StoryState, 'actions'> = {
  story: null,
  nodes: {},
  isGenerating: false,
  godMode: false,
  transitionState: 'idle',
  error: null,
  generationMode: null,
};

function saveToStorage(story: Story, nodes: Record<string, StoryNode>): void {
  storage.saveStory(story);
  storage.saveNodes(nodes);
}

export const useStoryStore = create<StoryState>((set, get) => ({
  ...initialState,

  actions: {
    loadSavedState: () => {
      const savedStory = storage.loadStory();
      const savedNodes = storage.loadNodes();

      if (savedStory && Object.keys(savedNodes).length > 0) {
        if (typeof savedStory.premise === 'string') {
          (savedStory as any).premise = {
            background: savedStory.premise as unknown as string,
            character: '',
            scene: '',
          };
        }
        set({
          story: savedStory,
          nodes: savedNodes,
        });
      }
    },

    initStory: async (premise: StoryPremise, config?: LLMConfig) => {
      if (!premise.background.trim() && !premise.character.trim() && !premise.scene.trim()) {
        set({ error: '请至少填写一个故事设定字段' });
        return;
      }

      set({ isGenerating: true, error: null });

      try {
        const result = await generateStoryNode(premise, undefined, undefined, undefined, config);
        const storyId = generateId();
        const rootNodeId = generateId();

        const rootNode: StoryNode = {
          id: rootNodeId,
          storyId,
          parentId: null,
          content: result.content,
          choices: result.choices.map((c, i) => ({
            ...c,
            id: generateId(),
            nextNodeId: null,
          })),
          depth: 0,
          createdAt: Date.now(),
        };

        const story: Story = {
          id: storyId,
          title: generateTitleFromPremise(premise),
          premise,
          currentNodeId: rootNodeId,
          nodeIds: [rootNodeId],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        const nodes: Record<string, StoryNode> = {
          [rootNodeId]: rootNode,
        };

        saveToStorage(story, nodes);

        set({
          story,
          nodes,
          isGenerating: false,
          generationMode: result.mode,
        });
      } catch (error) {
        set({
          isGenerating: false,
          error: error instanceof Error ? error.message : '生成故事失败，请重试',
        });
      }
    },

    makeChoice: async (choiceId: string, config?: LLMConfig) => {
      const { story, nodes } = get();
      if (!story) return;

      const currentNode = nodes[story.currentNodeId];
      if (!currentNode) return;

      const choice = currentNode.choices.find((c) => c.id === choiceId);
      if (!choice) return;

      if (choice.nextNodeId && nodes[choice.nextNodeId]) {
        set({ transitionState: 'leaving' });
        setTimeout(() => {
          const updatedStory: Story = {
            ...story,
            currentNodeId: choice.nextNodeId!,
            updatedAt: Date.now(),
          };

          if (!updatedStory.nodeIds.includes(choice.nextNodeId!)) {
            updatedStory.nodeIds.push(choice.nextNodeId!);
          }

          saveToStorage(updatedStory, nodes);

          set({
            story: updatedStory,
            transitionState: 'entering',
          });

          setTimeout(() => {
            set({ transitionState: 'idle' });
          }, 500);
        }, 500);
        return;
      }

      set({ isGenerating: true, error: null, transitionState: 'leaving' });

      try {
        const result = await generateStoryNode(
          story.premise,
          nodes,
          currentNode,
          choice.text,
          config
        );

        const newNodeId = generateId();
        const newNode: StoryNode = {
          id: newNodeId,
          storyId: story.id,
          parentId: currentNode.id,
          content: result.content,
          choices: result.choices.map((c) => ({
            ...c,
            id: generateId(),
            nextNodeId: null,
          })),
          depth: currentNode.depth + 1,
          createdAt: Date.now(),
          choiceText: choice.text,
        };

        const updatedChoices: StoryChoice[] = currentNode.choices.map((c) =>
          c.id === choiceId ? { ...c, nextNodeId: newNodeId } : c
        );

        const updatedCurrentNode: StoryNode = {
          ...currentNode,
          choices: updatedChoices,
        };

        const updatedNodes: Record<string, StoryNode> = {
          ...nodes,
          [currentNode.id]: updatedCurrentNode,
          [newNodeId]: newNode,
        };

        const updatedStory: Story = {
          ...story,
          currentNodeId: newNodeId,
          nodeIds: [...story.nodeIds, newNodeId],
          updatedAt: Date.now(),
        };

        saveToStorage(updatedStory, updatedNodes);

        setTimeout(() => {
          set({
            story: updatedStory,
            nodes: updatedNodes,
            isGenerating: false,
            generationMode: result.mode,
            transitionState: 'entering',
          });

          setTimeout(() => {
            set({ transitionState: 'idle' });
          }, 500);
        }, 500);
      } catch (error) {
        set({
          isGenerating: false,
          transitionState: 'idle',
          error: error instanceof Error ? error.message : '生成故事失败，请重试',
        });
      }
    },

    rollback: () => {
      const { story, nodes } = get();
      if (!story) return;

      const currentNode = nodes[story.currentNodeId];
      if (!currentNode || !currentNode.parentId) return;

      const parentNode = nodes[currentNode.parentId];
      if (!parentNode) return;

      set({ transitionState: 'leaving' });

      setTimeout(() => {
        const updatedStory: Story = {
          ...story,
          currentNodeId: currentNode.parentId!,
          updatedAt: Date.now(),
        };

        saveToStorage(updatedStory, nodes);

        set({
          story: updatedStory,
          transitionState: 'entering',
        });

        setTimeout(() => {
          set({ transitionState: 'idle' });
        }, 500);
      }, 300);
    },

    jumpToNode: (nodeId: string) => {
      const { story, nodes } = get();
      if (!story || !nodes[nodeId]) return;

      set({ transitionState: 'leaving' });

      setTimeout(() => {
        const updatedStory: Story = {
          ...story,
          currentNodeId: nodeId,
          updatedAt: Date.now(),
        };

        if (!updatedStory.nodeIds.includes(nodeId)) {
          updatedStory.nodeIds.push(nodeId);
        }

        saveToStorage(updatedStory, nodes);

        set({
          story: updatedStory,
          transitionState: 'entering',
        });

        setTimeout(() => {
          set({ transitionState: 'idle' });
        }, 500);
      }, 300);
    },

    reset: () => {
      storage.clearAll();
      set(initialState);
    },

    toggleGodMode: () => {
      set((state) => ({ godMode: !state.godMode }));
    },

    exportMarkdown: () => {
      const { story, nodes } = get();
      if (!story) return;

      const markdown = exportToMarkdown(story, nodes);
      const filename = generateFilename(story);
      downloadMarkdown(markdown, filename);
    },

    clearError: () => {
      set({ error: null });
    },
  },
}));

export function useCurrentNode(): StoryNode | null {
  const { story, nodes } = useStoryStore();
  if (!story) return null;
  return nodes[story.currentNodeId] || null;
}

export function useCurrentPath(): string[] {
  const { story, nodes } = useStoryStore();
  if (!story) return [];
  return getCurrentPath(nodes, story.currentNodeId);
}
