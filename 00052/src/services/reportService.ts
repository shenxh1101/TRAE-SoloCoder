import { api } from './api';
import type { DailyReport } from '../types';

export interface ReportQueryParams {
  startDate?: string;
  endDate?: string;
  date?: string;
}

export async function getDailyReport(params?: ReportQueryParams): Promise<DailyReport> {
  return await api.get<DailyReport>('/reports/daily', params);
}

export async function exportDailyReport(params?: ReportQueryParams): Promise<Blob> {
  return await api.get<Blob>('/reports/daily/export', params);
}
