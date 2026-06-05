import { get, post } from './api';
import type {
  Alert,
  AlertLevel,
  AlertStatus
} from '../types';
import type { ApiResponse } from './api';

export interface AlertListResponse {
  alerts: Alert[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AlertReviewRequest {
  status: 'resolved' | 'dismissed';
  comment?: string;
}

export interface AlertStatsResponse {
  totalAlerts: number;
  pendingCount: number;
  resolvedCount: number;
  dismissedCount: number;
  byLevel: Record<AlertLevel, number>;
  avgResponseTimeSec: number;
}

export const alertApi = {
  async getAlerts(params?: {
    level?: AlertLevel;
    status?: AlertStatus;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<AlertListResponse>> {
    return get<AlertListResponse>('/alerts', params as Record<string, unknown>);
  },

  async reviewAlert(
    alertId: string,
    data: AlertReviewRequest
  ): Promise<ApiResponse<void>> {
    return post<void>(`/alerts/${alertId}/review`, data);
  },

  async getAlertStats(): Promise<ApiResponse<AlertStatsResponse>> {
    return get<AlertStatsResponse>('/alerts/stats');
  }
};

export default alertApi;
