import { create } from 'zustand';
import { Vehicle, VehicleStatus } from '../types';
import { vehicleApi } from '../services/api';

interface VehicleState {
  vehicles: Vehicle[];
  loading: boolean;
  error: string | null;
  fetchVehicles: (status?: string) => Promise<void>;
  addVehicle: (data: Omit<Vehicle, 'id' | 'createdAt'>) => Promise<boolean>;
  updateVehicle: (id: string, data: Partial<Vehicle>) => Promise<boolean>;
  toggleVehicleStatus: (id: string) => Promise<boolean>;
  getAvailableVehicles: (
    startTime: Date,
    endTime: Date,
    seats: number
  ) => Promise<{ vehicle: Vehicle; matchScore: number }[]>;
  getVehicleById: (id: string) => Vehicle | undefined;
  updateVehicleStatus: (id: string, status: VehicleStatus) => Promise<boolean>;
  clearError: () => void;
}

export const useVehicleStore = create<VehicleState>((set, get) => ({
  vehicles: [],
  loading: false,
  error: null,

  fetchVehicles: async (status?: string) => {
    set({ loading: true, error: null });
    try {
      const data = await vehicleApi.getAll(status);
      set({ vehicles: data, loading: false });
    } catch (error: any) {
      set({ error: error.message || '获取车辆列表失败', loading: false });
    }
  },

  addVehicle: async (data) => {
    set({ loading: true, error: null });
    try {
      await vehicleApi.create(data);
      await get().fetchVehicles();
      return true;
    } catch (error: any) {
      set({ error: error.message || '添加车辆失败', loading: false });
      return false;
    }
  },

  updateVehicle: async (id, data) => {
    set({ loading: true, error: null });
    try {
      await vehicleApi.update(id, data);
      await get().fetchVehicles();
      return true;
    } catch (error: any) {
      set({ error: error.message || '更新车辆失败', loading: false });
      return false;
    }
  },

  toggleVehicleStatus: async (id) => {
    set({ loading: true, error: null });
    try {
      await vehicleApi.toggleStatus(id);
      await get().fetchVehicles();
      return true;
    } catch (error: any) {
      set({ error: error.message || '切换车辆状态失败', loading: false });
      return false;
    }
  },

  getAvailableVehicles: async (startTime, endTime, seats) => {
    try {
      const data = await vehicleApi.getAvailable(
        startTime.toISOString(),
        endTime.toISOString(),
        seats
      );
      return data;
    } catch (error) {
      console.error('获取可用车辆失败:', error);
      return [];
    }
  },

  getVehicleById: (id) => {
    return get().vehicles.find((v) => v.id === id);
  },

  updateVehicleStatus: async (id, status) => {
    set({ loading: true, error: null });
    try {
      await vehicleApi.update(id, { status });
      await get().fetchVehicles();
      return true;
    } catch (error: any) {
      set({ error: error.message || '更新车辆状态失败', loading: false });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
