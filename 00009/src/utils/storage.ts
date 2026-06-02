import type { Story, StoryNode } from '../engine/types';

const STORAGE_KEYS = {
  STORY: 'story_engine_story',
  NODES: 'story_engine_nodes',
  VERSION: 'story_engine_version',
} as const;

const CURRENT_VERSION = 1;

export const storage = {
  saveStory(story: Story): void {
    try {
      localStorage.setItem(STORAGE_KEYS.STORY, JSON.stringify(story));
      localStorage.setItem(STORAGE_KEYS.VERSION, String(CURRENT_VERSION));
    } catch (e) {
      console.error('Failed to save story:', e);
    }
  },

  loadStory(): Story | null {
    try {
      const version = localStorage.getItem(STORAGE_KEYS.VERSION);
      if (!version || parseInt(version) !== CURRENT_VERSION) {
        return null;
      }
      const data = localStorage.getItem(STORAGE_KEYS.STORY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Failed to load story:', e);
      return null;
    }
  },

  saveNodes(nodes: Record<string, StoryNode>): void {
    try {
      localStorage.setItem(STORAGE_KEYS.NODES, JSON.stringify(nodes));
    } catch (e) {
      console.error('Failed to save nodes:', e);
    }
  },

  loadNodes(): Record<string, StoryNode> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NODES);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.error('Failed to load nodes:', e);
      return {};
    }
  },

  clearAll(): void {
    localStorage.removeItem(STORAGE_KEYS.STORY);
    localStorage.removeItem(STORAGE_KEYS.NODES);
    localStorage.removeItem(STORAGE_KEYS.VERSION);
  },

  hasSavedData(): boolean {
    const version = localStorage.getItem(STORAGE_KEYS.VERSION);
    const story = localStorage.getItem(STORAGE_KEYS.STORY);
    return version !== null && story !== null;
  },
};
