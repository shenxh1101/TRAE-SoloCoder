import type { Decoration, PlacedDecoration } from '../types';

export const decorations: Decoration[] = [
  {
    id: 'glasses-001',
    type: 'glasses',
    name: '经典黑框',
    pixels: [
      [1,1,1,1,0,0,0,1,1,1,1],
      [1,0,0,0,1,1,1,0,0,0,1],
      [1,0,2,2,0,0,0,2,2,0,1],
      [1,0,2,2,0,0,0,2,2,0,1],
      [1,0,0,0,1,1,1,0,0,0,1],
      [1,1,1,1,0,0,0,1,1,1,1],
    ],
    colors: ['#000000', '#1a1a1a', '#ffffff'],
    defaultScale: 1,
    defaultX: 50,
    defaultY: 40
  },
  {
    id: 'glasses-002',
    type: 'glasses',
    name: '复古圆框',
    pixels: [
      [0,1,1,1,0,0,0,1,1,1,0],
      [1,0,0,0,1,1,1,0,0,0,1],
      [1,0,2,2,0,0,0,2,2,0,1],
      [1,0,2,2,0,0,0,2,2,0,1],
      [1,0,0,0,1,1,1,0,0,0,1],
      [0,1,1,1,0,0,0,1,1,1,0],
    ],
    colors: ['#8B4513', '#D2691E', '#ffffff'],
    defaultScale: 1,
    defaultX: 50,
    defaultY: 40
  },
  {
    id: 'glasses-003',
    type: 'glasses',
    name: '赛博墨镜',
    pixels: [
      [1,1,1,1,1,1,1,1,1,1,1],
      [1,2,2,2,1,1,1,2,2,2,1],
      [1,2,2,2,1,1,1,2,2,2,1],
      [1,2,2,2,1,1,1,2,2,2,1],
      [1,2,2,2,1,1,1,2,2,2,1],
      [1,1,1,1,1,1,1,1,1,1,1],
    ],
    colors: ['#000000', '#a855f7', '#ffffff'],
    defaultScale: 1,
    defaultX: 50,
    defaultY: 40
  },
  {
    id: 'mustache-001',
    type: 'mustache',
    name: '绅士八字胡',
    pixels: [
      [0,0,1,1,0,0,0,1,1,0,0],
      [0,1,1,1,1,0,1,1,1,1,0],
      [1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,0,1,1,1,0,1,1,1],
      [1,1,0,0,0,1,0,0,0,1,1],
    ],
    colors: ['#2d1810', '#4a2c1a', '#ffffff'],
    defaultScale: 0.8,
    defaultX: 50,
    defaultY: 60
  },
  {
    id: 'mustache-002',
    type: 'mustache',
    name: '大胡子',
    pixels: [
      [0,0,1,1,1,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,1,1,1,0],
      [1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,0,1,0,1,1,1,1],
      [0,1,1,0,0,1,0,0,1,1,0],
      [0,0,1,0,0,0,0,0,1,0,0],
    ],
    colors: ['#8B4513', '#A0522D', '#ffffff'],
    defaultScale: 0.9,
    defaultX: 50,
    defaultY: 65
  },
  {
    id: 'hat-001',
    type: 'hat',
    name: '礼帽',
    pixels: [
      [0,0,0,1,1,1,1,1,0,0,0],
      [0,0,1,1,1,1,1,1,1,0,0],
      [0,0,1,2,2,2,2,2,1,0,0],
      [0,0,1,1,1,1,1,1,1,0,0],
      [1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1],
    ],
    colors: ['#000000', '#1a1a1a', '#ffffff'],
    defaultScale: 1,
    defaultX: 50,
    defaultY: 15
  },
  {
    id: 'hat-002',
    type: 'hat',
    name: '棒球帽',
    pixels: [
      [0,0,1,1,1,1,1,1,0,0,0],
      [0,1,1,1,1,1,1,1,1,0,0],
      [1,1,1,1,1,1,1,1,1,1,0],
      [1,1,1,1,1,1,1,1,1,1,1],
      [0,0,0,0,1,1,1,0,0,0,0],
    ],
    colors: ['#ef4444', '#dc2626', '#ffffff'],
    defaultScale: 1,
    defaultX: 50,
    defaultY: 18
  },
  {
    id: 'hat-003',
    type: 'hat',
    name: '圣诞帽',
    pixels: [
      [0,0,0,0,0,0,0,1,1,0,0],
      [0,0,0,0,0,1,1,1,1,1,0],
      [0,0,0,1,1,1,1,1,1,1,1],
      [0,1,1,1,1,1,1,1,1,1,1],
      [2,2,2,2,2,2,2,2,2,2,2],
    ],
    colors: ['#ef4444', '#dc2626', '#ffffff'],
    defaultScale: 1,
    defaultX: 50,
    defaultY: 15
  },
  {
    id: 'mask-001',
    type: 'mask',
    name: '像素口罩',
    pixels: [
      [0,1,1,1,1,1,1,1,1,1,0],
      [1,1,1,1,1,1,1,1,1,1,1],
      [1,1,2,2,2,2,2,2,2,1,1],
      [1,1,2,2,2,2,2,2,2,1,1],
      [1,1,1,1,1,1,1,1,1,1,1],
      [0,1,1,1,1,1,1,1,1,1,0],
    ],
    colors: ['#6b7280', '#9ca3af', '#ffffff'],
    defaultScale: 1,
    defaultX: 50,
    defaultY: 55
  },
  {
    id: 'earring-001',
    type: 'earring',
    name: '十字耳饰',
    pixels: [
      [0,1,0],
      [1,1,1],
      [0,1,0],
      [0,2,0],
      [0,2,0],
    ],
    colors: ['#ffd700', '#ffec8b', '#ffffff'],
    defaultScale: 0.6,
    defaultX: 15,
    defaultY: 45
  }
];

export function renderDecoration(
  ctx: CanvasRenderingContext2D,
  decoration: Decoration,
  placed: PlacedDecoration,
  canvasWidth: number,
  canvasHeight: number
): void {
  const { pixels, colors } = decoration;
  const pixelHeight = pixels.length;
  const pixelWidth = pixels[0].length;
  
  const blockSize = Math.max(4, Math.round(canvasWidth / 64));
  const scaledBlockSize = blockSize * placed.scale;
  
  const centerX = (placed.x / 100) * canvasWidth;
  const centerY = (placed.y / 100) * canvasHeight;
  
  const totalWidth = pixelWidth * scaledBlockSize;
  const totalHeight = pixelHeight * scaledBlockSize;
  
  const startX = centerX - totalWidth / 2;
  const startY = centerY - totalHeight / 2;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate((placed.rotation * Math.PI) / 180);
  ctx.translate(-centerX, -centerY);

  for (let row = 0; row < pixelHeight; row++) {
    for (let col = 0; col < pixelWidth; col++) {
      const colorIndex = pixels[row][col];
      if (colorIndex === 0) continue;
      
      ctx.fillStyle = colors[colorIndex - 1] || colors[0];
      ctx.fillRect(
        Math.round(startX + col * scaledBlockSize),
        Math.round(startY + row * scaledBlockSize),
        Math.ceil(scaledBlockSize),
        Math.ceil(scaledBlockSize)
      );
    }
  }

  ctx.restore();
}

export function createPlacedDecoration(decorationId: string): PlacedDecoration {
  const decoration = decorations.find(d => d.id === decorationId);
  if (!decoration) throw new Error(`Decoration ${decorationId} not found`);

  return {
    id: `${decorationId}-${Date.now()}`,
    decorationId,
    x: decoration.defaultX,
    y: decoration.defaultY,
    scale: decoration.defaultScale,
    rotation: 0,
    layer: Date.now()
  };
}

export function getDecorationById(id: string): Decoration | undefined {
  return decorations.find(d => d.id === id);
}
