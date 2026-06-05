import { get, post } from './api';
import type {
  Report
} from '../types';
import type { ApiResponse } from './api';

export type ReportTemplate = 'standard' | 'detailed' | 'brief';

export interface GenerateReportResponse {
  reportId: string;
}

export interface ReportListResponse {
  reports: Report[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ReportStats {
  total: number;
  thisMonth: number;
  thisWeek: number;
  totalDownloads: number;
  totalStorageBytes: number;
  totalStorageGB: string;
}

export const reportApi = {
  async generateReport(
    taskId: string,
    templateType: ReportTemplate = 'standard'
  ): Promise<ApiResponse<GenerateReportResponse>> {
    return post<GenerateReportResponse>(`/reports/generate/${taskId}`, { templateType });
  },

  async downloadReport(reportId: string): Promise<Blob> {
    const token = localStorage.getItem('token');
    
    const response = await fetch(
      `http://localhost:3001/api/reports/${reportId}/download`,
      {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to download report: ${response.statusText}`);
    }

    return response.blob();
  },

  async getReports(params?: {
    page?: number;
    pageSize?: number;
    templateType?: ReportTemplate;
  }): Promise<ApiResponse<ReportListResponse>> {
    return get<ReportListResponse>('/reports', params as Record<string, unknown>);
  },

  async getStats(): Promise<ApiResponse<ReportStats>> {
    return get<ReportStats>('/reports/stats');
  }
};

export default reportApi;
