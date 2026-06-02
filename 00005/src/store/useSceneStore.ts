import { create } from 'zustand';
import type { Fragment, SceneConfig } from '../types';
import { generateDefaultConfig, deserializeConfig } from '../utils/config';

interface SceneState {
  config: SceneConfig;
  selectedFragmentId: string | null;
  isViewerOpen: boolean;
  version: number;
  loadingProgress: Record<string, number>;
  setLucidity: (lucidity: number) => void;
  updateFragmentImage: (id: string, imageData: string, imageName: string) => void;
  selectFragment: (id: string | null) => void;
  openViewer: (id: string) => void;
  closeViewer: () => void;
  loadConfig: (config: SceneConfig) => void;
  resetToDefault: () => void;
  incrementVersion: () => void;
  setLoadingProgress: (id: string, progress: number) => void;
}

const STORAGE_KEY = 'dream-fragments-config';

const loadInitialConfigSync = (): SceneConfig => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.fragments && Array.isArray(parsed.fragments) && typeof parsed.lucidity === 'number') {
          return parsed as SceneConfig;
        }
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
  return generateDefaultConfig();
};

export const useSceneStore = create<SceneState>((set, get) => {
  const initialConfig = loadInitialConfigSync();

  const persistConfig = (config: SceneConfig) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      // ignore
    }
  };

  return {
    config: initialConfig,
    selectedFragmentId: null,
    isViewerOpen: false,
    version: 0,
    loadingProgress: {},

    setLucidity: (lucidity: number) => {
      set((state) => {
        const newConfig = { ...state.config, lucidity };
        persistConfig(newConfig);
        return { config: newConfig, version: state.version + 1 };
      });
    },

    updateFragmentImage: (id: string, imageData: string, imageName: string) => {
      set((state) => {
        const fragments = state.config.fragments.map((f) =>
          f.id === id ? { ...f, imageData, imageName } : f
        );
        const newConfig = { ...state.config, fragments };
        persistConfig(newConfig);
        return { config: newConfig, version: state.version + 1 };
      });
    },

    selectFragment: (id: string | null) => {
      set({ selectedFragmentId: id });
    },

    openViewer: (id: string) => {
      set({ selectedFragmentId: id, isViewerOpen: true });
    },

    closeViewer: () => {
      set({ isViewerOpen: false });
    },

    loadConfig: (config: SceneConfig) => {
      persistConfig(config);
      set((state) => ({ config, selectedFragmentId: null, isViewerOpen: false, version: state.version + 1, loadingProgress: {} }));
    },

    resetToDefault: () => {
      const newConfig = generateDefaultConfig();
      persistConfig(newConfig);
      set((state) => ({ config: newConfig, selectedFragmentId: null, isViewerOpen: false, version: state.version + 1, loadingProgress: {} }));
    },

    incrementVersion: () => {
      set((state) => ({ version: state.version + 1 }));
    },

    setLoadingProgress: (id: string, progress: number) => {
      set((state) => ({
        loadingProgress: { ...state.loadingProgress, [id]: progress },
      }));
    },
  };
});

export const getSelectedFragment = (): Fragment | null => {
  const state = useSceneStore.getState();
  if (!state.selectedFragmentId) return null;
  return state.config.fragments.find((f) => f.id === state.selectedFragmentId) || null;
};
