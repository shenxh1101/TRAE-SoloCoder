import { create } from 'zustand';
import type { ModeType, PixelSettings, ToneType, Preset, PlacedDecoration, ProcessedImage, Decoration } from '../types';
import { decorations } from '../utils/decorations';

const DEFAULT_SETTINGS: PixelSettings = {
  blockSize: 8,
  tone: 'original',
  brightness: 0,
  contrast: 0,
};

interface StoreState {
  mode: ModeType;
  settings: PixelSettings;
  currentImage: ProcessedImage | null;
  batchImages: ProcessedImage[];
  presets: Preset[];
  placedDecorations: PlacedDecoration[];
  selectedDecorationId: string | null;
  batchProgress: number;
  batchTotal: number;

  setMode: (mode: ModeType) => void;
  setSettings: (settings: Partial<PixelSettings>) => void;
  setCurrentImage: (image: ProcessedImage | null) => void;
  setBatchImages: (images: ProcessedImage[]) => void;
  addBatchImage: (image: ProcessedImage) => void;
  removeBatchImage: (id: string) => void;
  updateBatchImageProcessed: (id: string, tone: ToneType, dataUrl: string) => void;
  loadPresets: () => void;
  savePreset: (name: string) => void;
  deletePreset: (id: string) => void;
  applyPreset: (id: string) => void;
  addDecoration: (decorationId: string, position?: { x: number; y: number }, scale?: number) => void;
  updateDecoration: (id: string, updates: Partial<PlacedDecoration>) => void;
  removeDecoration: (id: string) => void;
  setSelectedDecorationId: (id: string | null) => void;
  clearDecorations: () => void;
  setBatchProgress: (current: number, total: number) => void;
}

export const useStore = create<StoreState>((set, get) => ({
  mode: 'single',
  settings: { ...DEFAULT_SETTINGS },
  currentImage: null,
  batchImages: [],
  presets: [],
  placedDecorations: [],
  selectedDecorationId: null,
  batchProgress: 0,
  batchTotal: 0,

  setMode: (mode) => set({ mode, placedDecorations: [], selectedDecorationId: null }),

  setSettings: (partial) => set((state) => ({
    settings: { ...state.settings, ...partial }
  })),

  setCurrentImage: (image) => set({ currentImage: image, placedDecorations: [], selectedDecorationId: null }),

  setBatchImages: (images) => set({ batchImages: images }),

  addBatchImage: (image) => set((state) => ({
    batchImages: [...state.batchImages, image]
  })),

  removeBatchImage: (id) => set((state) => ({
    batchImages: state.batchImages.filter(img => img.id !== id)
  })),

  updateBatchImageProcessed: (id, tone, dataUrl) => set((state) => ({
    batchImages: state.batchImages.map(img =>
      img.id === id
        ? { ...img, processedDataUrls: { ...img.processedDataUrls, [tone]: dataUrl } }
        : img
    )
  })),

  loadPresets: () => {
    try {
      const stored = localStorage.getItem('pixel-presets');
      if (stored) {
        set({ presets: JSON.parse(stored) });
      }
    } catch {
      set({ presets: [] });
    }
  },

  savePreset: (name) => {
    const { settings, presets } = get();
    const newPreset: Preset = {
      id: `preset-${Date.now()}`,
      name,
      settings: { ...settings },
      createdAt: Date.now()
    };
    const updated = [...presets, newPreset];
    localStorage.setItem('pixel-presets', JSON.stringify(updated));
    set({ presets: updated });
  },

  deletePreset: (id) => {
    const updated = get().presets.filter(p => p.id !== id);
    localStorage.setItem('pixel-presets', JSON.stringify(updated));
    set({ presets: updated });
  },

  applyPreset: (id) => {
    const preset = get().presets.find(p => p.id === id);
    if (preset) {
      set({ settings: { ...preset.settings } });
    }
  },

  addDecoration: (decorationId: string, position?: { x: number; y: number }, scale?: number) => {
    const decoration: Decoration | undefined = decorations.find(d => d.id === decorationId);
    if (!decoration) {
      console.warn('Decoration not found:', decorationId);
      return;
    }
    const now = Date.now();
    const placed: PlacedDecoration = {
      id: `${decorationId}-${now}`,
      decorationId,
      x: position?.x ?? decoration.defaultX,
      y: position?.y ?? decoration.defaultY,
      scale: scale ?? decoration.defaultScale,
      rotation: 0,
      layer: now
    };
    const currentList = get().placedDecorations;
    set({
      placedDecorations: [...currentList, placed],
      selectedDecorationId: placed.id
    });
  },

  updateDecoration: (id, updates) => set((state) => ({
    placedDecorations: state.placedDecorations.map(d =>
      d.id === id ? { ...d, ...updates } : d
    )
  })),

  removeDecoration: (id) => set((state) => ({
    placedDecorations: state.placedDecorations.filter(d => d.id !== id),
    selectedDecorationId: state.selectedDecorationId === id ? null : state.selectedDecorationId
  })),

  setSelectedDecorationId: (id) => set({ selectedDecorationId: id }),

  clearDecorations: () => set({ placedDecorations: [], selectedDecorationId: null }),

  setBatchProgress: (current, total) => set({ batchProgress: current, batchTotal: total }),
}));
