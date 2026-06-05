import { create } from 'zustand';
import { Application, ReturnRecord, Maintenance } from '../types';
import { applicationApi, returnApi, maintenanceApi } from '../services/api';

interface ApplicationState {
  applications: Application[];
  returnRecords: ReturnRecord[];
  maintenanceRecords: Maintenance[];
  loading: boolean;
  error: string | null;
  fetchApplications: (filters?: any) => Promise<void>;
  fetchReturnRecords: () => Promise<void>;
  fetchMaintenanceRecords: () => Promise<void>;
  createApplication: (data: Omit<Application, 'id' | 'createdAt' | 'status' | 'escalated'>) => Promise<boolean>;
  approveApplication: (id: string, approverId: string, comment?: string) => Promise<boolean>;
  rejectApplication: (id: string, approverId: string, comment?: string) => Promise<boolean>;
  startUsage: (id: string) => Promise<boolean>;
  returnVehicle: (data: Omit<ReturnRecord, 'id' | 'returnedAt'>) => Promise<boolean>;
  createMaintenance: (data: Omit<Maintenance, 'id' | 'createdAt' | 'status'>) => Promise<boolean>;
  updateMaintenanceStatus: (id: string, status: Maintenance['status']) => Promise<boolean>;
  checkAndEscalatePending: () => void;
  getMyApplications: (userId: string) => Application[];
  getPendingApprovals: (userId: string, userRole: string, userDepartment: string) => Promise<Application[]>;
  getActiveApplications: () => Application[];
  getApplicationsByFilter: (filters: any) => Application[];
  getApplicationById: (id: string) => Application | undefined;
  clearError: () => void;
}

export const useApplicationStore = create<ApplicationState>((set, get) => ({
  applications: [],
  returnRecords: [],
  maintenanceRecords: [],
  loading: false,
  error: null,

  fetchApplications: async (filters?: any) => {
    set({ loading: true, error: null });
    try {
      const data = await applicationApi.getAll(filters);
      set({ applications: data, loading: false });
    } catch (error: any) {
      set({ error: error.message || '获取申请列表失败', loading: false });
    }
  },

  fetchReturnRecords: async () => {
    set({ loading: true, error: null });
    try {
      const data = await returnApi.getAll();
      set({ returnRecords: data, loading: false });
    } catch (error: any) {
      set({ error: error.message || '获取还车记录失败', loading: false });
    }
  },

  fetchMaintenanceRecords: async () => {
    set({ loading: true, error: null });
    try {
      const data = await maintenanceApi.getAll();
      set({ maintenanceRecords: data, loading: false });
    } catch (error: any) {
      set({ error: error.message || '获取维修记录失败', loading: false });
    }
  },

  createApplication: async (data) => {
    set({ loading: true, error: null });
    try {
      await applicationApi.create(data);
      await get().fetchApplications();
      return true;
    } catch (error: any) {
      set({ error: error.message || '创建申请失败', loading: false });
      return false;
    }
  },

  approveApplication: async (id, approverId, comment) => {
    set({ loading: true, error: null });
    try {
      await applicationApi.approve(id, comment);
      await get().fetchApplications();
      return true;
    } catch (error: any) {
      set({ error: error.message || '审批失败', loading: false });
      return false;
    }
  },

  rejectApplication: async (id, approverId, comment) => {
    set({ loading: true, error: null });
    try {
      await applicationApi.reject(id, comment);
      await get().fetchApplications();
      return true;
    } catch (error: any) {
      set({ error: error.message || '拒绝失败', loading: false });
      return false;
    }
  },

  startUsage: async (id) => {
    set({ loading: true, error: null });
    try {
      await applicationApi.complete(id);
      await get().fetchApplications();
      return true;
    } catch (error: any) {
      set({ error: error.message || '开始使用失败', loading: false });
      return false;
    }
  },

  returnVehicle: async (data) => {
    set({ loading: true, error: null });
    try {
      await returnApi.create(data);
      await get().fetchApplications();
      await get().fetchReturnRecords();
      return true;
    } catch (error: any) {
      set({ error: error.message || '还车失败', loading: false });
      return false;
    }
  },

  createMaintenance: async (data) => {
    set({ loading: true, error: null });
    try {
      await maintenanceApi.create(data);
      await get().fetchMaintenanceRecords();
      return true;
    } catch (error: any) {
      set({ error: error.message || '创建维修记录失败', loading: false });
      return false;
    }
  },

  updateMaintenanceStatus: async (id, status) => {
    set({ loading: true, error: null });
    try {
      await maintenanceApi.updateStatus(id, status);
      await get().fetchMaintenanceRecords();
      return true;
    } catch (error: any) {
      set({ error: error.message || '更新维修状态失败', loading: false });
      return false;
    }
  },

  checkAndEscalatePending: () => {
  },

  getMyApplications: (userId) => {
    return get().applications.filter((app) => app.userId === userId);
  },

  getPendingApprovals: async () => {
    try {
      return await applicationApi.getPendingApprovals();
    } catch (error) {
      console.error('获取待审批列表失败:', error);
      return [];
    }
  },

  getActiveApplications: () => {
    return get().applications.filter((app) =>
      ['approved', 'in_progress'].includes(app.status)
    );
  },

  getApplicationsByFilter: (filters) => {
    return get().applications.filter((app) => {
      if (filters.vehicleId && app.vehicleId !== filters.vehicleId) return false;
      if (filters.department && app.userDepartment !== filters.department) return false;
      if (filters.userId && app.userId !== filters.userId) return false;
      if (filters.startDate && new Date(app.startTime) < new Date(filters.startDate)) return false;
      if (filters.endDate && new Date(app.endTime) > new Date(filters.endDate)) return false;
      return true;
    });
  },

  getApplicationById: (id) => {
    return get().applications.find((app) => app.id === id);
  },

  clearError: () => set({ error: null }),
}));
