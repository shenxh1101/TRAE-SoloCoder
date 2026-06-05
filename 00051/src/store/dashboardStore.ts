import { create } from 'zustand';
import { dashboardApi, applicationApi } from '../services/api';

interface MonthlyCostData {
  month: string;
  count: number;
  cost: number;
}

interface DepartmentUsageData {
  department: string;
  count: number;
  cost: number;
  mileage: number;
}

interface ViolationRecord {
  id: string;
  type: string;
  description: string;
  user_name: string;
  vehicle_plate: string;
  created_at: string;
  userName?: string;
  vehiclePlate?: string;
  createdAt?: string;
}

interface DashboardStats {
  idleCount: number;
  inUseCount: number;
  maintenanceCount: number;
  todayUsage: number;
  violationCount: number;
  totalVehicles: number;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  status: string;
  type: string;
  userName?: string;
}

interface DashboardState {
  stats: DashboardStats;
  calendarEvents: CalendarEvent[];
  monthlyCostData: MonthlyCostData[];
  departmentUsageData: DepartmentUsageData[];
  violations: ViolationRecord[];
  violationRecords: ViolationRecord[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  lastUpdated: string;
  autoRefreshInterval: number | null;
  fetchStats: () => Promise<void>;
  refreshData: () => Promise<void>;
  getCalendarEvents: () => Promise<CalendarEvent[]>;
  getMonthlyCostData: () => MonthlyCostData[];
  getDepartmentUsageData: () => DepartmentUsageData[];
  fetchMonthlyCostData: () => Promise<void>;
  fetchDepartmentUsageData: () => Promise<void>;
  startAutoRefresh: () => void;
  stopAutoRefresh: () => void;
  clearError: () => void;
}

const initialStats: DashboardStats = {
  idleCount: 0,
  inUseCount: 0,
  maintenanceCount: 0,
  todayUsage: 0,
  violationCount: 0,
  totalVehicles: 0,
};

export const useDashboardStore = create<DashboardState>((set, get) => ({
  stats: initialStats,
  calendarEvents: [],
  monthlyCostData: [],
  departmentUsageData: [],
  violations: [],
  violationRecords: [],
  loading: false,
  refreshing: false,
  lastUpdated: new Date().toISOString(),
  error: null,
  autoRefreshInterval: null,

  fetchStats: async () => {
    try {
      const data = await dashboardApi.getStats();
      const violations = await dashboardApi.getViolations();
      const normalizedViolations = violations.map((v: ViolationRecord) => ({
        ...v,
        userName: v.userName || v.user_name,
        vehiclePlate: v.vehiclePlate || v.vehicle_plate,
        createdAt: v.createdAt || v.created_at,
      }));
      set({
        stats: data,
        violations: normalizedViolations,
        violationRecords: normalizedViolations,
        loading: false,
        refreshing: false,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('获取统计数据失败:', error);
      set({ refreshing: false, loading: false });
    }
  },

  refreshData: async () => {
    set({ refreshing: true });
    await get().fetchStats();
  },

  getCalendarEvents: async () => {
    try {
      const events = await applicationApi.getCalendarEvents();
      set({ calendarEvents: events });
      return events;
    } catch (error) {
      console.error('获取日历事件失败:', error);
      return [];
    }
  },

  fetchMonthlyCostData: async () => {
    try {
      const data = await dashboardApi.getMonthlyCost();
      set({ monthlyCostData: data });
    } catch (error: any) {
      console.error('获取月度费用数据失败:', error);
    }
  },

  getMonthlyCostData: () => {
    return get().monthlyCostData;
  },

  fetchDepartmentUsageData: async () => {
    try {
      const data = await dashboardApi.getDepartmentUsage();
      set({ departmentUsageData: data });
    } catch (error: any) {
      console.error('获取部门使用数据失败:', error);
    }
  },

  getDepartmentUsageData: () => {
    return get().departmentUsageData;
  },

  startAutoRefresh: () => {
    if (get().autoRefreshInterval) return;

    get().fetchStats();

    const interval = window.setInterval(() => {
      get().fetchStats();
    }, 10000);

    set({ autoRefreshInterval: interval });
  },

  stopAutoRefresh: () => {
    const interval = get().autoRefreshInterval;
    if (interval) {
      clearInterval(interval);
      set({ autoRefreshInterval: null });
    }
  },

  clearError: () => set({ error: null }),
}));
