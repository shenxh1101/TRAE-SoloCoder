import { create } from 'zustand';
import { GameState, Track, GameResult, Grade, JudgeResult } from '../types';
import { audioManager } from '../utils/audioManager';

interface GameStore extends GameState {
  startGame: (track: Track, practiceMode?: boolean, speedMultiplier?: number) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: () => void;
  resetGame: () => void;
  updateTime: (time: number) => void;
  addActiveNote: (note: any) => void;
  removeActiveNote: (noteId: string) => void;
  judgeNote: (noteId: string, result: JudgeResult) => void;
  missNote: (noteId: string) => void;
  setLives: (lives: number) => void;
  getResult: () => GameResult | null;
}

const initialState: GameState = {
  score: 0,
  combo: 0,
  maxCombo: 0,
  lives: 5,
  perfect: 0,
  good: 0,
  miss: 0,
  isPlaying: false,
  isPaused: false,
  isPracticeMode: false,
  speedMultiplier: 1,
  currentTime: 0,
  currentTrack: null,
  activeNotes: [],
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  startGame: (track, practiceMode = false, speedMultiplier = 1) => {
    audioManager.resume();
    audioManager.playStart();
    set({
      ...initialState,
      currentTrack: track,
      isPlaying: true,
      isPracticeMode: practiceMode,
      speedMultiplier: practiceMode ? speedMultiplier : 1,
      lives: practiceMode ? 999 : 5,
    });
  },

  pauseGame: () => set({ isPaused: true }),
  resumeGame: () => set({ isPaused: false }),

  endGame: () => {
    audioManager.playGameOver();
    set({ isPlaying: false });
  },

  resetGame: () => set(initialState),

  updateTime: (time: number) => set({ currentTime: time }),

  addActiveNote: (note: any) => set(state => ({
    activeNotes: [...state.activeNotes, note],
  })),

  removeActiveNote: (noteId: string) => set(state => ({
    activeNotes: state.activeNotes.filter(n => n.id !== noteId),
  })),

  judgeNote: (noteId: string, result: JudgeResult) => {
    const state = get();
    const baseScore = result === 'perfect' ? 100 : result === 'good' ? 50 : 0;
    const comboMultiplier = 1 + Math.floor(state.combo / 10) * 0.1;
    const scoreGain = Math.floor(baseScore * comboMultiplier);

    if (result === 'perfect') {
      audioManager.playPerfect();
    } else if (result === 'good') {
      audioManager.playGood();
    }

    set(state => {
      const newCombo = result === 'miss' ? 0 : state.combo + 1;
      audioManager.playCombo(newCombo);
      return {
        score: state.score + scoreGain,
        combo: newCombo,
        maxCombo: Math.max(state.maxCombo, newCombo),
        perfect: result === 'perfect' ? state.perfect + 1 : state.perfect,
        good: result === 'good' ? state.good + 1 : state.good,
        activeNotes: state.activeNotes.map(n =>
          n.id === noteId ? { ...n, judged: true, judgeResult: result } : n
        ),
      };
    });
  },

  missNote: (noteId: string) => {
    audioManager.playMiss();
    set(state => ({
      combo: 0,
      miss: state.miss + 1,
      lives: state.isPracticeMode ? state.lives : state.lives - 1,
      activeNotes: state.activeNotes.map(n =>
        n.id === noteId ? { ...n, judged: true, judgeResult: 'miss' } : n
      ),
    }));
  },

  setLives: (lives: number) => set({ lives }),

  getResult: () => {
    const state = get();
    if (!state.currentTrack) return null;

    const totalNotes = state.currentTrack.notes.length;
    const accuracy = totalNotes > 0
      ? ((state.perfect * 100 + state.good * 50) / (totalNotes * 100)) * 100
      : 0;

    let grade: Grade = 'C';
    if (accuracy >= 95) grade = 'S';
    else if (accuracy >= 85) grade = 'A';
    else if (accuracy >= 70) grade = 'B';

    return {
      trackId: state.currentTrack.id,
      trackName: state.currentTrack.name,
      score: state.score,
      maxCombo: state.maxCombo,
      perfect: state.perfect,
      good: state.good,
      miss: state.miss,
      totalNotes,
      accuracy: Math.round(accuracy * 100) / 100,
      grade,
      timestamp: Date.now(),
    };
  },
}));
