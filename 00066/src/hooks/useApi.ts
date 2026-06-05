import { useState, useEffect, useCallback, useRef } from 'react';
import { taskApi } from '../services/taskApi';
import { monitoringApi } from '../services/monitoringApi';
import { alertApi } from '../services/alertApi';
import type {
  Task,
  TaskStatus,
  Alert,
  RealtimeMetrics,
  DashboardStats
} from '../types';

interface UseTaskApiReturn {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  total: number;
  currentPage: number;
  fetchTasks: (params?: { status?: TaskStatus; page?: number; pageSize?: number }) => Promise<void>;
  createTask: (data: Parameters<typeof taskApi.createTask>[0]) => Promise<void>;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
}

export function useTaskApi(): UseTaskApiReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchTasks = useCallback(async (params?: {
    status?: TaskStatus;
    page?: number;
    pageSize?: number;
  }) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await taskApi.getTasks(params);
      setTasks(response.data.tasks);
      setTotal(response.data.total);
      setCurrentPage(response.data.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取任务列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const createTask = useCallback(async (data: Parameters<typeof taskApi.createTask>[0]) => {
    setLoading(true);
    setError(null);
    
    try {
      await taskApi.createTask(data);
      await fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建任务失败');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchTasks]);

  const updateTaskStatus = useCallback(async (
    taskId: string,
    status: TaskStatus
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      await taskApi.updateTaskStatus(taskId, status);
      await fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新任务状态失败');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchTasks]);

  return {
    tasks,
    loading,
    error,
    total,
    currentPage,
    fetchTasks,
    createTask,
    updateTaskStatus,
  };
}

interface UseMonitoringReturn {
  metrics: RealtimeMetrics | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  error: string | null;
}

export function useMonitoring(
  taskId: string | null,
  onMessage?: (data: unknown) => void
): UseMonitoringReturn {
  const [metrics, setMetrics] = useState<RealtimeMetrics | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!taskId) return;

    let ws: WebSocket | null = null;

    const handleConnect = () => {
      setIsConnected(true);
      setError(null);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'subscribe', taskId }));
      }
    };

    const handleMessage = (data: unknown) => {
      if (typeof data === 'object' && data !== null) {
        const msg = data as Record<string, unknown>;
        
        if (msg.type === 'metrics_update' && msg.data) {
          const metrics = msg.data as RealtimeMetrics;
          setMetrics(metrics);
        } else if ('uniformityScore' in data) {
          setMetrics(data as RealtimeMetrics);
        }
      }
      
      if (onMessageRef.current) {
        onMessageRef.current(data);
      }
    };

    const handleError = () => {
      setError('监控连接错误');
    };

    const handleClose = () => {
      setIsConnected(false);
    };

    try {
      ws = monitoringApi.connectWebSocket(taskId, handleMessage);
      
      ws.addEventListener('open', handleConnect);
      ws.addEventListener('error', handleError);
      ws.addEventListener('close', handleClose);
    } catch (err) {
      setError(err instanceof Error ? err.message : '连接监控服务失败');
    }

    return () => {
      if (ws) {
        ws.removeEventListener('open', handleConnect);
        ws.removeEventListener('error', handleError);
        ws.removeEventListener('close', handleClose);
        
        monitoringApi.disconnectWebSocket(taskId);
      }
    };
  }, [taskId]);

  const connect = useCallback(() => {
    if (taskId) {
      monitoringApi.connectWebSocket(taskId, (data) => {
        if (typeof data === 'object' && data !== null && 'uniformityScore' in data) {
          setMetrics(data as RealtimeMetrics);
        }
      });
    }
  }, [taskId]);

  const disconnect = useCallback(() => {
    if (taskId) {
      monitoringApi.disconnectWebSocket(taskId);
      setIsConnected(false);
    }
  }, [taskId]);

  return {
    metrics,
    isConnected,
    connect,
    disconnect,
    error,
  };
}

interface UseAlertsReturn {
  alerts: Alert[];
  stats: {
    totalAlerts: number;
    pendingCount: number;
    resolvedCount: number;
    dismissedCount: number;
    byLevel: Record<string, number>;
    avgResponseTimeSec: number;
  } | null;
  loading: boolean;
  error: string | null;
  total: number;
  fetchAlerts: (params?: {
    level?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) => Promise<void>;
  reviewAlert: (alertId: string, data: { status: 'resolved' | 'dismissed'; comment?: string }) => Promise<void>;
  refreshStats: () => Promise<void>;
}

export function useAlerts(pollIntervalMs: number = 30000): UseAlertsReturn {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<UseAlertsReturn['stats']>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAlerts = useCallback(async (params?: {
    level?: Alert['alertLevel'];
    status?: Alert['status'];
    page?: number;
    pageSize?: number;
  }) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await alertApi.getAlerts(params);
      setAlerts(response.data.alerts);
      setTotal(response.data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取预警列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshStats = useCallback(async () => {
    try {
      const response = await alertApi.getAlertStats();
      setStats(response.data);
    } catch (err) {
      console.error('Failed to refresh alert stats:', err);
    }
  }, []);

  const reviewAlert = useCallback(async (
    alertId: string,
    data: { status: 'resolved' | 'dismissed'; comment?: string }
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      await alertApi.reviewAlert(alertId, data);
      await fetchAlerts();
      await refreshStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : '审核预警失败');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchAlerts, refreshStats]);

  useEffect(() => {
    fetchAlerts();
    refreshStats();

    if (pollIntervalMs > 0) {
      pollTimerRef.current = setInterval(() => {
        fetchAlerts();
        refreshStats();
      }, pollIntervalMs);
    }

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [fetchAlerts, refreshStats, pollIntervalMs]);

  return {
    alerts,
    stats,
    loading,
    error,
    total,
    fetchAlerts,
    reviewAlert,
    refreshStats,
  };
}
