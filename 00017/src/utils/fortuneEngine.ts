import { normalFortuneData, reverseFortuneData, luckyColors, avoidDoings } from '../data/fortuneData';
import type { LuckyColor } from '../data/fortuneData';

export interface Fortune {
  id: string;
  content: string;
  keywords: string[];
  isLiked: boolean;
}

export interface UserPreferences {
  likedKeywords: { [keyword: string]: number };
  totalGenerations: number;
}

export interface DailyInfo {
  luckyColor: LuckyColor;
  avoidDoing: string;
}

const STORAGE_KEY = 'ai-fortune-preferences';

export function getUserPreferences(): UserPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore
  }
  return { likedKeywords: {}, totalGenerations: 0 };
}

export function saveUserPreferences(prefs: UserPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

export function recordLikedKeywords(keywords: string[]): void {
  const prefs = getUserPreferences();
  keywords.forEach(keyword => {
    prefs.likedKeywords[keyword] = (prefs.likedKeywords[keyword] || 0) + 1;
  });
  saveUserPreferences(prefs);
}

export function clearUserPreferences(): void {
  localStorage.removeItem(STORAGE_KEY);
}

function weightedRandom<T extends string>(items: T[], weights: { [key: string]: number }): T {
  const multiplier = 3;
  const itemWeights = items.map(item => ({
    item,
    weight: 1 + ((weights[item] || 0) * multiplier)
  }));
  const total = itemWeights.reduce((sum, iw) => sum + iw.weight, 0);
  let rand = Math.random() * total;
  for (const iw of itemWeights) {
    rand -= iw.weight;
    if (rand <= 0) return iw.item;
  }
  return items[items.length - 1];
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function extractKeywords(content: string, mode: 'normal' | 'reverse'): string[] {
  const found: string[] = [];
  const sources = mode === 'normal'
    ? [...normalFortuneData.subjects, ...normalFortuneData.mysticalWords, ...normalFortuneData.actions]
    : [...reverseFortuneData.badEvents, ...reverseFortuneData.funnyOutcomes];
  for (const kw of sources) {
    if (content.includes(kw) && !found.includes(kw)) {
      found.push(kw);
    }
  }
  return found;
}

export function generateNormalFortune(birthMonth: number, luckyNumber: number): Fortune {
  const weights = getUserPreferences().likedKeywords;
  const template = pickRandom(normalFortuneData.templates);
  const subject = weightedRandom(normalFortuneData.subjects, weights);
  const action = weightedRandom(normalFortuneData.actions, weights);
  const outcome = pickRandom(normalFortuneData.outcomes);
  const mysticalWord = weightedRandom(normalFortuneData.mysticalWords, weights);
  const timeFrame = pickRandom(normalFortuneData.timeFrames);
  const content = template
    .replace('{mysticalWord}', mysticalWord)
    .replace('{subject}', subject)
    .replace('{action}', action)
    .replace('{outcome}', outcome)
    .replace('{timeFrame}', timeFrame);
  return {
    id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    content,
    keywords: extractKeywords(content, 'normal'),
    isLiked: false
  };
}

export function generateReverseFortune(birthMonth: number, luckyNumber: number): Fortune {
  const weights = getUserPreferences().likedKeywords;
  const template = pickRandom(reverseFortuneData.templates);
  const badEvent = weightedRandom(reverseFortuneData.badEvents, weights);
  const funnyOutcome = weightedRandom(reverseFortuneData.funnyOutcomes, weights);
  const content = template
    .replace('{badEvent}', badEvent)
    .replace('{funnyOutcome}', funnyOutcome);
  return {
    id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    content,
    keywords: extractKeywords(content, 'reverse'),
    isLiked: false
  };
}

export function generateFortunes(
  count: number,
  birthMonth: number,
  luckyNumber: number,
  mode: 'normal' | 'reverse'
): Fortune[] {
  const results: Fortune[] = [];
  const seen = new Set<string>();
  let attempts = 0;
  while (results.length < count && attempts < count * 20) {
    const fortune = mode === 'normal'
      ? generateNormalFortune(birthMonth, luckyNumber)
      : generateReverseFortune(birthMonth, luckyNumber);
    if (!seen.has(fortune.content)) {
      seen.add(fortune.content);
      results.push(fortune);
    }
    attempts++;
  }
  const prefs = getUserPreferences();
  prefs.totalGenerations++;
  saveUserPreferences(prefs);
  return results;
}

export function generateDailyInfo(birthMonth: number, luckyNumber: number): DailyInfo {
  const daySeed = new Date().getDate() + birthMonth + luckyNumber;
  return {
    luckyColor: luckyColors[daySeed % luckyColors.length],
    avoidDoing: avoidDoings[Math.floor(Math.random() * avoidDoings.length)]
  };
}

export function likeFortune(fortune: Fortune): Fortune {
  if (!fortune.isLiked) {
    recordLikedKeywords(fortune.keywords);
  }
  return { ...fortune, isLiked: true };
}
