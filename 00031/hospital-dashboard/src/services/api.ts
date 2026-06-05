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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

interface PaginationParams {
  page?: number;
  pageSize?: number;
}

interface DateRangeParams {
  startDate?: string;
  endDate?: string;
}

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const result = await response.json() as ApiResponse<T>;
  if (result.code !== 200) {
    throw new Error(result.message || 'API error');
  }
  return result.data;
};

const request = async <T>(
  url: string,
  options: RequestInit = {}
): Promise<T> => {
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  });

  return handleResponse<T>(response);
};

export const departmentApi = {
  getAll: (): Promise<Department[]> =>
    request<Department[]>('/departments'),

  getById: (id: string): Promise<Department> =>
    request<Department>(`/departments/${id}`),

  getStats: (
    departmentId?: string,
    timeRange?: TimeRange,
    params?: DateRangeParams
  ): Promise<DepartmentStats[]> => {
    const queryParams = new URLSearchParams();
    if (departmentId) queryParams.append('departmentId', departmentId);
    if (timeRange) queryParams.append('timeRange', timeRange);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    
    const queryString = queryParams.toString();
    return request<DepartmentStats[]>(`/department-stats${queryString ? `?${queryString}` : ''}`);
  },

  getWaitingRecords: (
    departmentId?: string,
    params?: { hours?: number }
  ): Promise<WaitingRecord[]> => {
    const queryParams = new URLSearchParams();
    if (departmentId) queryParams.append('departmentId', departmentId);
    if (params?.hours) queryParams.append('hours', String(params.hours));
    
    const queryString = queryParams.toString();
    return request<WaitingRecord[]>(`/waiting-records${queryString ? `?${queryString}` : ''}`);
  },
};

export const doctorApi = {
  getAll: (departmentId?: string): Promise<Doctor[]> => {
    const queryParams = new URLSearchParams();
    if (departmentId) queryParams.append('departmentId', departmentId);
    
    const queryString = queryParams.toString();
    return request<Doctor[]>(`/doctors${queryString ? `?${queryString}` : ''}`);
  },

  getById: (id: string): Promise<Doctor> =>
    request<Doctor>(`/doctors/${id}`),

  getStats: (
    doctorId?: string,
    departmentId?: string,
    params?: DateRangeParams
  ): Promise<DoctorStats[]> => {
    const queryParams = new URLSearchParams();
    if (doctorId) queryParams.append('doctorId', doctorId);
    if (departmentId) queryParams.append('departmentId', departmentId);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    
    const queryString = queryParams.toString();
    return request<DoctorStats[]>(`/doctor-stats${queryString ? `?${queryString}` : ''}`);
  },
};

export const scheduleApi = {
  getAll: (params?: {
    departmentId?: string;
    doctorId?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Schedule[]> => {
    const queryParams = new URLSearchParams();
    if (params?.departmentId) queryParams.append('departmentId', params.departmentId);
    if (params?.doctorId) queryParams.append('doctorId', params.doctorId);
    if (params?.date) queryParams.append('date', params.date);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    
    const queryString = queryParams.toString();
    return request<Schedule[]>(`/schedules${queryString ? `?${queryString}` : ''}`);
  },

  create: (data: Omit<Schedule, 'id'>[]): Promise<Schedule[]> =>
    request<Schedule[]>('/schedules', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  uploadExcel: (file: File): Promise<{
    success: boolean;
    data: Schedule[];
    errors: string[];
    warnings: string[];
  }> => {
    const formData = new FormData();
    formData.append('file', file);

    return request<{
      success: boolean;
      data: Schedule[];
      errors: string[];
      warnings: string[];
    }>('/schedules/upload', {
      method: 'POST',
      body: formData,
      headers: {},
    });
  },

  getAnalysis: (date?: string): Promise<{
    schedule: Schedule;
    actualPatients: number;
    expectedPatients: number;
    completionRate: number;
    variance: number;
    isAbnormal: boolean;
  }[]> => {
    const queryParams = new URLSearchParams();
    if (date) queryParams.append('date', date);
    
    const queryString = queryParams.toString();
    return request<{
      schedule: Schedule;
      actualPatients: number;
      expectedPatients: number;
      completionRate: number;
      variance: number;
      isAbnormal: boolean;
    }[]>(`/schedules/analysis${queryString ? `?${queryString}` : ''}`);
  },
};

export const registrationApi = {
  getAll: (params?: {
    departmentId?: string;
    doctorId?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{
    data: Registration[];
    total: number;
    page: number;
    pageSize: number;
  }> => {
    const queryParams = new URLSearchParams();
    if (params?.departmentId) queryParams.append('departmentId', params.departmentId);
    if (params?.doctorId) queryParams.append('doctorId', params.doctorId);
    if (params?.date) queryParams.append('date', params.date);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.pageSize) queryParams.append('pageSize', String(params.pageSize));
    
    const queryString = queryParams.toString();
    return request<{
      data: Registration[];
      total: number;
      page: number;
      pageSize: number;
    }>(`/registrations${queryString ? `?${queryString}` : ''}`);
  },

  getById: (id: string): Promise<Registration> =>
    request<Registration>(`/registrations/${id}`),

  getDailyStats: (date?: string): Promise<{
    totalRegistrations: number;
    completedVisits: number;
    cancelledVisits: number;
    averageWaitingTime: number;
    maxWaitingTime: number;
    averageVisitDuration: number;
  }> => {
    const queryParams = new URLSearchParams();
    if (date) queryParams.append('date', date);
    
    const queryString = queryParams.toString();
    return request<{
      totalRegistrations: number;
      completedVisits: number;
      cancelledVisits: number;
      averageWaitingTime: number;
      maxWaitingTime: number;
      averageVisitDuration: number;
    }>(`/registrations/daily-stats${queryString ? `?${queryString}` : ''}`);
  },
};

export const alertApi = {
  getAll: (params?: {
    resolved?: boolean;
    type?: string;
    level?: string;
    departmentId?: string;
  }): Promise<Alert[]> => {
    const queryParams = new URLSearchParams();
    if (params?.resolved !== undefined) queryParams.append('resolved', String(params.resolved));
    if (params?.type) queryParams.append('type', params.type);
    if (params?.level) queryParams.append('level', params.level);
    if (params?.departmentId) queryParams.append('departmentId', params.departmentId);
    
    const queryString = queryParams.toString();
    return request<Alert[]>(`/alerts${queryString ? `?${queryString}` : ''}`);
  },

  resolve: (id: string): Promise<Alert> =>
    request<Alert>(`/alerts/${id}/resolve`, {
      method: 'PUT',
    }),

  create: (data: Omit<Alert, 'id' | 'timestamp' | 'resolved'>): Promise<Alert> =>
    request<Alert>('/alerts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getUnresolvedCount: (): Promise<number> =>
    request<number>('/alerts/unresolved-count'),
};

export const reportApi = {
  getWeeklyReport: (weekStart?: string, weekEnd?: string): Promise<WeeklyReport> => {
    const queryParams = new URLSearchParams();
    if (weekStart) queryParams.append('weekStart', weekStart);
    if (weekEnd) queryParams.append('weekEnd', weekEnd);
    
    const queryString = queryParams.toString();
    return request<WeeklyReport>(`/reports/weekly${queryString ? `?${queryString}` : ''}`);
  },

  generateWeeklyReport: (weekStart?: string, weekEnd?: string): Promise<WeeklyReport> => {
    const queryParams = new URLSearchParams();
    if (weekStart) queryParams.append('weekStart', weekStart);
    if (weekEnd) queryParams.append('weekEnd', weekEnd);
    
    const queryString = queryParams.toString();
    return request<WeeklyReport>(`/reports/weekly/generate${queryString ? `?${queryString}` : ''}`, {
      method: 'POST',
    });
  },

  downloadWeeklyReport: (
    weekStart?: string,
    weekEnd?: string,
    format: 'pdf' | 'excel' | 'txt' = 'txt'
  ): Promise<Blob> => {
    const queryParams = new URLSearchParams();
    if (weekStart) queryParams.append('weekStart', weekStart);
    if (weekEnd) queryParams.append('weekEnd', weekEnd);
    queryParams.append('format', format);
    
    const queryString = queryParams.toString();
    return fetch(`${API_BASE_URL}/reports/weekly/download${queryString ? `?${queryString}` : ''}`).then(response => {
      if (!response.ok) {
        throw new Error('Download failed');
      }
      return response.blob();
    });
  },
};

export const messageApi = {
  sendNotification: (data: {
    alertId: string;
    recipients: string[];
    channels: ('sms' | 'email' | 'app')[];
  }): Promise<{ success: boolean; sentCount: number }> =>
    request<{ success: boolean; sentCount: number }>('/messages/send-notification', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getHistory: (params?: PaginationParams): Promise<{
    data: {
      id: string;
      alertId: string;
      recipient: string;
      channel: string;
      content: string;
      sentAt: string;
      status: 'sent' | 'failed' | 'pending';
    }[];
    total: number;
  }> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.pageSize) queryParams.append('pageSize', String(params.pageSize));
    
    const queryString = queryParams.toString();
    return request<{
      data: {
        id: string;
        alertId: string;
        recipient: string;
        channel: string;
        content: string;
        sentAt: string;
        status: 'sent' | 'failed' | 'pending';
      }[];
      total: number;
    }>(`/messages/history${queryString ? `?${queryString}` : ''}`);
  },
};

export const api = {
  department: departmentApi,
  doctor: doctorApi,
  schedule: scheduleApi,
  registration: registrationApi,
  alert: alertApi,
  report: reportApi,
  message: messageApi,
};

export default api;
