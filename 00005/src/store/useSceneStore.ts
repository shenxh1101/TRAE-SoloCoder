import { create } from 'zustand';
import type { Fragment, SceneConfig } from '../types';
import { generateDefaultConfig, deserializeConfig } from '../utils/config';

interface SceneState {
  config: SceneConfig;
  selectedFragmentId: string | null;
  isViewerOpen: boolean;
  setLucidity: (lucidity: number) => void;
  updateFragmentImage: (id: string, imageData: string, imageName: string) => void;
  selectFragment: (id: string | null) => void;
  openViewer: (id: string) => void;
  closeViewer: () => void;
  loadConfig: (config: SceneConfig) => void;
  resetToDefault: () => void;
}

const STORAGE_KEY = 'dream-fragments-config';

const loadInitialConfig = (): SceneConfig => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = deserializeConfig(stored);
      if (parsed) return parsed;
    }
  } catch {
    // ignore
  }
  return generateDefaultConfig();
};

export const useSceneStore = create<SceneState>((set, get) => {
  const initialConfig = loadInitialConfig();

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

    setLucidity: (lucidity: number) => {
      set((state) => {
        const newConfig = { ...state.config, lucidity };
        persistConfig(newConfig);
        return { config: newConfig };
      });
    },

    updateFragmentImage: (id: string, imageData: string, imageName: string) => {
      set((state) => {
        const fragments = state.config.fragments.map((f) =>
          f.id === id ? { ...f, imageData, imageName } : f
        );
        const newConfig = { ...state.config, fragments };
        persistConfig(newConfig);
        return { config: newConfig };
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
      set({ config, selectedFragmentId: null, isViewerOpen: false });
    },

    resetToDefault: () => {
      const newConfig = generateDefaultConfig();
      persistConfig(newConfig);
      set({ config: newConfig, selectedFragmentId: null, isViewerOpen: false });
    },
  };
});

export const getSelectedFragment = (): Fragment | null => {
  const state = useSceneStore.getState();
  if (!state.selectedFragmentId) return null;
  return state.config.fragments.find((f) => f.id === state.selectedFragmentId) || null;
};
