import { create } from 'zustand';
import type { Point, ToolType } from '../../shared/types';

interface CursorInfo {
  position: Point;
  userId: string;
  userName?: string;
  color?: string;
  toolType?: ToolType;
}

interface CanvasViewState {
  offset: { x: number; y: number };
  zoom: number;
  isDragging: boolean;
  cursors: Record<string, CursorInfo>;
}

interface CanvasViewActions {
  setOffset: (offset: { x: number; y: number }) => void;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  setDragging: (isDragging: boolean) => void;
  updateCursor: (userId: string, cursor: CursorInfo) => void;
  removeCursor: (userId: string) => void;
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.1;

const initialState: CanvasViewState = {
  offset: { x: 0, y: 0 },
  zoom: 1,
  isDragging: false,
  cursors: {},
};

export const useCanvasStore = create<CanvasViewState & CanvasViewActions>((set) => ({
  ...initialState,

  setOffset: (offset) => set({ offset }),

  setZoom: (zoom) =>
    set({
      zoom: Math.min(Math.max(zoom, MIN_ZOOM), MAX_ZOOM),
    }),

  zoomIn: () =>
    set((state) => ({
      zoom: Math.min(state.zoom + ZOOM_STEP, MAX_ZOOM),
    })),

  zoomOut: () =>
    set((state) => ({
      zoom: Math.max(state.zoom - ZOOM_STEP, MIN_ZOOM),
    })),

  resetView: () => set(initialState),

  setDragging: (isDragging) => set({ isDragging }),

  updateCursor: (userId, cursor) =>
    set((state) => ({
      cursors: {
        ...state.cursors,
        [userId]: cursor,
      },
    })),

  removeCursor: (userId) =>
    set((state) => {
      const newCursors = { ...state.cursors };
      delete newCursors[userId];
      return { cursors: newCursors };
    }),
}));
