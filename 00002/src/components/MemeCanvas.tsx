import React, { useRef, useEffect, useState, useCallback } from 'react';
import { TextSettings, FaceDetection, EmotionType } from '../types';
import { Move } from 'lucide-react';
import { emotionLabels } from '../services/faceDetection';

interface MemeCanvasProps {
  imageData: string;
  textSettings: TextSettings;
  detectedFaces: FaceDetection[];
  detectedEmotion: EmotionType | null;
  showFaceBox: boolean;
  onTextPositionChange: (x: number, y: number) => void;
}

export function MemeCanvas({ 
  imageData, 
  textSettings, 
  detectedFaces,
  detectedEmotion,
  showFaceBox,
  onTextPositionChange 
}: MemeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 400 });
  const imgNaturalSizeRef = useRef({ width: 400, height: 400 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      const maxSize = 500;
      let displayWidth = img.width;
      let displayHeight = img.height;

      if (displayWidth > maxSize || displayHeight > maxSize) {
        const ratio = Math.min(maxSize / displayWidth, maxSize / displayHeight);
        displayWidth = Math.round(displayWidth * ratio);
        displayHeight = Math.round(displayHeight * ratio);
      }

      imgNaturalSizeRef.current = { width: img.width, height: img.height };
      setCanvasSize({ width: displayWidth, height: displayHeight });

      canvas.width = displayWidth;
      canvas.height = displayHeight;
      ctx.drawImage(img, 0, 0, displayWidth, displayHeight);

      if (textSettings.content) {
        const x = (displayWidth * textSettings.x) / 100;
        const y = (displayHeight * textSettings.y) / 100;

        ctx.font = `bold ${textSettings.fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (textSettings.strokeWidth > 0) {
          ctx.strokeStyle = textSettings.strokeColor;
          ctx.lineWidth = textSettings.strokeWidth * 2;
          ctx.lineJoin = 'round';
          ctx.strokeText(textSettings.content, x, y);
        }

        ctx.fillStyle = textSettings.color;
        ctx.fillText(textSettings.content, x, y);
      }
    };
    img.src = imageData;
  }, [imageData, textSettings]);

  useEffect(() => {
    const mainCanvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!mainCanvas || !overlayCanvas) return;

    overlayCanvas.width = mainCanvas.width;
    overlayCanvas.height = mainCanvas.height;

    const ctx = overlayCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    if (!showFaceBox || detectedFaces.length === 0) return;

    const displayWidth = mainCanvas.width;
    const displayHeight = mainCanvas.height;
    const naturalWidth = imgNaturalSizeRef.current.width;
    const naturalHeight = imgNaturalSizeRef.current.height;

    const scaleX = displayWidth / naturalWidth;
    const scaleY = displayHeight / naturalHeight;

    detectedFaces.forEach((face) => {
      const sx = face.box.x * scaleX;
      const sy = face.box.y * scaleY;
      const sw = face.box.width * scaleX;
      const sh = face.box.height * scaleY;

      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(sx, sy, sw, sh);
      ctx.setLineDash([]);

      const emotionText = emotionLabels[face.emotion];
      const confidenceText = `${(face.confidence * 100).toFixed(0)}%`;
      const label = `${emotionText} ${confidenceText}`;
      
      ctx.font = 'bold 14px sans-serif';
      const labelWidth = ctx.measureText(label).width + 16;
      const labelHeight = 24;
      
      ctx.fillStyle = '#10b981';
      ctx.fillRect(sx, sy - labelHeight, labelWidth, labelHeight);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, sx + 8, sy - labelHeight / 2);
    });
  }, [detectedFaces, showFaceBox, canvasSize]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!textSettings.content) return;
      setIsDragging(true);
    },
    [textSettings.content]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / canvasSize.width) * 100;
      const y = ((e.clientY - rect.top) / canvasSize.height) * 100;

      const clampedX = Math.max(5, Math.min(95, x));
      const clampedY = Math.max(5, Math.min(95, y));

      onTextPositionChange(clampedX, clampedY);
    },
    [isDragging, canvasSize, onTextPositionChange]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (!textSettings.content) return;
      setIsDragging(true);
    },
    [textSettings.content]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDragging || !containerRef.current) return;
      e.preventDefault();

      const touch = e.touches[0];
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((touch.clientX - rect.left) / canvasSize.width) * 100;
      const y = ((touch.clientY - rect.top) / canvasSize.height) * 100;

      const clampedX = Math.max(5, Math.min(95, x));
      const clampedY = Math.max(5, Math.min(95, y));

      onTextPositionChange(clampedX, clampedY);
    },
    [isDragging, canvasSize, onTextPositionChange]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div className="flex flex-col items-center">
      <div
        ref={containerRef}
        className="relative inline-block rounded-xl overflow-hidden shadow-xl"
        style={{ cursor: textSettings.content ? 'move' : 'default', width: canvasSize.width, height: canvasSize.height }}
      >
        <canvas
          ref={canvasRef}
          className="block absolute top-0 left-0"
          style={{ touchAction: 'none' }}
        />
        <canvas
          ref={overlayCanvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="block absolute top-0 left-0"
          style={{ touchAction: 'none' }}
        />
        {textSettings.content && (
          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 z-10">
            <Move className="w-3 h-3" />
            拖拽移动文字
          </div>
        )}
      </div>
    </div>
  );
}

export function exportMemeToDataUrl(
  imageData: string,
  textSettings: TextSettings
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas not supported'));
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      ctx.drawImage(img, 0, 0);

      if (textSettings.content) {
        const x = (canvas.width * textSettings.x) / 100;
        const y = (canvas.height * textSettings.y) / 100;

        const scaleFactor = canvas.width / 400;
        const scaledFontSize = textSettings.fontSize * scaleFactor;

        ctx.font = `bold ${scaledFontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (textSettings.strokeWidth > 0) {
          ctx.strokeStyle = textSettings.strokeColor;
          ctx.lineWidth = textSettings.strokeWidth * 2 * scaleFactor;
          ctx.lineJoin = 'round';
          ctx.strokeText(textSettings.content, x, y);
        }

        ctx.fillStyle = textSettings.color;
        ctx.fillText(textSettings.content, x, y);
      }

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = imageData;
  });
}
