import { useRef, useCallback, useEffect } from 'react';
import { useCanvasStore } from '../store/useCanvasStore';
import { useLayerStore } from '../store/useLayerStore';
import { useRoomStore } from '../store/useRoomStore';
import { clearCanvas, drawPreview as drawPreviewShape } from '../utils/drawing';
import type { Point, ToolProperties } from '../../shared/types';

interface UseCanvasRendererOptions {
  showGrid?: boolean;
  gridSize?: number;
  gridColor?: string;
}

export function useCanvasRenderer(options: UseCanvasRendererOptions = {}) {
  const { showGrid = true, gridSize = 20, gridColor = 'rgba(200, 200, 200, 0.3)' } = options;

  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mainCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const previewCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const needsRenderRef = useRef<boolean>(false);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const dprRef = useRef<number>(1);

  const offset = useCanvasStore((state) => state.offset);
  const zoom = useCanvasStore((state) => state.zoom);
  const cursors = useCanvasStore((state) => state.cursors);
  const layers = useLayerStore((state) => state.layers);
  const userId = useRoomStore((state) => state.userId);

  const drawGrid = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      if (!showGrid) return;

      ctx.save();
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;

      const scaledGridSize = gridSize * zoom;
      const offsetX = offset.x % scaledGridSize;
      const offsetY = offset.y % scaledGridSize;

      for (let x = offsetX; x < width; x += scaledGridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      for (let y = offsetY; y < height; y += scaledGridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      ctx.restore();
    },
    [showGrid, gridSize, gridColor, zoom, offset]
  );

  const drawCursors = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      ctx.save();
      ctx.translate(offset.x, offset.y);
      ctx.scale(zoom, zoom);

      Object.entries(cursors).forEach(([id, cursor]) => {
        if (id === userId) return;

        const { position, userName, color } = cursor;
        const cursorColor = color || '#3b82f6';

        ctx.save();
        ctx.translate(position.x, position.y);

        ctx.fillStyle = cursorColor;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(12, 4);
        ctx.lineTo(8, 8);
        ctx.lineTo(16, 16);
        ctx.lineTo(12, 20);
        ctx.lineTo(4, 12);
        ctx.lineTo(0, 16);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        if (userName) {
          ctx.fillStyle = cursorColor;
          ctx.fillRect(12, 12, Math.min(userName.length * 8 + 8, 100), 18);

          ctx.fillStyle = '#ffffff';
          ctx.font = '11px sans-serif';
          ctx.textBaseline = 'middle';
          ctx.fillText(userName, 16, 21);
        }

        ctx.restore();
      });

      ctx.restore();
    },
    [cursors, offset, zoom, userId]
  );

  const loadImageData = useCallback(async (imageData: string): Promise<HTMLImageElement | null> => {
    if (!imageData) return null;

    const cached = imageCacheRef.current.get(imageData);
    if (cached) return cached;

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        imageCacheRef.current.set(imageData, img);
        resolve(img);
      };
      img.onerror = reject;
      img.src = imageData;
    });
  }, []);

  const renderLayers = useCallback(
    async (ctx: CanvasRenderingContext2D, _width: number, _height: number) => {
      const visibleLayers = [...layers].filter((layer) => layer.visible).sort((a, b) => a.order - b.order);

      for (const layer of visibleLayers) {
        if (!layer.imageData) continue;

        try {
          const img = await loadImageData(layer.imageData);
          if (img) {
            ctx.save();
            ctx.globalAlpha = layer.opacity;
            ctx.translate(offset.x, offset.y);
            ctx.scale(zoom, zoom);
            ctx.drawImage(img, 0, 0);
            ctx.restore();
          }
        } catch (e) {
          console.error('Failed to load layer image:', e);
        }
      }
    },
    [layers, offset, zoom, loadImageData]
  );

  const render = useCallback(() => {
    needsRenderRef.current = true;

    const renderLoop = async () => {
      if (!needsRenderRef.current) return;

      const mainCtx = mainCtxRef.current;
      if (!mainCtx) {
        animationFrameRef.current = requestAnimationFrame(renderLoop);
        return;
      }

      const canvas = mainCtx.canvas;
      const dpr = dprRef.current;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      clearCanvas(mainCtx);

      drawGrid(mainCtx, width, height);

      await renderLayers(mainCtx, width, height);

      drawCursors(mainCtx);

      needsRenderRef.current = false;
      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    if (!animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(renderLoop);
    }
  }, [drawGrid, renderLayers, drawCursors]);

  const setupCanvas = useCallback(
    (mainCanvas: HTMLCanvasElement, previewCanvas: HTMLCanvasElement) => {
      mainCanvasRef.current = mainCanvas;
      previewCanvasRef.current = previewCanvas;

      const mainCtx = mainCanvas.getContext('2d');
      const previewCtx = previewCanvas.getContext('2d');

      if (!mainCtx || !previewCtx) {
        throw new Error('Failed to get canvas context');
      }

      mainCtxRef.current = mainCtx;
      previewCtxRef.current = previewCtx;

      const resizeCanvas = () => {
        const dpr = window.devicePixelRatio || 1;
        dprRef.current = dpr;
        const rect = mainCanvas.getBoundingClientRect();

        mainCanvas.width = rect.width * dpr;
        mainCanvas.height = rect.height * dpr;
        mainCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

        previewCanvas.width = rect.width * dpr;
        previewCanvas.height = rect.height * dpr;
        previewCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

        render();
      };

      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);

      return () => {
        window.removeEventListener('resize', resizeCanvas);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    },
    [render]
  );

  const drawPreview = useCallback(
    (points: Point[], properties: ToolProperties, toolType: string) => {
      const previewCtx = previewCtxRef.current;
      if (!previewCtx) return;

      clearCanvas(previewCtx);

      previewCtx.save();
      previewCtx.translate(offset.x, offset.y);
      previewCtx.scale(zoom, zoom);

      drawPreviewShape(previewCtx, points, properties, toolType);

      previewCtx.restore();
    },
    [offset, zoom]
  );

  const clearPreview = useCallback(() => {
    const previewCtx = previewCtxRef.current;
    if (!previewCtx) return;

    clearCanvas(previewCtx);
  }, []);

  const requestRender = useCallback(() => {
    needsRenderRef.current = true;
  }, []);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    requestRender();
  }, [layers, offset, zoom, cursors, requestRender]);

  return {
    mainCanvasRef,
    previewCanvasRef,
    setupCanvas,
    render,
    drawPreview,
    clearPreview,
    requestRender,
  };
}
