import { useCallback, useRef } from 'react';
import type { ToneType, PlacedDecoration } from '../types';
import { pixelateImage, adjustBrightnessContrast, loadImage } from '../utils/pixelate';
import { applyToneFilter, applyColorShift } from '../utils/filters';
import { renderDecoration, getDecorationById } from '../utils/decorations';

const TONES: ToneType[] = ['original', 'retro-green', 'warm-brown', 'cyber-purple'];

export function useImageProcessor() {
  const cacheRef = useRef<Map<string, Record<ToneType, string>>>(new Map());

  const processImage = useCallback(async (
    imageUrl: string,
    blockSize: number,
    brightness: number,
    contrast: number,
    decorations: PlacedDecoration[],
    selectedTone?: ToneType
  ): Promise<Record<ToneType, string>> => {
    const img = await loadImage(imageUrl);

    const imgWidth = 'naturalWidth' in img ? (img as HTMLImageElement).naturalWidth : (img as ImageBitmap).width;
    const imgHeight = 'naturalHeight' in img ? (img as HTMLImageElement).naturalHeight : (img as ImageBitmap).height;

    const size = Math.min(imgWidth, imgHeight, 512);
    const sx = Math.floor((imgWidth - size) / 2);
    const sy = Math.floor((imgHeight - size) / 2);

    const results: Record<ToneType, string> = {
      'original': '',
      'retro-green': '',
      'warm-brown': '',
      'cyber-purple': ''
    };

    const tonesToProcess = selectedTone ? [selectedTone] : TONES;

    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = size;
    srcCanvas.height = size;
    const srcCtx = srcCanvas.getContext('2d')!;
    srcCtx.drawImage(img, sx, sy, size, size, 0, 0, size, size);

    const pixelCanvas = document.createElement('canvas');
    pixelCanvas.width = size;
    pixelCanvas.height = size;
    const pixelCtx = pixelCanvas.getContext('2d')!;
    pixelateImage(pixelCtx, srcCanvas, blockSize, size, size);
    adjustBrightnessContrast(pixelCtx, size, size, brightness, contrast);

    const pixelData = pixelCtx.getImageData(0, 0, size, size);

    for (const tone of tonesToProcess) {
      const toneCanvas = document.createElement('canvas');
      toneCanvas.width = size;
      toneCanvas.height = size;
      const toneCtx = toneCanvas.getContext('2d')!;
      toneCtx.putImageData(pixelData, 0, 0);
      applyToneFilter(toneCtx, size, size, tone);

      for (const placed of decorations) {
        const decoration = getDecorationById(placed.decorationId);
        if (decoration) {
          renderDecoration(toneCtx, decoration, placed, size, size);
        }
      }

      results[tone] = toneCanvas.toDataURL('image/png');
    }

    if (!selectedTone) {
      const cacheKey = `${imageUrl}-${blockSize}-${brightness}-${contrast}`;
      cacheRef.current.set(cacheKey, results);
    }

    return results;
  }, []);

  const processMemeImage = useCallback(async (
    imageUrl: string,
    blockSize: number,
    colorShift: string,
    mouthCurve: number,
    browAngle: number,
    eyeScale: number
  ): Promise<string> => {
    const img = await loadImage(imageUrl);

    const imgWidth = 'naturalWidth' in img ? (img as HTMLImageElement).naturalWidth : (img as ImageBitmap).width;
    const imgHeight = 'naturalHeight' in img ? (img as HTMLImageElement).naturalHeight : (img as ImageBitmap).height;

    const size = Math.min(imgWidth, imgHeight, 256);
    const sx = Math.floor((imgWidth - size) / 2);
    const sy = Math.floor((imgHeight - size) / 2);

    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = size;
    srcCanvas.height = size;
    const srcCtx = srcCanvas.getContext('2d')!;
    srcCtx.drawImage(img, sx, sy, size, size, 0, 0, size, size);

    const pixelCanvas = document.createElement('canvas');
    pixelCanvas.width = size;
    pixelCanvas.height = size;
    const pixelCtx = pixelCanvas.getContext('2d')!;
    pixelateImage(pixelCtx, srcCanvas, blockSize, size, size);

    const centerX = size / 2;
    const centerY = size / 2;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = size;
    tempCanvas.height = size;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(pixelCtx.getImageData(0, 0, size, size), 0, 0);

    pixelCtx.clearRect(0, 0, size, size);
    pixelCtx.save();
    pixelCtx.translate(centerX, centerY);
    const stretchY = 1 + (mouthCurve * 0.08);
    const stretchX = 1 + Math.abs(browAngle) * 0.002;
    pixelCtx.scale(stretchX, stretchY);
    const eyeDistortion = (eyeScale - 1) * 0.08;
    if (eyeDistortion !== 0) {
      pixelCtx.translate(0, -eyeDistortion * size * 0.08);
    }
    pixelCtx.drawImage(tempCanvas, -centerX, -centerY);
    pixelCtx.restore();

    applyColorShift(pixelCtx, size, size, colorShift);

    return pixelCanvas.toDataURL('image/png');
  }, []);

  return { processImage, processMemeImage };
}
