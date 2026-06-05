import type { Point, ToolProperties } from '../../shared/types';

export function drawPen(ctx: CanvasRenderingContext2D, points: Point[], properties: ToolProperties) {
  if (points.length < 2) return;

  ctx.save();
  ctx.globalAlpha = properties.opacity;
  ctx.strokeStyle = properties.color;
  ctx.lineWidth = properties.size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
  }

  ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  ctx.stroke();
  ctx.restore();
}

export function drawEraser(ctx: CanvasRenderingContext2D, points: Point[], properties: ToolProperties) {
  if (points.length < 2) return;

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'destination-out';
  ctx.lineWidth = properties.size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
  }

  ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  ctx.stroke();
  ctx.restore();
}

export function drawLine(ctx: CanvasRenderingContext2D, points: Point[], properties: ToolProperties) {
  if (points.length < 2) return;

  const start = points[0];
  const end = points[points.length - 1];

  ctx.save();
  ctx.globalAlpha = properties.opacity;
  ctx.strokeStyle = properties.color;
  ctx.lineWidth = properties.size;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  ctx.restore();
}

export function drawRectangle(ctx: CanvasRenderingContext2D, points: Point[], properties: ToolProperties) {
  if (points.length < 2) return;

  const start = points[0];
  const end = points[points.length - 1];
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  ctx.save();
  ctx.globalAlpha = properties.opacity;
  ctx.strokeStyle = properties.color;
  ctx.fillStyle = properties.color;
  ctx.lineWidth = properties.size;

  if (properties.fill) {
    ctx.fillRect(x, y, width, height);
  } else {
    ctx.strokeRect(x, y, width, height);
  }
  ctx.restore();
}

export function drawCircle(ctx: CanvasRenderingContext2D, points: Point[], properties: ToolProperties) {
  if (points.length < 2) return;

  const start = points[0];
  const end = points[points.length - 1];
  const radiusX = Math.abs(end.x - start.x) / 2;
  const radiusY = Math.abs(end.y - start.y) / 2;
  const centerX = Math.min(start.x, end.x) + radiusX;
  const centerY = Math.min(start.y, end.y) + radiusY;

  ctx.save();
  ctx.globalAlpha = properties.opacity;
  ctx.strokeStyle = properties.color;
  ctx.fillStyle = properties.color;
  ctx.lineWidth = properties.size;

  ctx.beginPath();
  ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);

  if (properties.fill) {
    ctx.fill();
  } else {
    ctx.stroke();
  }
  ctx.restore();
}

export function drawText(ctx: CanvasRenderingContext2D, points: Point[], properties: ToolProperties) {
  if (points.length < 1) return;

  const position = points[0];
  const fontSize = properties.fontSize || 16;
  const fontFamily = properties.fontFamily || 'sans-serif';

  ctx.save();
  ctx.globalAlpha = properties.opacity;
  ctx.fillStyle = properties.color;
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.textBaseline = 'top';

  const text = (properties as unknown as { text?: string }).text || '';
  ctx.fillText(text, position.x, position.y);
  ctx.restore();
}

export function drawPreview(ctx: CanvasRenderingContext2D, points: Point[], properties: ToolProperties, toolType: string) {
  switch (toolType) {
    case 'pen':
      drawPen(ctx, points, properties);
      break;
    case 'eraser':
      drawEraser(ctx, points, properties);
      break;
    case 'line':
      drawLine(ctx, points, properties);
      break;
    case 'rectangle':
      drawRectangle(ctx, points, properties);
      break;
    case 'circle':
      drawCircle(ctx, points, properties);
      break;
    case 'text':
      drawText(ctx, points, properties);
      break;
  }
}

export function clearCanvas(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}
