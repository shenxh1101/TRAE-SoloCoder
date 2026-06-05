import { useRef, useCallback, useEffect, useState } from 'react';
import { useToolStore } from '../store/useToolStore';
import { useLayerStore } from '../store/useLayerStore';
import { useCanvasStore } from '../store/useCanvasStore';
import { useRoomStore } from '../store/useRoomStore';
import { useWebSocket } from './useWebSocket';
import { drawPreview as drawPreviewShape } from '../utils/drawing';
import type { Point, ToolProperties } from '../../shared/types';

interface UseDrawingOptions {
  onDrawComplete?: () => void;
}

interface UseDrawingReturn {
  handleMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleMouseUp: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleTouchStart: (e: React.TouchEvent<HTMLCanvasElement>) => void;
  handleTouchMove: (e: React.TouchEvent<HTMLCanvasElement>) => void;
  handleTouchEnd: (e: React.TouchEvent<HTMLCanvasElement>) => void;
  handleWheel: (e: React.WheelEvent<HTMLCanvasElement>) => void;
  handleKeyDown: (e: KeyboardEvent) => void;
  handleKeyUp: (e: KeyboardEvent) => void;
  isDrawing: boolean;
  isDraggingCanvas: boolean;
}

export function useDrawing(
  drawPreview: (points: Point[], properties: ToolProperties, toolType: string) => void,
  clearPreview: () => void,
  requestRender: () => void,
  options: UseDrawingOptions = {}
): UseDrawingReturn {
  const { onDrawComplete } = options;

  const isDrawingRef = useRef(false);
  const isDraggingCanvasRef = useRef(false);
  const isSpacePressedRef = useRef(false);
  const pointsRef = useRef<Point[]>([]);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const tempCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const tempCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);

  const currentTool = useToolStore((state) => state.currentTool);
  const toolProperties = useToolStore((state) => state.properties);
  const activeLayerId = useLayerStore((state) => state.activeLayerId);
  const layers = useLayerStore((state) => state.layers);
  const setLayerImageData = useLayerStore((state) => state.setLayerImageData);
  const offset = useCanvasStore((state) => state.offset);
  const zoom = useCanvasStore((state) => state.zoom);
  const setOffset = useCanvasStore((state) => state.setOffset);
  const setZoom = useCanvasStore((state) => state.setZoom);
  const setDragging = useCanvasStore((state) => state.setDragging);
  const userId = useRoomStore((state) => state.userId);
  const roomId = useRoomStore((state) => state.roomId);

  const { sendDrawAction, sendViewUpdate, sendCursorUpdate, isConnected } = useWebSocket();

  useEffect(() => {
    tempCanvasRef.current = document.createElement('canvas');
    tempCtxRef.current = tempCanvasRef.current.getContext('2d');
    return () => {
      tempCanvasRef.current = null;
      tempCtxRef.current = null;
    };
  }, []);

  const screenToCanvas = useCallback(
    (screenX: number, screenY: number, canvasRect: DOMRect): Point => {
      const x = (screenX - canvasRect.left - offset.x) / zoom;
      const y = (screenY - canvasRect.top - offset.y) / zoom;
      return { x, y };
    },
    [offset, zoom]
  );

  const getPressure = useCallback((e: React.MouseEvent | React.Touch): number => {
    if ('pressure' in e && typeof e.pressure === 'number' && e.pressure > 0) {
      return e.pressure;
    }
    return 0.5;
  }, []);

  const isDragTrigger = useCallback((e: React.MouseEvent): boolean => {
    return isSpacePressedRef.current || e.button === 1;
  }, []);

  const finalizeDrawing = useCallback(() => {
    if (!activeLayerId || pointsRef.current.length < 1) {
      pointsRef.current = [];
      isDrawingRef.current = false;
      setIsDrawing(false);
      clearPreview();
      return;
    }

    const activeLayer = layers.find((l) => l.id === activeLayerId);
    if (!activeLayer) {
      pointsRef.current = [];
      isDrawingRef.current = false;
      setIsDrawing(false);
      clearPreview();
      return;
    }

    const tempCanvas = tempCanvasRef.current;
    const tempCtx = tempCtxRef.current;
    if (!tempCanvas || !tempCtx) {
      pointsRef.current = [];
      isDrawingRef.current = false;
      setIsDrawing(false);
      clearPreview();
      return;
    }

    const previousImageData = activeLayer.imageData;

    const completeDrawing = (canvas: HTMLCanvasElement) => {
      const newImageData = canvas.toDataURL('image/png');
      setLayerImageData(activeLayerId, newImageData, true);

      if (isConnected && roomId && userId) {
        sendDrawAction(activeLayerId, currentTool, pointsRef.current, toolProperties);
      }

      clearPreview();
      requestRender();
      pointsRef.current = [];
      isDrawingRef.current = false;
      setIsDrawing(false);

      onDrawComplete?.();
    };

    if (previousImageData) {
      const img = new Image();
      img.onload = () => {
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        tempCtx.drawImage(img, 0, 0);

        tempCtx.save();
        drawPreviewShape(tempCtx, pointsRef.current, toolProperties, currentTool);
        tempCtx.restore();

        completeDrawing(tempCanvas);
      };
      img.src = previousImageData;
    } else {
      const minX = Math.min(...pointsRef.current.map((p) => p.x)) - toolProperties.size;
      const minY = Math.min(...pointsRef.current.map((p) => p.y)) - toolProperties.size;
      const maxX = Math.max(...pointsRef.current.map((p) => p.x)) + toolProperties.size;
      const maxY = Math.max(...pointsRef.current.map((p) => p.y)) + toolProperties.size;

      const width = Math.max(Math.ceil(maxX - minX), 1);
      const height = Math.max(Math.ceil(maxY - minY), 1);

      tempCanvas.width = width;
      tempCanvas.height = height;

      const translatedPoints = pointsRef.current.map((p) => ({
        x: p.x - minX,
        y: p.y - minY,
        pressure: p.pressure,
      }));

      tempCtx.save();
      drawPreviewShape(tempCtx, translatedPoints, toolProperties, currentTool);
      tempCtx.restore();

      completeDrawing(tempCanvas);
    }
  }, [
    activeLayerId,
    layers,
    toolProperties,
    currentTool,
    setLayerImageData,
    clearPreview,
    requestRender,
    isConnected,
    roomId,
    userId,
    sendDrawAction,
    onDrawComplete,
  ]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = e.currentTarget;
      const rect = canvas.getBoundingClientRect();

      if (isDragTrigger(e)) {
        isDraggingCanvasRef.current = true;
        setIsDraggingCanvas(true);
        setDragging(true);
        lastMousePosRef.current = { x: e.clientX, y: e.clientY };
        e.preventDefault();
        return;
      }

      if (!activeLayerId || e.button !== 0) return;

      const point = screenToCanvas(e.clientX, e.clientY, rect);
      const pressure = getPressure(e);

      isDrawingRef.current = true;
      setIsDrawing(true);
      pointsRef.current = [{ ...point, pressure }];

      drawPreview(pointsRef.current, toolProperties, currentTool);

      if (isConnected && roomId && userId) {
        sendCursorUpdate(point, currentTool);
      }
    },
    [
      activeLayerId,
      screenToCanvas,
      getPressure,
      isDragTrigger,
      drawPreview,
      toolProperties,
      currentTool,
      setDragging,
      isConnected,
      roomId,
      userId,
      sendCursorUpdate,
    ]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = e.currentTarget;
      const rect = canvas.getBoundingClientRect();
      const point = screenToCanvas(e.clientX, e.clientY, rect);

      if (isConnected && roomId && userId) {
        sendCursorUpdate(point, currentTool);
      }

      if (isDraggingCanvasRef.current) {
        const dx = e.clientX - lastMousePosRef.current.x;
        const dy = e.clientY - lastMousePosRef.current.y;

        setOffset({
          x: offset.x + dx,
          y: offset.y + dy,
        });

        lastMousePosRef.current = { x: e.clientX, y: e.clientY };

        if (isConnected && roomId && userId) {
          sendViewUpdate(
            { x: offset.x + dx, y: offset.y + dy },
            zoom
          );
        }

        e.preventDefault();
        return;
      }

      if (!isDrawingRef.current || !activeLayerId) return;

      const pressure = getPressure(e);
      pointsRef.current.push({ ...point, pressure });

      drawPreview(pointsRef.current, toolProperties, currentTool);
    },
    [
      activeLayerId,
      screenToCanvas,
      getPressure,
      drawPreview,
      toolProperties,
      currentTool,
      offset,
      zoom,
      setOffset,
      isConnected,
      roomId,
      userId,
      sendCursorUpdate,
      sendViewUpdate,
    ]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isDraggingCanvasRef.current) {
        isDraggingCanvasRef.current = false;
        setIsDraggingCanvas(false);
        setDragging(false);
        e.preventDefault();
        return;
      }

      if (!isDrawingRef.current) return;

      finalizeDrawing();
    },
    [setDragging, finalizeDrawing]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (e.touches.length !== 1) return;

      const canvas = e.currentTarget;
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];

      if (!activeLayerId) return;

      const point = screenToCanvas(touch.clientX, touch.clientY, rect);
      const pressure = getPressure(touch);

      isDrawingRef.current = true;
      setIsDrawing(true);
      pointsRef.current = [{ ...point, pressure }];

      drawPreview(pointsRef.current, toolProperties, currentTool);

      if (isConnected && roomId && userId) {
        sendCursorUpdate(point, currentTool);
      }

      e.preventDefault();
    },
    [
      activeLayerId,
      screenToCanvas,
      getPressure,
      drawPreview,
      toolProperties,
      currentTool,
      isConnected,
      roomId,
      userId,
      sendCursorUpdate,
    ]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (e.touches.length !== 1) return;

      const canvas = e.currentTarget;
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];

      const point = screenToCanvas(touch.clientX, touch.clientY, rect);

      if (isConnected && roomId && userId) {
        sendCursorUpdate(point, currentTool);
      }

      if (!isDrawingRef.current || !activeLayerId) return;

      const pressure = getPressure(touch);
      pointsRef.current.push({ ...point, pressure });

      drawPreview(pointsRef.current, toolProperties, currentTool);

      e.preventDefault();
    },
    [
      activeLayerId,
      screenToCanvas,
      getPressure,
      drawPreview,
      toolProperties,
      currentTool,
      isConnected,
      roomId,
      userId,
      sendCursorUpdate,
    ]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current) return;

      finalizeDrawing();
      e.preventDefault();
    },
    [finalizeDrawing]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();

      const canvas = e.currentTarget;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.min(Math.max(zoom * zoomDelta, 0.1), 5);

      const newOffsetX = mouseX - (mouseX - offset.x) * (newZoom / zoom);
      const newOffsetY = mouseY - (mouseY - offset.y) * (newZoom / zoom);

      setZoom(newZoom);
      setOffset({ x: newOffsetX, y: newOffsetY });

      if (isConnected && roomId && userId) {
        sendViewUpdate({ x: newOffsetX, y: newOffsetY }, newZoom);
      }
    },
    [offset, zoom, setOffset, setZoom, isConnected, roomId, userId, sendViewUpdate]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        isSpacePressedRef.current = true;
      }
    },
    []
  );

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpacePressedRef.current = false;
      }
    },
    []
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleWheel,
    handleKeyDown,
    handleKeyUp,
    isDrawing,
    isDraggingCanvas,
  };
}
