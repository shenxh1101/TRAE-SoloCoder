import { create } from 'zustand';
import type { RealtimeData, VisitorStatistics } from '../types';
import { generateRealtimeData, mockVisitorStatistics } from '../utils/mockData';
import { useNotificationStore } from './useNotificationStore';

interface MonitorState {
  realtimeData: RealtimeData[];
  visitorStatistics: VisitorStatistics[];
  activeWarnings: string[];
  lastUpdate: string;
  refreshRealtimeData: () => void;
  getRealtimeByHall: (hallId: string) => RealtimeData | undefined;
  getStatisticsByBooking: (bookingId: string) => VisitorStatistics[];
  getWarningHalls: () => RealtimeData[];
  addWarning: (hallId: string) => void;
  resolveWarning: (hallId: string) => void;
  getTotalVisitors: () => number;
  getAverageUtilization: () => number;
  autoRefresh: boolean;
  toggleAutoRefresh: () => void;
  startAutoRefresh: () => void;
  stopAutoRefresh: () => void;
  refreshInterval: number | null;
}

export const useMonitorStore = create<MonitorState>((set, get) => ({
  realtimeData: generateRealtimeData(),
  visitorStatistics: mockVisitorStatistics,
  activeWarnings: [],
  lastUpdate: new Date().toISOString(),
  autoRefresh: true,
  refreshInterval: null,

  refreshRealtimeData: () => {
    const newData = generateRealtimeData();
    const warningHalls = newData.filter(
      (d) => d.warningLevel === 'warning' || d.warningLevel === 'danger'
    );

    warningHalls.forEach((hall) => {
      if (!get().activeWarnings.includes(hall.hallId)) {
        get().addWarning(hall.hallId);
      }
    });

    set({
      realtimeData: newData,
      lastUpdate: new Date().toISOString(),
    });
  },

  getRealtimeByHall: (hallId) =>
    get().realtimeData.find((d) => d.hallId === hallId),

  getStatisticsByBooking: (bookingId) =>
    get().visitorStatistics.filter((s) => s.bookingId === bookingId),

  getWarningHalls: () =>
    get().realtimeData.filter(
      (d) => d.warningLevel === 'warning' || d.warningLevel === 'danger'
    ),

  addWarning: (hallId) => {
    const hallData = get().realtimeData.find((d) => d.hallId === hallId);
    const hall = hallData?.hallName || hallId;

    set((state) => ({
      activeWarnings: [...new Set([...state.activeWarnings, hallId])],
    }));

    if (hallData) {
      const levelText = hallData.warningLevel === 'danger' ? '紧急' : '注意';
      useNotificationStore.getState().pushWarningNotification(
        'operator-1',
        hallId,
        `【${levelText}预警】${hall}人流量异常`,
        `${hall}当前人流量: ${hallData.currentVisitors}人，超过安全阈值！建议采取限流措施，点击查看详情。`
      );
    }
  },

  resolveWarning: (hallId) => {
    set((state) => ({
      activeWarnings: state.activeWarnings.filter((id) => id !== hallId),
    }));
  },

  getTotalVisitors: () =>
    get().realtimeData.reduce((sum, d) => sum + d.currentVisitors, 0),

  getAverageUtilization: () => {
    const data = get().realtimeData;
    if (data.length === 0) return 0;
    const sum = data.reduce((sum, d) => sum + d.boothUtilization, 0);
    return Math.round((sum / data.length) * 100) / 100;
  },

  toggleAutoRefresh: () => {
    const { autoRefresh } = get();
    if (autoRefresh) {
      get().stopAutoRefresh();
    } else {
      get().startAutoRefresh();
    }
    set({ autoRefresh: !autoRefresh });
  },

  startAutoRefresh: () => {
    get().stopAutoRefresh();
    const interval = window.setInterval(() => {
      get().refreshRealtimeData();
    }, 5000);
    set({ refreshInterval: interval });
  },

  stopAutoRefresh: () => {
    const { refreshInterval } = get();
    if (refreshInterval) {
      clearInterval(refreshInterval);
      set({ refreshInterval: null });
    }
  },
}));
