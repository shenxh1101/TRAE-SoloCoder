import { create } from 'zustand';
import type { User, Task, Alert, DashboardStats } from '../types';

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  tasks: Task[];
  alerts: Alert[];
  dashboardStats: DashboardStats;
  sidebarOpen: boolean;
  currentTaskId: string | null;
  
  setUser: (user: User | null) => void;
  setTasks: (tasks: Task[]) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  setAlerts: (alerts: Alert[]) => void;
  setDashboardStats: (stats: DashboardStats) => void;
  toggleSidebar: () => void;
  setCurrentTask: (taskId: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: {
    id: '1',
    username: '张工',
    email: 'zhang@acoustic.com',
    role: 'engineer',
    isActive: true,
    createdAt: '2024-01-15T08:00:00Z',
  },
  isAuthenticated: true,
  tasks: [],
  alerts: [],
  dashboardStats: {
    totalTasksToday: 12,
    activeTasks: 5,
    pendingAlerts: 3,
    completionRate: 87.5,
    avgResponseTime: 245,
    complianceRate: 92.3,
  },
  sidebarOpen: true,
  currentTaskId: null,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  
  setTasks: (tasks) => set({ tasks }),
  
  updateTask: (taskId, updates) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId ? { ...task, ...updates } : task
      ),
    })),
    
  setAlerts: (alerts) => set({ alerts }),
  
  setDashboardStats: (stats) => set({ dashboardStats: stats }),
  
  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    
  setCurrentTask: (taskId) => set({ currentTaskId: taskId }),
}));
