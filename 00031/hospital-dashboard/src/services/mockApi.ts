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
import {
  departments as mockDepartments,
  doctors as mockDoctors,
  schedules as mockSchedules,
  registrations as mockRegistrations,
  departmentStats as mockDepartmentStats,
  doctorStats as mockDoctorStats,
  alerts as mockAlerts,
  waitingRecords as mockWaitingRecords,
} from '../data/mockData';
import {
  calculateWaitingTimeCompliance,
  calculatePatientChurnRate,
  calculateAvgPatientsPerDoctor,
  generateRecommendations,
} from '../utils/calculations';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

const mockResponse = <T>(data: T, delay = 300): Promise<T> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), delay);
  });
};

const wrapResponse = <T>(data: T): ApiResponse<T> => ({
  code: 200,
  message: 'success',
  data,
});

const getDateRange = (timeRange?: TimeRange) => {
  const days = timeRange === 'day' ? 1 : timeRange === 'week' ? 7 : 30;
  return days;
};

export const mockDepartmentApi = {
  getAll: (): Promise<ApiResponse<Department[]>> =>
    mockResponse(wrapResponse(mockDepartments)),

  getById: (id: string): Promise<ApiResponse<Department>> => {
    const dept = mockDepartments.find(d => d.id === id);
    if (!dept) {
      return mockResponse({ code: 404, message: 'Department not found', data: {} as Department });
    }
    return mockResponse(wrapResponse(dept));
  },

  getStats: (
    departmentId?: string,
    timeRange?: TimeRange,
    _params?: { startDate?: string; endDate?: string }
  ): Promise<ApiResponse<DepartmentStats[]>> => {
    const days = getDateRange(timeRange);
    let stats = [...mockDepartmentStats];
    
    if (departmentId) {
      stats = stats.filter(s => s.departmentId === departmentId);
    }
    
    stats = stats.slice(0, days * mockDepartments.length);
    
    return mockResponse(wrapResponse(stats));
  },

  getWaitingRecords: (
    departmentId?: string,
    params?: { hours?: number }
  ): Promise<ApiResponse<WaitingRecord[]>> => {
    let records = [...mockWaitingRecords];
    if (departmentId) {
      records = records.filter(r => r.departmentId === departmentId);
    }
    if (params?.hours) {
      const cutoff = new Date(Date.now() - params.hours * 60 * 60 * 1000);
      records = records.filter(r => new Date(r.timestamp) >= cutoff);
    }
    return mockResponse(wrapResponse(records));
  },
};

export const mockDoctorApi = {
  getAll: (departmentId?: string): Promise<ApiResponse<Doctor[]>> => {
    let doctors = [...mockDoctors];
    if (departmentId) {
      doctors = doctors.filter(d => d.departmentId === departmentId);
    }
    return mockResponse(wrapResponse(doctors));
  },

  getById: (id: string): Promise<ApiResponse<Doctor>> => {
    const doctor = mockDoctors.find(d => d.id === id);
    if (!doctor) {
      return mockResponse({ code: 404, message: 'Doctor not found', data: {} as Doctor });
    }
    return mockResponse(wrapResponse(doctor));
  },

  getStats: (
    doctorId?: string,
    departmentId?: string,
    _params?: { startDate?: string; endDate?: string }
  ): Promise<ApiResponse<DoctorStats[]>> => {
    let stats = [...mockDoctorStats];
    if (doctorId) {
      stats = stats.filter(s => s.doctorId === doctorId);
    }
    if (departmentId) {
      stats = stats.filter(s => s.departmentId === departmentId);
    }
    return mockResponse(wrapResponse(stats));
  },
};

export const mockScheduleApi = {
  getAll: (params?: {
    departmentId?: string;
    doctorId?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<Schedule[]>> => {
    let schedules = [...mockSchedules];
    if (params?.departmentId) {
      schedules = schedules.filter(s => s.departmentId === params.departmentId);
    }
    if (params?.doctorId) {
      schedules = schedules.filter(s => s.doctorId === params.doctorId);
    }
    if (params?.date) {
      schedules = schedules.filter(s => s.date === params.date);
    }
    if (params?.startDate) {
      schedules = schedules.filter(s => s.date >= params.startDate!);
    }
    if (params?.endDate) {
      schedules = schedules.filter(s => s.date <= params.endDate!);
    }
    return mockResponse(wrapResponse(schedules));
  },

  create: (data: Omit<Schedule, 'id'>[]): Promise<ApiResponse<Schedule[]>> => {
    const newSchedules: Schedule[] = data.map((item, index) => ({
      ...item,
      id: `sch-mock-${Date.now()}-${index}`,
    }));
    return mockResponse(wrapResponse(newSchedules));
  },

  uploadExcel: (file: File): Promise<ApiResponse<{
    success: boolean;
    data: Schedule[];
    errors: string[];
    warnings: string[];
  }>> => {
    console.log('[Mock] Uploading schedule file:', file.name);
    return mockResponse(wrapResponse({
      success: true,
      data: mockSchedules.slice(0, 10),
      errors: [],
      warnings: [],
    }));
  },

  getAnalysis: (date?: string): Promise<ApiResponse<{
    schedule: Schedule;
    actualPatients: number;
    expectedPatients: number;
    completionRate: number;
    variance: number;
    isAbnormal: boolean;
  }[]>> => {
    const analysisDate = date || new Date().toISOString().split('T')[0];
    const todaySchedules = mockSchedules.filter(s => s.date === analysisDate);
    
    const analysis = todaySchedules.slice(0, 8).map(schedule => {
      const expected = schedule.expectedPatients;
      const actual = Math.floor(expected * (0.4 + Math.random() * 0.8));
      const completionRate = expected > 0 ? Math.round((actual / expected) * 100) : 0;
      const variance = expected > 0 ? ((actual - expected) / expected) * 100 : 0;
      const isAbnormal = actual < expected * 0.5 && actual > 0;

      return {
        schedule,
        actualPatients: actual,
        expectedPatients: expected,
        completionRate,
        variance: Math.round(variance * 10) / 10,
        isAbnormal,
      };
    });

    return mockResponse(wrapResponse(analysis));
  },
};

export const mockRegistrationApi = {
  getAll: (params?: {
    departmentId?: string;
    doctorId?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<{
    data: Registration[];
    total: number;
    page: number;
    pageSize: number;
  }>> => {
    let registrations = [...mockRegistrations];
    
    if (params?.departmentId) {
      registrations = registrations.filter(r => r.departmentId === params.departmentId);
    }
    if (params?.doctorId) {
      registrations = registrations.filter(r => r.doctorId === params.doctorId);
    }
    if (params?.date) {
      registrations = registrations.filter(r => r.registerTime.startsWith(params.date!));
    }
    if (params?.startDate) {
      registrations = registrations.filter(r => r.registerTime >= params.startDate!);
    }
    if (params?.endDate) {
      registrations = registrations.filter(r => r.registerTime <= params.endDate!);
    }
    if (params?.status) {
      registrations = registrations.filter(r => r.status === params.status);
    }

    const page = params?.page || 1;
    const pageSize = params?.pageSize || 50;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedData = registrations.slice(start, end);

    return mockResponse(wrapResponse({
      data: paginatedData,
      total: registrations.length,
      page,
      pageSize,
    }));
  },

  getById: (id: string): Promise<ApiResponse<Registration>> => {
    const registration = mockRegistrations.find(r => r.id === id);
    if (!registration) {
      return mockResponse({ code: 404, message: 'Registration not found', data: {} as Registration });
    }
    return mockResponse(wrapResponse(registration));
  },

  getDailyStats: (date?: string): Promise<ApiResponse<{
    totalRegistrations: number;
    completedVisits: number;
    cancelledVisits: number;
    averageWaitingTime: number;
    maxWaitingTime: number;
    averageVisitDuration: number;
  }>> => {
    const statsDate = date || new Date().toISOString().split('T')[0];
    const todayRegistrations = mockRegistrations.filter(r => r.registerTime.startsWith(statsDate));
    
    const total = todayRegistrations.length;
    const completed = todayRegistrations.filter(r => r.status === 'completed').length;
    const cancelled = todayRegistrations.filter(r => r.status === 'cancelled').length;
    const avgWait = Math.round(todayRegistrations.reduce((acc, r) => {
      if (r.actualStartTime && r.registerTime) {
        const wait = (new Date(r.actualStartTime).getTime() - new Date(r.registerTime).getTime()) / 60000;
        return acc + Math.max(0, wait);
      }
      return acc + 20;
    }, 0) / Math.max(1, todayRegistrations.length));
    const avgVisit = Math.round(todayRegistrations.reduce((acc, r) => {
      if (r.actualEndTime && r.actualStartTime) {
        const duration = (new Date(r.actualEndTime).getTime() - new Date(r.actualStartTime).getTime()) / 60000;
        return acc + Math.max(0, duration);
      }
      return acc + 15;
    }, 0) / Math.max(1, todayRegistrations.filter(r => r.status === 'completed').length));

    return mockResponse(wrapResponse({
      totalRegistrations: total,
      completedVisits: completed,
      cancelledVisits: cancelled,
      averageWaitingTime: avgWait,
      maxWaitingTime: Math.round(avgWait * 1.8),
      averageVisitDuration: avgVisit,
    }));
  },
};

export const mockAlertApi = {
  getAll: (params?: {
    resolved?: boolean;
    type?: string;
    level?: string;
    departmentId?: string;
  }): Promise<ApiResponse<Alert[]>> => {
    let alerts = [...mockAlerts];
    
    if (params?.resolved !== undefined) {
      alerts = alerts.filter(a => a.resolved === params.resolved);
    }
    if (params?.type) {
      alerts = alerts.filter(a => a.type === params.type);
    }
    if (params?.level) {
      alerts = alerts.filter(a => a.level === params.level);
    }
    if (params?.departmentId) {
      alerts = alerts.filter(a => a.departmentId === params.departmentId);
    }

    return mockResponse(wrapResponse(alerts));
  },

  resolve: (id: string): Promise<ApiResponse<Alert>> => {
    const alertIndex = mockAlerts.findIndex(a => a.id === id);
    if (alertIndex === -1) {
      return mockResponse({ code: 404, message: 'Alert not found', data: {} as Alert });
    }
    mockAlerts[alertIndex] = { ...mockAlerts[alertIndex], resolved: true };
    return mockResponse(wrapResponse(mockAlerts[alertIndex]));
  },

  create: (data: Omit<Alert, 'id' | 'timestamp' | 'resolved'>): Promise<ApiResponse<Alert>> => {
    const newAlert: Alert = {
      ...data,
      id: `alert-mock-${Date.now()}`,
      timestamp: new Date().toISOString(),
      resolved: false,
    };
    mockAlerts.unshift(newAlert);
    return mockResponse(wrapResponse(newAlert));
  },

  getUnresolvedCount: (): Promise<ApiResponse<number>> => {
    const count = mockAlerts.filter(a => !a.resolved).length;
    return mockResponse(wrapResponse(count));
  },

  getById: (id: string): Promise<ApiResponse<Alert>> => {
    const alert = mockAlerts.find(a => a.id === id);
    if (!alert) {
      return mockResponse({ code: 404, message: 'Alert not found', data: {} as Alert });
    }
    return mockResponse(wrapResponse(alert));
  },
};

export const mockReportApi = {
  getWeeklyReport: (weekStart?: string, weekEnd?: string): Promise<ApiResponse<WeeklyReport>> => {
    const today = new Date();
    const end = weekEnd ? new Date(weekEnd) : new Date(today);
    end.setDate(end.getDate() - 1);
    const start = weekStart ? new Date(weekStart) : new Date(end);
    start.setDate(start.getDate() - 6);

    const weekStats = mockDepartmentStats.slice(0, 70);
    
    const report: WeeklyReport = {
      id: `report-${start.toISOString().split('T')[0]}`,
      weekStart: start.toISOString().split('T')[0],
      weekEnd: end.toISOString().split('T')[0],
      generatedAt: new Date().toISOString(),
      waitingTimeCompliance: calculateWaitingTimeCompliance(weekStats),
      avgPatientsPerDoctor: calculateAvgPatientsPerDoctor(mockDoctorStats),
      patientChurnRate: calculatePatientChurnRate(weekStats),
      departmentStats: mockDepartments.map(dept => {
        const deptStats = weekStats.filter(s => s.departmentId === dept.id);
        return {
          departmentId: dept.id,
          departmentName: dept.name,
          waitingTimeCompliance: calculateWaitingTimeCompliance(deptStats),
          avgPatientsPerDoctor: calculateAvgPatientsPerDoctor(mockDoctorStats, dept.id),
          saturation: Math.round(deptStats.reduce((acc, s) => acc + s.saturation, 0) / Math.max(1, deptStats.length)),
        };
      }),
      recommendations: generateRecommendations(weekStats, mockDoctorStats, mockDepartments),
    };

    return mockResponse(wrapResponse(report), 500);
  },

  generateWeeklyReport: (weekStart?: string, weekEnd?: string): Promise<ApiResponse<WeeklyReport>> => {
    return mockReportApi.getWeeklyReport(weekStart, weekEnd);
  },

  downloadWeeklyReport: (
    weekStart?: string,
    weekEnd?: string,
    _format: 'pdf' | 'excel' | 'txt' = 'txt'
  ): Promise<Blob> => {
    const today = new Date();
    const end = weekEnd ? new Date(weekEnd) : new Date(today);
    const start = weekStart ? new Date(weekStart) : new Date(end);
    start.setDate(start.getDate() - 6);

    const reportContent = `
医院门诊运营质量周报
=====================================
统计周期: ${start.toISOString().split('T')[0]} 至 ${end.toISOString().split('T')[0]}
生成时间: ${new Date().toLocaleString('zh-CN')}

一、核心指标
-------------------------------------
1. 候诊时间达标率: 78.5%
2. 医生人均接诊量: 22.3 人
3. 患者流失率: 4.8%

二、各科室详情
-------------------------------------
${mockDepartments.map(d => `
${d.name}:
  - 候诊时间达标率: ${Math.floor(Math.random() * 30 + 60)}%
  - 人均接诊量: ${Math.floor(Math.random() * 15 + 10)}人
  - 平均饱和度: ${Math.floor(Math.random() * 30) + 55}%
`).join('')}

三、资源调配建议
-------------------------------------
1. 急诊科候诊时间达标率较低，建议增加高峰时段出诊医生
2. 部分科室资源利用率偏低，建议优化排班策略
3. 建议引入智能预诊系统，缩短患者候诊时间

=====================================
系统自动生成，仅供内部参考
    `.trim();

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    return mockResponse(blob, 300);
  },
};

export const mockMessageApi = {
  sendNotification: (data: {
    alertId: string;
    recipients: string[];
    channels: ('sms' | 'email' | 'app')[];
  }): Promise<ApiResponse<{ success: boolean; sentCount: number }>> => {
    console.log('[Mock] Sending notification:', data);
    return mockResponse(wrapResponse({
      success: true,
      sentCount: data.recipients.length,
    }));
  },

  getHistory: (_params?: { page?: number; pageSize?: number }): Promise<ApiResponse<{
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
  }>> => {
    const history = mockAlerts.slice(0, 5).map(alert => ({
      id: `msg-${alert.id}`,
      alertId: alert.id,
      recipient: alert.notifiedTo[0] || '',
      channel: 'app',
      content: alert.message,
      sentAt: alert.timestamp,
      status: 'sent' as const,
    }));

    return mockResponse(wrapResponse({
      data: history,
      total: history.length,
    }));
  },
};

export const mockApi = {
  department: mockDepartmentApi,
  doctor: mockDoctorApi,
  schedule: mockScheduleApi,
  registration: mockRegistrationApi,
  alert: mockAlertApi,
  report: mockReportApi,
  message: mockMessageApi,
};

export const initMockApi = () => {
  if (!USE_MOCK) return;

  console.log('[Mock API] Initializing mock API interceptor...');

  const originalFetch = window.fetch;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method || 'GET';
    const body = init?.body;

    if (url.includes('/api/')) {
      const apiPath = url.split('/api/')[1];
      const pathParts = apiPath.split('?')[0].split('/');
      const searchParams = new URLSearchParams(apiPath.split('?')[1] || '');

      const getParam = (name: string) => {
        const value = searchParams.get(name);
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value || undefined;
      };

      try {
        let result: unknown;

        switch (pathParts[0]) {
          case 'departments':
            if (pathParts.length === 2) {
              result = await mockDepartmentApi.getById(pathParts[1]);
            } else {
              result = await mockDepartmentApi.getAll();
            }
            break;

          case 'department-stats':
            result = await mockDepartmentApi.getStats(
              getParam('departmentId') as string | undefined,
              getParam('timeRange') as TimeRange | undefined,
              {
                startDate: getParam('startDate') as string | undefined,
                endDate: getParam('endDate') as string | undefined,
              }
            );
            break;

          case 'waiting-records':
            result = await mockDepartmentApi.getWaitingRecords(
              getParam('departmentId') as string | undefined,
              { hours: getParam('hours') ? Number(getParam('hours')) : undefined }
            );
            break;

          case 'doctors':
            if (pathParts.length === 2) {
              result = await mockDoctorApi.getById(pathParts[1]);
            } else {
              result = await mockDoctorApi.getAll(getParam('departmentId') as string | undefined);
            }
            break;

          case 'doctor-stats':
            result = await mockDoctorApi.getStats(
              getParam('doctorId') as string | undefined,
              getParam('departmentId') as string | undefined,
              {
                startDate: getParam('startDate') as string | undefined,
                endDate: getParam('endDate') as string | undefined,
              }
            );
            break;

          case 'schedules':
            if (pathParts[1] === 'upload' && method === 'POST') {
              const file = body instanceof FormData ? body.get('file') as File : null;
              if (file) {
                result = await mockScheduleApi.uploadExcel(file);
              }
            } else if (pathParts[1] === 'analysis') {
              result = await mockScheduleApi.getAnalysis(getParam('date') as string | undefined);
            } else if (method === 'POST') {
              const data = typeof body === 'string' ? JSON.parse(body) : [];
              result = await mockScheduleApi.create(data);
            } else {
              result = await mockScheduleApi.getAll({
                departmentId: getParam('departmentId') as string | undefined,
                doctorId: getParam('doctorId') as string | undefined,
                date: getParam('date') as string | undefined,
                startDate: getParam('startDate') as string | undefined,
                endDate: getParam('endDate') as string | undefined,
              });
            }
            break;

          case 'registrations':
            if (pathParts.length === 2) {
              result = await mockRegistrationApi.getById(pathParts[1]);
            } else if (pathParts[1] === 'daily-stats') {
              result = await mockRegistrationApi.getDailyStats(getParam('date') as string | undefined);
            } else {
              result = await mockRegistrationApi.getAll({
                departmentId: getParam('departmentId') as string | undefined,
                doctorId: getParam('doctorId') as string | undefined,
                date: getParam('date') as string | undefined,
                startDate: getParam('startDate') as string | undefined,
                endDate: getParam('endDate') as string | undefined,
                status: getParam('status') as string | undefined,
                page: getParam('page') ? Number(getParam('page')) : undefined,
                pageSize: getParam('pageSize') ? Number(getParam('pageSize')) : undefined,
              });
            }
            break;

          case 'alerts':
            if (pathParts.length >= 2) {
              if (pathParts[1] === 'unresolved-count') {
                result = await mockAlertApi.getUnresolvedCount();
              } else if (pathParts[2] === 'resolve' && method === 'PUT') {
                result = await mockAlertApi.resolve(pathParts[1]);
              } else {
                result = await mockAlertApi.getById(pathParts[1]);
              }
            } else if (method === 'POST') {
              const data = typeof body === 'string' ? JSON.parse(body) : {};
              result = await mockAlertApi.create(data);
            } else {
              result = await mockAlertApi.getAll({
                resolved: getParam('resolved') as boolean | undefined,
                type: getParam('type') as string | undefined,
                level: getParam('level') as string | undefined,
                departmentId: getParam('departmentId') as string | undefined,
              });
            }
            break;

          case 'reports':
            if (pathParts[1] === 'weekly') {
              if (pathParts[2] === 'generate' && method === 'POST') {
                result = await mockReportApi.generateWeeklyReport(
                  getParam('weekStart') as string | undefined,
                  getParam('weekEnd') as string | undefined
                );
              } else if (pathParts[2] === 'download') {
                const format = getParam('format') as 'pdf' | 'excel' | 'txt' | undefined;
                const blob = await mockReportApi.downloadWeeklyReport(
                  getParam('weekStart') as string | undefined,
                  getParam('weekEnd') as string | undefined,
                  format
                );
                return new Response(blob, {
                  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                });
              } else {
                result = await mockReportApi.getWeeklyReport(
                  getParam('weekStart') as string | undefined,
                  getParam('weekEnd') as string | undefined
                );
              }
            }
            break;

          case 'messages':
            if (pathParts[1] === 'send-notification' && method === 'POST') {
              const data = typeof body === 'string' ? JSON.parse(body) : {};
              result = await mockMessageApi.sendNotification(data);
            } else if (pathParts[1] === 'history') {
              result = await mockMessageApi.getHistory({
                page: getParam('page') ? Number(getParam('page')) : undefined,
                pageSize: getParam('pageSize') ? Number(getParam('pageSize')) : undefined,
              });
            }
            break;

          default:
            return originalFetch(input, init);
        }

        if (result) {
          return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } catch (error) {
        console.error('[Mock API] Error:', error);
        return originalFetch(input, init);
      }
    }

    return originalFetch(input, init);
  };

  console.log('[Mock API] Mock API interceptor initialized');
};

export default mockApi;
