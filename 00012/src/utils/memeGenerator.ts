import type { MemeCell } from '../types';

export const memeTemplates: MemeCell[] = [
  { id: 'happy',    name: '开心',  emoji: '😄', transform: { eyeScale: 1.2, mouthCurve: 0.8, browAngle: 10, colorShift: 'warm' } },
  { id: 'angry',    name: '生气',  emoji: '😠', transform: { eyeScale: 1.3, mouthCurve: -0.5, browAngle: -20, colorShift: 'red' } },
  { id: 'sad',      name: '伤心',  emoji: '😢', transform: { eyeScale: 0.9, mouthCurve: -0.3, browAngle: 15, colorShift: 'blue' } },
  { id: 'surprised',name: '惊讶',  emoji: '😮', transform: { eyeScale: 1.5, mouthCurve: 0, browAngle: -10, colorShift: 'yellow' } },
  { id: 'cool',     name: '酷',    emoji: '😎', transform: { eyeScale: 1, mouthCurve: 0.2, browAngle: 0, colorShift: 'cyber' } },
  { id: 'love',     name: '爱心',  emoji: '😍', transform: { eyeScale: 1.1, mouthCurve: 0.6, browAngle: 5, colorShift: 'pink' } },
  { id: 'laugh',    name: '大笑',  emoji: '😂', transform: { eyeScale: 1.2, mouthCurve: 1, browAngle: 5, colorShift: 'green' } },
  { id: 'think',    name: '思考',  emoji: '🤔', transform: { eyeScale: 0.95, mouthCurve: -0.1, browAngle: -5, colorShift: 'brown' } },
  { id: 'wink',     name: '眨眼',  emoji: '😉', transform: { eyeScale: 0.7, mouthCurve: 0.4, browAngle: 0, colorShift: 'purple' } },
];

export function applyMemeTransform(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  transform: MemeCell['transform']
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const centerX = width / 2;
  const centerY = height / 2;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCtx.putImageData(imageData, 0, 0);

  ctx.clearRect(0, 0, width, height);

  ctx.save();
  ctx.translate(centerX, centerY);

  const stretchY = 1 + (transform.mouthCurve * 0.15);
  const stretchX = 1 + (transform.browAngle * 0.002);

  ctx.scale(stretchX, stretchY);

  const eyeDistortion = (transform.eyeScale - 1) * 0.1;
  if (eyeDistortion !== 0) {
    ctx.translate(0, -eyeDistortion * height * 0.1);
  }

  ctx.drawImage(tempCanvas, -centerX, -centerY);
  ctx.restore();
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}
