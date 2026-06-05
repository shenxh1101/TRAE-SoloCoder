import { create } from 'zustand';

export type ToolType = 'pen' | 'eraser' | 'line' | 'rectangle' | 'circle' | 'text';

export interface ToolProperties {
  size: number;
  color: string;
  opacity: number;
  fill: boolean;
  fontSize: number;
  fontFamily: string;
}

interface ToolState {
  currentTool: ToolType;
  properties: ToolProperties;
  setTool: (tool: ToolType) => void;
  setProperties: (properties: Partial<ToolProperties>) => void;
  updateProperty: <K extends keyof ToolProperties>(
    key: K,
    value: ToolProperties[K]
  ) => void;
  resetProperties: () => void;
}

const defaultProperties: ToolProperties = {
  size: 4,
  color: '#000000',
  opacity: 1,
  fill: false,
  fontSize: 16,
  fontFamily: 'Arial',
};

export const useToolStore = create<ToolState>((set) => ({
  currentTool: 'pen',
  properties: { ...defaultProperties },
  setTool: (tool) => set({ currentTool: tool }),
  setProperties: (newProperties) =>
    set((state) => ({
      properties: { ...state.properties, ...newProperties },
    })),
  updateProperty: (key, value) =>
    set((state) => ({
      properties: { ...state.properties, [key]: value },
    })),
  resetProperties: () => set({ properties: { ...defaultProperties } }),
}));
