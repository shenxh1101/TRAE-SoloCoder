import { Track } from '../types';
import { generateTrackFromPattern } from '../utils/midiParser';

const easy1 = generateTrackFromPattern(
  'easy-1',
  '初学者练习曲',
  '教程',
  'easy',
  80,
  [0, 1, 2, 3],
  16
);

const easy2 = generateTrackFromPattern(
  'easy-2',
  '小星星',
  '传统儿歌',
  'easy',
  90,
  [0, 0, 1, 1, 2, 2, 1, 3, 3, 2, 2, 1, 0],
  12
);

const normal1 = generateTrackFromPattern(
  'normal-1',
  '电子节拍',
  '节奏大师',
  'normal',
  120,
  [0, 2, 1, 3, 0, 3, 1, 2],
  20
);

const normal2 = generateTrackFromPattern(
  'normal-2',
  '欢乐颂',
  '贝多芬',
  'normal',
  100,
  [2, 2, 3, 0, 1, 2, 3, 0, 1, 2, 1, 0, 2, 3, 3, 2, 1, 0],
  10
);

const hard1 = generateTrackFromPattern(
  'hard-1',
  '极速挑战',
  '电音大师',
  'hard',
  160,
  [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 3, 2, 1, 0],
  24
);

const hard2 = generateTrackFromPattern(
  'hard-2',
  '命运交响曲',
  '贝多芬',
  'hard',
  140,
  [0, 0, 0, 1, 2, 1, 0, 2, 3, 2, 1, 0, 1, 2, 3, 0],
  20
);

const expert1 = generateTrackFromPattern(
  'expert-1',
  '光速穿越',
  '终极BOSS',
  'expert',
  200,
  [0, 3, 1, 2, 3, 0, 2, 1, 0, 1, 2, 3, 1, 0, 3, 2],
  30
);

export const defaultTracks: Track[] = [
  easy1,
  easy2,
  normal1,
  normal2,
  hard1,
  hard2,
  expert1,
];

export const getTrackById = (id: string): Track | undefined => {
  return defaultTracks.find(t => t.id === id);
};

export const getTracksByDifficulty = (difficulty: string): Track[] => {
  return defaultTracks.filter(t => t.difficulty === difficulty);
};
