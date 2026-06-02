import type { Fortune, DailyInfo } from './fortuneEngine';

const W = 600;
const PADDING = 40;
const LH = 24;

function drawStars(ctx: CanvasRenderingContext2D, width: number, height: number, count: number = 80): void {
  for (let i = 0; i < count; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const radius = Math.random() * 1.5 + 0.5;
    const opacity = Math.random() * 0.5 + 0.3;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.fill();
  }
}

function measureLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): number {
  let line = '';
  let count = 1;
  for (let n = 0; n < text.length; n++) {
    const testLine = line + text[n];
    if (ctx.measureText(testLine).width > maxWidth && n > 0) {
      line = text[n];
      count++;
    } else {
      line = testLine;
    }
  }
  return count;
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  let line = '';
  let lineCount = 0;
  for (let n = 0; n < text.length; n++) {
    const testLine = line + text[n];
    if (ctx.measureText(testLine).width > maxWidth && n > 0) {
      ctx.fillText(line, x, y + lineCount * lineHeight);
      line = text[n];
      lineCount++;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y + lineCount * lineHeight);
  return lineCount + 1;
}

function calcContentHeight(
  ctx: CanvasRenderingContext2D,
  fortunes: Fortune[],
  dailyInfo: DailyInfo
): number {
  const maxTextW = W - PADDING * 2 - 32;
  let h = 0;

  h += 70;
  h += 28;
  h += 20;

  fortunes.forEach(() => {
    h += LH + 4;
  });

  ctx.font = '15px "PingFang SC", "Microsoft YaHei", sans-serif';
  fortunes.forEach(fortune => {
    const lines = measureLines(ctx, fortune.content, maxTextW);
    h += lines * LH + 14;
  });

  h += 42;

  h += 36;
  const avoidLines = measureLines(ctx, dailyInfo.avoidDoing, maxTextW - 130);
  h += avoidLines * LH + 20;

  h += 70;

  return Math.ceil(h);
}

export function generateShareCard(
  fortunes: Fortune[],
  dailyInfo: DailyInfo,
  mode: 'normal' | 'reverse'
): Promise<string> {
  return new Promise((resolve) => {
    const measureCanvas = document.createElement('canvas');
    measureCanvas.width = W;
    const mctx = measureCanvas.getContext('2d')!;
    const contentH = calcContentHeight(mctx, fortunes, dailyInfo);
    const H = Math.max(contentH, 500);

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#2D1B69');
    grad.addColorStop(0.5, '#1A1A2E');
    grad.addColorStop(1, '#0F0F1A');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    drawStars(ctx, W, H, 120);

    const accent = '#FFD700';
    ctx.font = 'bold 34px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 20;
    ctx.fillText(mode === 'normal' ? '✨ AI 算命机 ✨' : '💀 反向毒奶 💀', W / 2, 60);
    ctx.shadowBlur = 0;

    ctx.font = '13px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText(`生成时间: ${new Date().toLocaleDateString('zh-CN')}`, W / 2, 88);

    let curY = 120;
    const maxTextW = W - PADDING * 2 - 32;

    fortunes.forEach((fortune, idx) => {
      ctx.font = 'bold 15px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = accent;
      ctx.fillText(`「${idx + 1}」`, PADDING, curY);

      ctx.font = '15px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      const lines = drawWrappedText(ctx, fortune.content, PADDING + 32, curY, maxTextW, LH);
      curY += lines * LH + 14;
    });

    curY += 12;
    ctx.strokeStyle = 'rgba(255,215,0,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PADDING, curY);
    ctx.lineTo(W - PADDING, curY);
    ctx.stroke();
    curY += 30;

    ctx.font = 'bold 15px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = accent;
    ctx.fillText('🎨 今日幸运色', PADDING, curY);

    ctx.fillStyle = dailyInfo.luckyColor.hex;
    const colorBlockX = 160;
    const colorBlockW = 40;
    const colorBlockH = 20;
    const colorBlockY = curY - 14;
    ctx.beginPath();
    ctx.moveTo(colorBlockX + 4, colorBlockY);
    ctx.lineTo(colorBlockX + colorBlockW - 4, colorBlockY);
    ctx.quadraticCurveTo(colorBlockX + colorBlockW, colorBlockY, colorBlockX + colorBlockW, colorBlockY + 4);
    ctx.lineTo(colorBlockX + colorBlockW, colorBlockY + colorBlockH - 4);
    ctx.quadraticCurveTo(colorBlockX + colorBlockW, colorBlockY + colorBlockH, colorBlockX + colorBlockW - 4, colorBlockY + colorBlockH);
    ctx.lineTo(colorBlockX + 4, colorBlockY + colorBlockH);
    ctx.quadraticCurveTo(colorBlockX, colorBlockY + colorBlockH, colorBlockX, colorBlockY + colorBlockH - 4);
    ctx.lineTo(colorBlockX, colorBlockY + 4);
    ctx.quadraticCurveTo(colorBlockX, colorBlockY, colorBlockX + 4, colorBlockY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '15px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(dailyInfo.luckyColor.name, colorBlockX + colorBlockW + 8, curY);
    curY += 36;

    ctx.font = 'bold 15px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#FF6B6B';
    ctx.fillText('⚠️ 不宜做的事', PADDING, curY);
    ctx.font = '15px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    const avoidLines = drawWrappedText(ctx, dailyInfo.avoidDoing, PADDING + 130, curY, maxTextW - 130, LH);
    curY += avoidLines * LH + 20;

    ctx.font = '13px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.textAlign = 'center';
    ctx.fillText('AI 算命机 · 仅供娱乐', W / 2, H - 40);
    ctx.fillText('长按保存图片，分享到朋友圈', W / 2, H - 18);

    resolve(canvas.toDataURL('image/png'));
  });
}

export function downloadImage(dataUrl: string, filename: string = 'fortune-card.png'): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
