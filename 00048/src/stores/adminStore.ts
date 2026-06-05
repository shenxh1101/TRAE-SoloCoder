import { create } from 'zustand';
import type { DashboardData, HeatmapPoint } from '../../shared/types';
import { get } from '@/utils/api';

interface AdminState {
  dashboardData: DashboardData | null;
  heatmapData: HeatmapPoint[];
  loading: boolean;
}

interface AdminActions {
  fetchDashboard: () => Promise<void>;
  fetchHeatmap: (timeRange?: string) => Promise<void>;
  exportReport: (filters?: Record<string, string>) => Promise<void>;
}

const useAdminStore = create<AdminState & AdminActions>((set) => ({
  dashboardData: null,
  heatmapData: [],
  loading: false,

  fetchDashboard: async () => {
    set({ loading: true });
    try {
      const data = await get<any>('/admin/dashboard');
      set({
        dashboardData: {
          totalRescues: data.total_rescues || 0,
          adoptionRate: data.adoption_rate || 0,
          pendingTasks: data.pending_tasks || 0,
          activeVolunteers: data.active_volunteers || 0,
          totalDonations: data.total_donations || 0,
          hospitalAnimals: Array.isArray(data.hospital_animals) ? data.hospital_animals : [],
          monthlyTrend: Array.isArray(data.monthly_trend) ? data.monthly_trend : [],
          cityStats: Array.isArray(data.city_stats) ? data.city_stats : [],
        },
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  fetchHeatmap: async (timeRange?: string) => {
    set({ loading: true });
    try {
      const query = timeRange ? `?period=${timeRange}` : '';
      const data = await get<any>(`/admin/heatmap${query}`);
      set({
        heatmapData: Array.isArray(data?.districts) ? data.districts.map((d: any) => ({
          city: d.city,
          district: d.district,
          lat: d.avg_latitude,
          lng: d.avg_longitude,
          count: d.count,
        })) : Array.isArray(data?.points) ? data.points.map((p: any) => ({
          city: p.city,
          district: p.district,
          lat: p.latitude,
          lng: p.longitude,
          count: 1,
        })) : [],
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  exportReport: async (filters) => {
    const query = filters ? '?' + new URLSearchParams(filters).toString() : '';
    const res = await fetch(`/api/admin/export${query}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const disposition = res.headers.get('content-disposition');
    const filename = disposition ? disposition.split('filename=')[1]?.replace(/"/g, '') : 'report.csv';
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
}));

export default useAdminStore;
