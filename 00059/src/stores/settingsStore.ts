import { create } from 'zustand';
import { GameSettings, Difficulty } from '../types';
import { loadSettings, saveSettings } from '../utils/dataManager';
import { audioManager } from '../utils/audioManager';

interface SettingsStore extends GameSettings {
  loadSavedSettings: () => void;
  setKeyMapping: (lane: number, key: string) => void;
  resetKeyMapping: () => void;
  setDifficulty: (difficulty: Difficulty) => void;
  setMusicVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;
  setLaneCount: (count: number) => void;
  setNoteSpeed: (speed: number) => void;
}

const defaultSettings: GameSettings = {
  keyMapping: { 0: 'd', 1: 'f', 2: 'j', 3: 'k' },
  difficulty: 'normal',
  musicVolume: 0.7,
  sfxVolume: 0.5,
  laneCount: 4,
  noteSpeed: 1.0,
};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...defaultSettings,

  loadSavedSettings: () => {
    const saved = loadSettings();
    set(saved);
    audioManager.setVolume(saved.musicVolume, saved.sfxVolume);
  },

  setKeyMapping: (lane: number, key: string) => {
    set(state => {
      const newMapping = { ...state.keyMapping, [lane]: key.toLowerCase() };
      saveSettings({ ...state, keyMapping: newMapping });
      return { keyMapping: newMapping };
    });
  },

  resetKeyMapping: () => {
    set(state => {
      saveSettings({ ...state, keyMapping: defaultSettings.keyMapping });
      return { keyMapping: defaultSettings.keyMapping };
    });
  },

  setDifficulty: (difficulty: Difficulty) => {
    set(state => {
      saveSettings({ ...state, difficulty });
      return { difficulty };
    });
  },

  setMusicVolume: (volume: number) => {
    set(state => {
      audioManager.setVolume(volume, state.sfxVolume);
      saveSettings({ ...state, musicVolume: volume });
      return { musicVolume: volume };
    });
  },

  setSfxVolume: (volume: number) => {
    set(state => {
      audioManager.setVolume(state.musicVolume, volume);
      saveSettings({ ...state, sfxVolume: volume });
      return { sfxVolume: volume };
    });
  },

  setLaneCount: (count: number) => {
    set(state => {
      const newMapping: Record<number, string> = {};
      const defaultKeys = ['d', 'f', 'j', 'k', 's', 'l'];
      for (let i = 0; i < count; i++) {
        newMapping[i] = defaultKeys[i] || state.keyMapping[i] || ' ';
      }
      saveSettings({ ...state, laneCount: count, keyMapping: newMapping });
      return { laneCount: count, keyMapping: newMapping };
    });
  },

  setNoteSpeed: (speed: number) => {
    set(state => {
      saveSettings({ ...state, noteSpeed: speed });
      return { noteSpeed: speed };
    });
  },
}));
