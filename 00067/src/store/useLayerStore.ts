import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Layer, HistoryEntry } from '../../shared/types';

type LayerState = {
  layers: Layer[];
  activeLayerId: string | null;
};

type LayerActions = {
  createLayer: (name?: string, imageData?: string) => Layer;
  deleteLayer: (layerId: string) => void;
  updateLayer: (layerId: string, updates: Partial<Omit<Layer, 'id'>>) => void;
  reorderLayers: (layerId: string, newOrder: number) => void;
  setActiveLayer: (layerId: string | null) => void;
  toggleLayerVisibility: (layerId: string) => void;
  updateLayerOpacity: (layerId: string, opacity: number) => void;
  renameLayer: (layerId: string, name: string) => void;
  setLayerImageData: (layerId: string, imageData: string, saveHistory?: boolean) => void;
  saveLayerHistory: (layerId: string, actionType: string, previousState: string, nextState: string) => void;
  undoLayer: (layerId: string) => string | null;
  redoLayer: (layerId: string) => string | null;
  reset: () => void;
};

const createInitialLayer = (name: string, order: number): Layer => ({
  id: uuidv4(),
  name,
  order,
  visible: true,
  opacity: 1,
  imageData: '',
  history: [],
  historyIndex: -1,
});

const initialState: LayerState = {
  layers: [createInitialLayer('图层 1', 0)],
  activeLayerId: null,
};

export const useLayerStore = create<LayerState & LayerActions>((set, get) => ({
  ...initialState,

  createLayer: (name = '新图层', imageData = '') => {
    const newLayer: Layer = {
      id: uuidv4(),
      name,
      order: get().layers.length,
      visible: true,
      opacity: 1,
      imageData,
      history: [],
      historyIndex: -1,
    };

    set((state) => ({
      layers: [...state.layers, newLayer],
    }));

    return newLayer;
  },

  deleteLayer: (layerId: string) =>
    set((state) => {
      const layerToDelete = state.layers.find((l) => l.id === layerId);
      if (!layerToDelete) return state;

      const remainingLayers = state.layers
        .filter((l) => l.id !== layerId)
        .map((layer) =>
          layer.order > layerToDelete.order
            ? { ...layer, order: layer.order - 1 }
            : layer
        );

      const newActiveLayerId =
        state.activeLayerId === layerId
          ? remainingLayers.length > 0
            ? remainingLayers[remainingLayers.length - 1].id
            : null
          : state.activeLayerId;

      return {
        layers: remainingLayers,
        activeLayerId: newActiveLayerId,
      };
    }),

  updateLayer: (layerId: string, updates: Partial<Omit<Layer, 'id'>>) =>
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === layerId ? { ...layer, ...updates } : layer
      ),
    })),

  reorderLayers: (layerId: string, newOrder: number) =>
    set((state) => {
      const layers = [...state.layers];
      const layerIndex = layers.findIndex((l) => l.id === layerId);
      if (layerIndex === -1) return state;

      const [movedLayer] = layers.splice(layerIndex, 1);
      const oldOrder = movedLayer.order;

      if (oldOrder < newOrder) {
        layers.forEach((layer) => {
          if (layer.order > oldOrder && layer.order <= newOrder) {
            layer.order -= 1;
          }
        });
      } else if (oldOrder > newOrder) {
        layers.forEach((layer) => {
          if (layer.order >= newOrder && layer.order < oldOrder) {
            layer.order += 1;
          }
        });
      }

      movedLayer.order = newOrder;
      layers.push(movedLayer);
      layers.sort((a, b) => a.order - b.order);

      return { layers };
    }),

  setActiveLayer: (layerId: string | null) =>
    set({
      activeLayerId: layerId,
    }),

  toggleLayerVisibility: (layerId: string) =>
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
      ),
    })),

  updateLayerOpacity: (layerId: string, opacity: number) =>
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === layerId
          ? { ...layer, opacity: Math.max(0, Math.min(1, opacity)) }
          : layer
      ),
    })),

  renameLayer: (layerId: string, name: string) =>
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === layerId ? { ...layer, name } : layer
      ),
    })),

  setLayerImageData: (layerId: string, imageData: string, saveHistory = false) =>
    set((state) => ({
      layers: state.layers.map((layer) => {
        if (layer.id !== layerId) return layer;

        if (saveHistory) {
          const historyEntry: HistoryEntry = {
            id: uuidv4(),
            layerId,
            actionType: 'update:imageData',
            previousState: layer.imageData,
            nextState: imageData,
            createdAt: Date.now(),
          };

          const newHistory = layer.history.slice(0, layer.historyIndex + 1);
          newHistory.push(historyEntry);

          return {
            ...layer,
            imageData,
            history: newHistory,
            historyIndex: newHistory.length - 1,
          };
        }

        return { ...layer, imageData };
      }),
    })),

  saveLayerHistory: (layerId: string, actionType: string, previousState: string, nextState: string) =>
    set((state) => ({
      layers: state.layers.map((layer) => {
        if (layer.id !== layerId) return layer;

        const historyEntry: HistoryEntry = {
          id: uuidv4(),
          layerId,
          actionType,
          previousState,
          nextState,
          createdAt: Date.now(),
        };

        const newHistory = layer.history.slice(0, layer.historyIndex + 1);
        newHistory.push(historyEntry);

        return {
          ...layer,
          history: newHistory,
          historyIndex: newHistory.length - 1,
        };
      }),
    })),

  undoLayer: (layerId: string) => {
    const state = get();
    const layer = state.layers.find((l) => l.id === layerId);

    if (!layer || layer.historyIndex < 0) return null;

    const historyEntry = layer.history[layer.historyIndex];
    const previousImageData = historyEntry.previousState;

    set((currentState) => ({
      layers: currentState.layers.map((l) =>
        l.id === layerId
          ? {
              ...l,
              imageData: previousImageData,
              historyIndex: l.historyIndex - 1,
            }
          : l
      ),
    }));

    return previousImageData !== undefined ? previousImageData : null;
  },

  redoLayer: (layerId: string) => {
    const state = get();
    const layer = state.layers.find((l) => l.id === layerId);

    if (!layer || layer.historyIndex >= layer.history.length - 1) return null;

    const nextIndex = layer.historyIndex + 1;
    const historyEntry = layer.history[nextIndex];
    const nextImageData = historyEntry.nextState;

    set((currentState) => ({
      layers: currentState.layers.map((l) =>
        l.id === layerId
          ? {
              ...l,
              imageData: nextImageData,
              historyIndex: nextIndex,
            }
          : l
      ),
    }));

    return nextImageData !== undefined ? nextImageData : null;
  },

  reset: () => set(initialState),
}));
