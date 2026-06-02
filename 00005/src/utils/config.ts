import type { Fragment, SceneConfig } from '../types';
import { randomGeometryType, randomRange } from './geometry';

const generateId = (): string => Math.random().toString(36).substring(2, 11);

const createPlaceholderGradient = (color1: string, color2: string): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const gradient = ctx.createRadialGradient(200, 200, 0, 200, 200, 200);
  gradient.addColorStop(0, color1);
  gradient.addColorStop(1, color2);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 400, 400);

  ctx.globalAlpha = 0.3;
  for (let i = 0; i < 20; i++) {
    ctx.beginPath();
    ctx.arc(
      Math.random() * 400,
      Math.random() * 400,
      Math.random() * 30 + 5,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fill();
  }

  return canvas.toDataURL('image/png');
};

const placeholderColors = [
  ['#6366f1', '#1e1b4b'],
  ['#06b6d4', '#0c4a6e'],
  ['#a855f7', '#3b0764'],
  ['#ec4899', '#831843'],
  ['#10b981', '#064e3b'],
  ['#f59e0b', '#7c2d12'],
  ['#3b82f6', '#1e3a8a'],
  ['#ef4444', '#7f1d1d'],
];

const createFragment = (index: number): Fragment => {
  const colors = placeholderColors[index % placeholderColors.length];
  return {
    id: generateId(),
    geometryType: randomGeometryType(),
    size: randomRange(0.8, 1.5),
    orbitRadius: randomRange(3, 8),
    orbitEllipticity: randomRange(0.3, 0.7),
    orbitTilt: randomRange(-0.8, 0.8),
    orbitPhase: randomRange(0, Math.PI * 2),
    rotationSpeed: randomRange(0.2, 0.8),
    imageData: createPlaceholderGradient(colors[0], colors[1]),
    imageName: `dream-${index + 1}.png`,
  };
};

export const generateDefaultConfig = (): SceneConfig => {
  const fragmentCount = Math.floor(randomRange(5, 9));
  return {
    lucidity: 0.5,
    fragmentCount,
    fragments: Array.from({ length: fragmentCount }, (_, i) => createFragment(i)),
  };
};

export const serializeConfig = (config: SceneConfig): string => {
  return JSON.stringify(config, null, 2);
};

export const deserializeConfig = (json: string): SceneConfig | null => {
  try {
    const parsed = JSON.parse(json);
    if (!parsed.fragments || !Array.isArray(parsed.fragments)) return null;
    if (typeof parsed.lucidity !== 'number') return null;
    return parsed as SceneConfig;
  } catch {
    return null;
  }
};

export const downloadConfig = (config: SceneConfig, filename: string = 'dream-config.json'): void => {
  const json = serializeConfig(config);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
