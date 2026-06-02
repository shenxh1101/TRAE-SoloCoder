import { create } from 'zustand';
import { PagodaConfig, defaultConfig, BodyColor, SpireType } from '@/types';

interface PagodaState {
  config: PagodaConfig;
  setFloors: (floors: number) => void;
  setRoofAngle: (angle: number) => void;
  setBodyColor: (color: BodyColor) => void;
  setSpireType: (type: SpireType) => void;
  setSunPosition: (x: number, y: number, z: number) => void;
  setShadowsEnabled: (enabled: boolean) => void;
  setGridHelper: (enabled: boolean) => void;
  setFirefliesEnabled: (enabled: boolean) => void;
  setConfig: (config: PagodaConfig) => void;
  resetConfig: () => void;
}

export const usePagodaStore = create<PagodaState>((set) => ({
  config: defaultConfig,
  
  setFloors: (floors) =>
    set((state) => ({ config: { ...state.config, floors: Math.max(3, Math.min(9, floors)) } })),
  
  setRoofAngle: (roofAngle) =>
    set((state) => ({ config: { ...state.config, roofAngle: Math.max(0, Math.min(45, roofAngle)) } })),
  
  setBodyColor: (bodyColor) =>
    set((state) => ({ config: { ...state.config, bodyColor } })),
  
  setSpireType: (spireType) =>
    set((state) => ({ config: { ...state.config, spireType } })),
  
  setSunPosition: (x, y, z) =>
    set((state) => ({ config: { ...state.config, sunPosition: { x, y, z } } })),
  
  setShadowsEnabled: (shadowsEnabled) =>
    set((state) => ({ config: { ...state.config, shadowsEnabled } })),
  
  setGridHelper: (gridHelper) =>
    set((state) => ({ config: { ...state.config, gridHelper } })),
  
  setFirefliesEnabled: (firefliesEnabled) =>
    set((state) => ({ config: { ...state.config, firefliesEnabled } })),
  
  setConfig: (config) => set({ config }),
  
  resetConfig: () => set({ config: defaultConfig }),
}));

export const calculatePagodaHeight = (floors: number): number => {
  const baseHeight = 1.5;
  const floorHeight = 1.2;
  const spireHeight = 2;
  return baseHeight + floors * floorHeight + spireHeight;
};
