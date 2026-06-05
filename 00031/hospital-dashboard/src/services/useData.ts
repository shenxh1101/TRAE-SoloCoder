import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  Department,
  Doctor,
  Schedule,
  Registration,
  WaitingRecord,
  DepartmentStats,
  DoctorStats,
  Alert,
  WeeklyReport,
  TimeRange,
} from '../types';
import { api } from './api';
import { websocketService } from './websocket';

interface UseDataOptions<T> {
  autoFetch?: boolean;
  initialData?: T | null;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  refetchInterval?: number;
}

interface UseDataResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  setData: (data: T | ((prev: T | null) => T)) => void;
}

function useData<T>(
  fetchFn: () => Promise<T>,
  options: UseDataOptions<T> = {}
): UseDataResult<T> {
  const { autoFetch = true, initialData = null, onSuccess, onError, refetchInterval } = options;
  
  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<Error | null>(null);
  const refetchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFn();
      if (isMountedRef.current) {
        setData(result);
        onSuccess?.(result);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (isMountedRef.current) {
        setError(error);
        onError?.(error);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchFn, onSuccess, onError]);

  useEffect(() => {
    isMountedRef.current = true;
    
    if (autoFetch) {
      fetchData();
    }

    if (refetchInterval) {
      refetchIntervalRef.current = setInterval(fetchData, refetchInterval);
    }

    return () => {
      isMountedRef.current = false;
      if (refetchIntervalRef.current) {
        clearInterval(refetchIntervalRef.current);
      }
    };
  }, [autoFetch, fetchData, refetchInterval]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    setData: (newData: T | ((prev: T | null) => T)) => {
      if (typeof newData === 'function') {
        setData(prev => (newData as (prev: T | null) => T)(prev));
      } else {
        setData(newData);
      }
    },
  };
}

export function useDepartments(options?: UseDataOptions<Department[]>) {
  return useData(() => api.department.getAll(), options);
}

export function useDepartmentStats(
  departmentId?: string,
  timeRange?: TimeRange,
  options?: UseDataOptions<DepartmentStats[]>
) {
  return useData(
    () => api.department.getStats(departmentId, timeRange),
    options
  );
}

export function useWaitingRecords(
  departmentId?: string,
  hours?: number,
  options?: UseDataOptions<WaitingRecord[]>
) {
  return useData(
    () => api.department.getWaitingRecords(departmentId, { hours }),
    options
  );
}

export function useDoctors(departmentId?: string, options?: UseDataOptions<Doctor[]>) {
  return useData(
    () => api.doctor.getAll(departmentId),
    options
  );
}

export function useDoctorStats(
  doctorId?: string,
  departmentId?: string,
  options?: UseDataOptions<DoctorStats[]>
) {
  return useData(
    () => api.doctor.getStats(doctorId, departmentId),
    options
  );
}

export function useSchedules(
  params?: {
    departmentId?: string;
    doctorId?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
  },
  options?: UseDataOptions<Schedule[]>
) {
  return useData(
    () => api.schedule.getAll(params),
    options
  );
}

export function useRegistrations(
  params?: {
    departmentId?: string;
    doctorId?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  },
  options?: UseDataOptions<{
    data: Registration[];
    total: number;
    page: number;
    pageSize: number;
  }>
) {
  return useData(
    () => api.registration.getAll(params),
    options
  );
}

export function useDailyStats(date?: string, options?: UseDataOptions<{
  totalRegistrations: number;
  completedVisits: number;
  cancelledVisits: number;
  averageWaitingTime: number;
  maxWaitingTime: number;
  averageVisitDuration: number;
}>) {
  return useData(
    () => api.registration.getDailyStats(date),
    options
  );
}

export function useAlerts(
  params?: {
    resolved?: boolean;
    type?: string;
    level?: string;
    departmentId?: string;
  },
  options?: UseDataOptions<Alert[]> & { enableWebSocket?: boolean }
) {
  const { enableWebSocket = true, ...restOptions } = options || {};
  
  const result = useData(
    () => api.alert.getAll(params),
    restOptions
  );

  useEffect(() => {
    if (!enableWebSocket) return;

    const cleanup = websocketService.onAlert((newAlert) => {
      result.setData(prev => {
        if (!prev) return [newAlert];
        const exists = prev.some(a => a.id === newAlert.id);
        if (exists) {
          return prev.map(a => a.id === newAlert.id ? newAlert : a);
        }
        return [newAlert, ...prev];
      });
    });

    return cleanup;
  }, [enableWebSocket, result.setData]);

  return result;
}

export function useUnresolvedAlertCount(options?: UseDataOptions<number>) {
  return useData(() => api.alert.getUnresolvedCount(), options);
}

export function useWeeklyReport(
  weekStart?: string,
  weekEnd?: string,
  options?: UseDataOptions<WeeklyReport>
) {
  return useData(
    () => api.report.getWeeklyReport(weekStart, weekEnd),
    options
  );
}

export function useScheduleAnalysis(
  date?: string,
  options?: UseDataOptions<{
    schedule: Schedule;
    actualPatients: number;
    expectedPatients: number;
    completionRate: number;
    variance: number;
    isAbnormal: boolean;
  }[]>
) {
  return useData(
    () => api.schedule.getAnalysis(date),
    options
  );
}

export function useRealTimeWaitingRecords(
  departmentId?: string,
  hours?: number
) {
  const { data, loading, error, refetch, setData } = useWaitingRecords(departmentId, hours);

  useEffect(() => {
    const cleanup = websocketService.onWaitingRecord((record) => {
      if (!departmentId || record.departmentId === departmentId) {
        setData(prev => {
          if (!prev) return [record];
          const filtered = prev.filter(r => r.departmentId !== record.departmentId);
          return [...filtered, record];
        });
      }
    });

    return cleanup;
  }, [departmentId, setData]);

  return { data, loading, error, refetch };
}

export function useWebSocketConnection() {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');

  useEffect(() => {
    const cleanup = websocketService.onConnectionStatus(setStatus);
    websocketService.connect().catch(err => {
      console.error('Failed to connect WebSocket:', err);
    });

    return () => {
      cleanup();
      websocketService.disconnect();
    };
  }, []);

  const connect = useCallback(() => websocketService.connect(), []);
  const disconnect = useCallback(() => websocketService.disconnect(), []);

  return {
    status,
    connect,
    disconnect,
    isConnected: status === 'connected',
  };
}
