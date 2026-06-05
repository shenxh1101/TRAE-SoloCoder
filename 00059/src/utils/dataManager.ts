import { GameSettings, HighScoreRecord, GameResult } from '../types';

const SETTINGS_KEY = 'piano_tiles_settings';
const HIGHSCORES_KEY = 'piano_tiles_highscores';

const defaultSettings: GameSettings = {
  keyMapping: { 0: 'd', 1: 'f', 2: 'j', 3: 'k' },
  difficulty: 'normal',
  musicVolume: 0.7,
  sfxVolume: 0.5,
  laneCount: 4,
  noteSpeed: 1.0,
};

export const loadSettings = (): GameSettings => {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      return { ...defaultSettings, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return defaultSettings;
};

export const saveSettings = (settings: GameSettings): void => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
};

export const loadHighScores = (): Record<string, HighScoreRecord> => {
  try {
    const saved = localStorage.getItem(HIGHSCORES_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load high scores:', e);
  }
  return {};
};

export const saveHighScore = (result: GameResult): HighScoreRecord | null => {
  try {
    const scores = loadHighScores();
    const existing = scores[result.trackId];
    
    const newRecord: HighScoreRecord = {
      trackId: result.trackId,
      bestScore: existing ? Math.max(existing.bestScore, result.score) : result.score,
      bestAccuracy: existing ? Math.max(existing.bestAccuracy, result.accuracy) : result.accuracy,
      bestGrade: existing 
        ? (result.accuracy > existing.bestAccuracy ? result.grade : existing.bestGrade)
        : result.grade,
      plays: (existing?.plays || 0) + 1,
      lastPlayed: Date.now(),
    };
    
    scores[result.trackId] = newRecord;
    localStorage.setItem(HIGHSCORES_KEY, JSON.stringify(scores));
    return newRecord;
  } catch (e) {
    console.error('Failed to save high score:', e);
    return null;
  }
};

export const getHighScore = (trackId: string): HighScoreRecord | null => {
  const scores = loadHighScores();
  return scores[trackId] || null;
};
