export type Difficulty = 'easy' | 'normal' | 'hard' | 'expert';

export type NoteType = 'normal' | 'hold';

export type JudgeResult = 'perfect' | 'good' | 'miss' | null;

export type Grade = 'S' | 'A' | 'B' | 'C';

export interface Note {
  id: string;
  time: number;
  lane: number;
  type: NoteType;
  duration?: number;
  judged?: boolean;
  judgeResult?: JudgeResult;
}

export interface Track {
  id: string;
  name: string;
  artist: string;
  difficulty: Difficulty;
  bpm: number;
  duration: number;
  notes: Note[];
  musicUrl?: string;
  isCustom?: boolean;
}

export interface GameSettings {
  keyMapping: Record<number, string>;
  difficulty: Difficulty;
  musicVolume: number;
  sfxVolume: number;
  laneCount: number;
  noteSpeed: number;
}

export interface GameState {
  score: number;
  combo: number;
  maxCombo: number;
  lives: number;
  perfect: number;
  good: number;
  miss: number;
  isPlaying: boolean;
  isPaused: boolean;
  isPracticeMode: boolean;
  speedMultiplier: number;
  currentTime: number;
  currentTrack: Track | null;
  activeNotes: Note[];
}

export interface GameResult {
  trackId: string;
  trackName: string;
  score: number;
  maxCombo: number;
  perfect: number;
  good: number;
  miss: number;
  totalNotes: number;
  accuracy: number;
  grade: Grade;
  timestamp: number;
}

export interface HighScoreRecord {
  trackId: string;
  bestScore: number;
  bestAccuracy: number;
  bestGrade: Grade;
  plays: number;
  lastPlayed: number;
}
