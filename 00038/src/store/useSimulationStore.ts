import { create } from 'zustand';
import {
  Simulation,
  SimulationStatus,
  SimulationMode,
  PlasmaParameters,
  BoundaryCondition,
  SourceTerm,
  Notification,
  ComparisonResult,
  TimeSeriesData,
  OptimizationSuggestion,
  STATUS_FLOW,
  RadarDataPoint,
} from '../../shared/types';
import { v4 as uuidv4 } from 'uuid';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

interface SimulationState {
  simulations: Simulation[];
  currentSimulation: Simulation | null;
  notifications: Notification[];
  comparisonResult: ComparisonResult | null;
  isLoading: boolean;
  error: string | null;

  fetchSimulations: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  setCurrentSimulation: (id: string) => void;
  createSimulation: (data: Partial<Simulation>) => Promise<Simulation>;
  updateSimulation: (id: string, updates: Partial<Simulation>) => void;
  deleteSimulation: (id: string) => Promise<void>;
  startSimulation: (id: string) => Promise<void>;
  pauseSimulation: (id: string) => Promise<void>;
  resumeSimulation: (id: string) => Promise<void>;

  updateSimulationStatus: (id: string, status: SimulationStatus, message?: string) => void;
  updateProgress: (id: string, progress: number) => void;
  updateGrowthRate: (id: string, rate: number) => void;
  addTimeSeriesData: (id: string, data: TimeSeriesData) => void;
  adjustTimeStep: (id: string, newStep: number) => void;
  switchMode: (id: string, mode: SimulationMode) => void;
  incrementConvergenceCount: (id: string) => void;
  resetConvergenceCount: (id: string) => void;
  setSimulationResult: (id: string, result: Simulation['result']) => void;

  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;

  compareSimulations: (ids: string[]) => Promise<void>;
  clearComparison: () => void;

  getSimulationsByStatus: (status: SimulationStatus) => Simulation[];
  getUnreadNotificationCount: () => number;

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  initWebSocket: () => void;
  disconnectWebSocket: () => void;
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  simulations: [],
  currentSimulation: null,
  notifications: [],
  comparisonResult: null,
  isLoading: false,
  error: null,

  initWebSocket: () => {
    if (socket) return;

    socket = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    socket.on('simulation:progress', (data) => {
      const { id, progress, status, instabilityGrowthRate, convergenceCount } = data;
      set((state) => ({
        simulations: state.simulations.map((s) =>
          s.id === id
            ? { ...s, progress, status, instabilityGrowthRate, convergenceCount }
            : s
        ),
        currentSimulation:
          state.currentSimulation?.id === id
            ? { ...state.currentSimulation, progress, status, instabilityGrowthRate, convergenceCount }
            : state.currentSimulation,
      }));
    });

    socket.on('simulation:updated', (sim: Simulation) => {
      set((state) => ({
        simulations: state.simulations.map((s) => (s.id === sim.id ? sim : s)),
        currentSimulation:
          state.currentSimulation?.id === sim.id ? sim : state.currentSimulation,
      }));
    });

    socket.on('simulation:created', (sim: Simulation) => {
      set((state) => ({
        simulations: [sim, ...state.simulations],
      }));
    });

    socket.on('simulation:completed', (sim: Simulation) => {
      set((state) => ({
        simulations: state.simulations.map((s) => (s.id === sim.id ? sim : s)),
        currentSimulation:
          state.currentSimulation?.id === sim.id ? sim : state.currentSimulation,
      }));
    });

    socket.on('notification:created', (notification: Notification) => {
      set((state) => ({
        notifications: [notification, ...state.notifications],
      }));
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });
  },

  disconnectWebSocket: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  fetchSimulations: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/simulations');
      const data = await res.json();
      set({ simulations: data });
    } catch (error) {
      set({ error: '获取模拟列表失败' });
      console.error('Failed to fetch simulations:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchNotifications: async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      set({ notifications: data });
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  },

  setCurrentSimulation: (id) => {
    const simulation = get().simulations.find((s) => s.id === id) || null;
    set({ currentSimulation: simulation });
  },

  createSimulation: async (data) => {
    const now = new Date().toISOString();
    const newSimData = {
      name: data.name || '未命名模拟',
      description: data.description || '',
      parameters: data.parameters || {
        densityProfile: [[1e19, 0.8e19], [1.2e19, 0.9e19]],
        temperatureProfile: [[1e7, 0.9e7], [1.2e7, 1e7]],
        magneticField: 5.0,
        majorRadius: 1.8,
        minorRadius: 0.45,
        plasmaCurrent: 1.2,
      },
      boundaryConditions: data.boundaryConditions || [],
      sourceTerms: data.sourceTerms || [],
    };

    const res = await fetch('/api/simulations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSimData),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || '创建模拟失败');
    }

    const newSimulation: Simulation = await res.json();
    return newSimulation;
  },

  updateSimulation: (id, updates) => {
    set((state) => ({
      simulations: state.simulations.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
      currentSimulation:
        state.currentSimulation?.id === id
          ? { ...state.currentSimulation, ...updates }
          : state.currentSimulation,
    }));
  },

  deleteSimulation: async (id) => {
    await fetch(`/api/simulations/${id}`, { method: 'DELETE' });
    set((state) => ({
      simulations: state.simulations.filter((s) => s.id !== id),
      currentSimulation: state.currentSimulation?.id === id ? null : state.currentSimulation,
    }));
  },

  startSimulation: async (id) => {
    get().updateSimulationStatus(id, 'PARAM_VALIDATION', '开始参数校验');
    get().updateSimulation(id, { progress: 5 });
  },

  pauseSimulation: async (id) => {
    await fetch(`/api/simulations/${id}/pause`, { method: 'POST' });
  },

  resumeSimulation: async (id) => {
    await fetch(`/api/simulations/${id}/resume`, { method: 'POST' });
  },

  updateSimulationStatus: (id, status, message = '') => {
    const now = new Date().toISOString();
    set((state) => ({
      simulations: state.simulations.map((s) => {
        if (s.id !== id) return s;
        return {
          ...s,
          status,
          statusLog: [...s.statusLog, { status, timestamp: now, message }],
          computeLog: [...s.computeLog, `[${now}] ${STATUS_FLOW.indexOf(status) * 20}% ${message || status}`],
        };
      }),
      currentSimulation:
        state.currentSimulation?.id === id
          ? {
              ...state.currentSimulation,
              status,
              statusLog: [
                ...state.currentSimulation.statusLog,
                { status, timestamp: now, message },
              ],
              computeLog: [
                ...state.currentSimulation.computeLog,
                `[${now}] ${message || status}`,
              ],
            }
          : state.currentSimulation,
    }));
  },

  updateProgress: (id, progress) => {
    set((state) => ({
      simulations: state.simulations.map((s) =>
        s.id === id ? { ...s, progress: Math.min(100, Math.max(0, progress)) } : s
      ),
      currentSimulation:
        state.currentSimulation?.id === id
          ? { ...state.currentSimulation, progress: Math.min(100, Math.max(0, progress)) }
          : state.currentSimulation,
    }));
  },

  updateGrowthRate: (id, rate) => {
    set((state) => ({
      simulations: state.simulations.map((s) =>
        s.id === id ? { ...s, instabilityGrowthRate: rate } : s
      ),
      currentSimulation:
        state.currentSimulation?.id === id
          ? { ...state.currentSimulation, instabilityGrowthRate: rate }
          : state.currentSimulation,
    }));
  },

  addTimeSeriesData: (id, data) => {
    set((state) => ({
      simulations: state.simulations.map((s) => {
        if (s.id !== id || !s.result) return s;
        return {
          ...s,
          result: {
            ...s.result,
            timeSeriesData: [...s.result.timeSeriesData, data],
          },
        };
      }),
      currentSimulation:
        state.currentSimulation?.id === id && state.currentSimulation.result
          ? {
              ...state.currentSimulation,
              result: {
                ...state.currentSimulation.result,
                timeSeriesData: [...state.currentSimulation.result.timeSeriesData, data],
              },
            }
          : state.currentSimulation,
    }));
  },

  adjustTimeStep: (id, newStep) => {
    const now = new Date().toISOString();
    const oldStep = get().simulations.find((s) => s.id === id)?.timeStep;
    set((state) => ({
      simulations: state.simulations.map((s) => {
        if (s.id !== id) return s;
        return {
          ...s,
          timeStep: newStep,
          computeLog: [...s.computeLog, `[${now}] 时间步长调整: ${oldStep} -> ${newStep}`],
        };
      }),
    }));
  },

  switchMode: (id, mode) => {
    const now = new Date().toISOString();
    const oldMode = get().simulations.find((s) => s.id === id)?.mode;
    set((state) => ({
      simulations: state.simulations.map((s) => {
        if (s.id !== id) return s;
        return {
          ...s,
          mode,
          computeLog: [...s.computeLog, `[${now}] 模拟模式切换: ${oldMode} -> ${mode}`],
        };
      }),
    }));
    get().addNotification({
      type: 'INSTABILITY_ALERT',
      title: '模拟模式自动切换',
      message: `由于不稳定性过高，模拟模式已切换为 ${mode}`,
      simulationId: id,
      recipients: ['user-1'],
    });
  },

  incrementConvergenceCount: (id) => {
    const sim = get().simulations.find((s) => s.id === id);
    const newCount = (sim?.convergenceCount || 0) + 1;

    set((state) => ({
      simulations: state.simulations.map((s) =>
        s.id === id ? { ...s, convergenceCount: newCount } : s
      ),
    }));

    if (newCount >= 3) {
      get().pauseSimulation(id);
      get().addNotification({
        type: 'CONVERGENCE_ISSUE',
        title: '模拟自动暂停 - 收敛问题',
        message: `连续 ${newCount} 次不收敛，模拟已自动暂停。请检查参数设置或调整边界条件。`,
        simulationId: id,
        recipients: ['user-1'],
      });
    }
  },

  resetConvergenceCount: (id) => {
    set((state) => ({
      simulations: state.simulations.map((s) =>
        s.id === id ? { ...s, convergenceCount: 0 } : s
      ),
    }));
  },

  setSimulationResult: (id, result) => {
    if (!result) return;

    const targets = result.performanceTargets;
    const underperforming =
      result.confinementTime < targets.targetConfinementTime ||
      result.fusionPower < targets.targetFusionPower ||
      result.betaValue < targets.targetBetaValue ||
      result.stabilityMargin < targets.targetStabilityMargin;

    set((state) => ({
      simulations: state.simulations.map((s) =>
        s.id === id ? { ...s, result, progress: 100 } : s
      ),
      currentSimulation:
        state.currentSimulation?.id === id
          ? { ...state.currentSimulation, result, progress: 100 }
          : state.currentSimulation,
    }));

    get().addNotification({
      type: 'SIMULATION_COMPLETE',
      title: '模拟计算完成',
      message: `模拟任务 ${get().simulations.find((s) => s.id === id)?.name} 计算完成`,
      simulationId: id,
      recipients: ['user-1'],
    });

    if (underperforming) {
      const suggestions = generateOptimizationSuggestions(result, targets);
      suggestions.forEach((suggestion) => {
        get().addNotification({
          type: 'PERFORMANCE_ALERT',
          title: `${suggestion.priority === 'HIGH' ? '【高优先级】' : ''}性能优化建议: ${suggestion.title}`,
          message: suggestion.description,
          simulationId: id,
          recipients: ['user-1'],
        });
      });
    }
  },

  addNotification: (notification) => {
    const now = new Date().toISOString();
    const newNotification: Notification = {
      ...notification,
      id: uuidv4(),
      createdAt: now,
      read: false,
    };
    set((state) => ({
      notifications: [newNotification, ...state.notifications],
    }));
  },

  markNotificationRead: async (id) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
  },

  markAllNotificationsRead: async () => {
    await fetch('/api/notifications/read-all', { method: 'POST' });
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    }));
  },

  compareSimulations: async (ids) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulationIds: ids }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '对比分析失败');
      }

      const data = await res.json();
      set({
        comparisonResult: {
          ...data,
          parameters: ['confinementTime', 'fusionPower', 'betaValue', 'stabilityMargin', 'energyConfinement'],
          comparisonTime: new Date().toISOString(),
        },
      });

      if (data.underperformingIds?.length > 0) {
        get().addNotification({
          type: 'SUGGESTION',
          title: '多工况对比分析完成',
          message: `检测到 ${data.underperformingIds.length} 个工况性能低于目标，已生成 ${data.suggestions.length} 条优化建议`,
          recipients: ['user-1'],
        });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '对比分析失败' });
    } finally {
      set({ isLoading: false });
    }
  },

  clearComparison: () => {
    set({ comparisonResult: null });
  },

  getSimulationsByStatus: (status) => {
    return get().simulations.filter((s) => s.status === status);
  },

  getUnreadNotificationCount: () => {
    return get().notifications.filter((n) => !n.read).length;
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));

function generateOptimizationSuggestions(
  result: Simulation['result'],
  targets: Simulation['result']['performanceTargets']
): OptimizationSuggestion[] {
  if (!result) return [];

  const suggestions: OptimizationSuggestion[] = [];

  if (result.confinementTime < targets.targetConfinementTime) {
    suggestions.push({
      id: uuidv4(),
      type: 'PARAMETER',
      priority: 'HIGH',
      title: '提升约束时间',
      description: `当前约束时间 ${result.confinementTime.toFixed(4)}s 低于目标 ${targets.targetConfinementTime}s，建议增加磁场强度或优化等离子体形貌`,
      expectedImprovement: '约束时间提升 20-30%',
      parameterAffected: 'magneticField',
      suggestedValue: 6.0,
    });
  }

  if (result.fusionPower < targets.targetFusionPower) {
    suggestions.push({
      id: uuidv4(),
      type: 'SOURCE',
      priority: 'HIGH',
      title: '提升聚变功率',
      description: `当前聚变功率 ${result.fusionPower.toFixed(2)}MW 低于目标 ${targets.targetFusionPower}MW，建议增加加热功率或提高核心温度`,
      expectedImprovement: '聚变功率提升 25-35%',
      parameterAffected: 'heatingPower',
      suggestedValue: 50.0,
    });
  }

  if (result.betaValue < targets.targetBetaValue) {
    suggestions.push({
      id: uuidv4(),
      type: 'PARAMETER',
      priority: 'MEDIUM',
      title: '提高β值',
      description: `当前β值 ${result.betaValue.toFixed(2)}% 低于目标 ${targets.targetBetaValue}%，建议提高等离子体压强`,
      expectedImprovement: 'β值提升 10-15%',
      parameterAffected: 'plasmaPressure',
      suggestedValue: 8.5,
    });
  }

  if (result.stabilityMargin < targets.targetStabilityMargin) {
    suggestions.push({
      id: uuidv4(),
      type: 'BOUNDARY',
      priority: 'MEDIUM',
      title: '提升稳定性',
      description: `当前稳定裕度 ${result.stabilityMargin.toFixed(2)} 低于目标 ${targets.targetStabilityMargin}，建议优化边界条件或添加反馈控制系统`,
      expectedImprovement: '稳定裕度提升 15-20%',
      parameterAffected: 'feedbackGain',
      suggestedValue: 1.5,
    });
  }

  return suggestions;
}
