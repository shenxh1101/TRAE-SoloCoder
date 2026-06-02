import type { ToneType } from '../types';

const toneMatrices: Record<ToneType, number[]> = {
  'retro-green': [
    0.3, 0.7, 0.2, 0,
    0.2, 0.6, 0.3, 0,
    0.1, 0.3, 0.4, 0,
    0, 0, 0, 1
  ],
  'warm-brown': [
    0.6, 0.3, 0.1, 0,
    0.4, 0.4, 0.2, 0,
    0.2, 0.3, 0.3, 0,
    0, 0, 0, 1
  ],
  'cyber-purple': [
    0.4, 0.2, 0.6, 0,
    0.3, 0.3, 0.5, 0,
    0.2, 0.4, 0.6, 0,
    0, 0, 0, 1
  ],
  'original': [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ]
};

export function applyToneFilter(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  tone: ToneType
): void {
  if (tone === 'original') return;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const matrix = toneMatrices[tone];

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    data[i] = Math.min(255, r * matrix[0] + g * matrix[1] + b * matrix[2] + matrix[3] * 255);
    data[i + 1] = Math.min(255, r * matrix[4] + g * matrix[5] + b * matrix[6] + matrix[7] * 255);
    data[i + 2] = Math.min(255, r * matrix[8] + g * matrix[9] + b * matrix[10] + matrix[11] * 255);
  }

  ctx.putImageData(imageData, 0, 0);
}

export function applyColorShift(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  colorShift: string
): void {
  const shiftMatrices: Record<string, number[]> = {
    'warm': [1.1, 0, 0, 0,  0, 1.05, 0, 0,  0, 0, 0.9, 0],
    'cool': [0.9, 0, 0, 0,  0, 1.05, 0, 0,  0, 0, 1.1, 0],
    'red': [1.2, 0, 0, 0,  0, 0.8, 0, 0,  0, 0, 0.8, 0],
    'blue': [0.8, 0, 0, 0,  0, 0.9, 0, 0,  0, 0, 1.2, 0],
    'yellow': [1.15, 0, 0, 0,  0, 1.1, 0, 0,  0, 0, 0.75, 0],
    'cyber': [1.0, 0, 0.2, 0,  0, 0.9, 0, 0,  0.2, 0, 1.1, 0],
    'pink': [1.2, 0, 0.1, 0,  0.1, 1.0, 0, 0,  0, 0, 1.1, 0],
    'green': [0.85, 0, 0, 0,  0, 1.15, 0, 0,  0, 0, 0.85, 0],
    'brown': [1.05, 0, 0, 0,  0, 0.95, 0, 0,  0, 0, 0.8, 0],
    'purple': [1.1, 0, 0.1, 0,  0, 0.9, 0.1, 0,  0.1, 0, 1.2, 0]
  };

  const matrix = shiftMatrices[colorShift] || shiftMatrices['warm'];
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    data[i] = Math.min(255, r * matrix[0] + g * matrix[1] + b * matrix[2]);
    data[i + 1] = Math.min(255, r * matrix[4] + g * matrix[5] + b * matrix[6]);
    data[i + 2] = Math.min(255, r * matrix[8] + g * matrix[9] + b * matrix[10]);
  }

  ctx.putImageData(imageData, 0, 0);
}
