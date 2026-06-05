export interface Department {
  id: string;
  name: string;
  director: string;
  directorPhone: string;
  totalDoctors: number;
  dailyCapacity: number;
}

export interface Doctor {
  id: string;
  name: string;
  departmentId: string;
  departmentName: string;
  title: string;
  phone: string;
}

export interface Schedule {
  id: string;
  doctorId: string;
  doctorName: string;
  departmentId: string;
  departmentName: string;
  date: string;
  startTime: string;
  endTime: string;
  shiftType: 'morning' | 'afternoon' | 'evening';
  expectedPatients: number;
}

export interface Registration {
  id: string;
  patientName: string;
  patientId: string;
  departmentId: string;
  departmentName: string;
  doctorId: string;
  doctorName: string;
  registerTime: string;
  estimatedTime: string;
  actualStartTime: string | null;
  actualEndTime: string | null;
  status: 'waiting' | 'visiting' | 'completed' | 'cancelled';
  satisfaction: number | null;
}

export interface WaitingRecord {
  id: string;
  departmentId: string;
  departmentName: string;
  timestamp: string;
  waitingCount: number;
  averageWaitingTime: number;
  maxWaitingTime: number;
}

export interface DepartmentStats {
  departmentId: string;
  departmentName: string;
  date: string;
  totalRegistrations: number;
  completedVisits: number;
  cancelledVisits: number;
  averageWaitingTime: number;
  maxWaitingTime: number;
  averageVisitDuration: number;
  saturation: number;
  resourceUtilization: number;
}

export interface DoctorStats {
  doctorId: string;
  doctorName: string;
  departmentId: string;
  departmentName: string;
  date: string;
  totalPatients: number;
  completedPatients: number;
  averageVisitDuration: number;
  averageSatisfaction: number;
  efficiencyScore: number;
}

export interface Alert {
  id: string;
  type: 'waiting_time' | 'saturation' | 'underperformance' | 'schedule_mismatch';
  level: 'warning' | 'danger';
  departmentId: string;
  departmentName: string;
  doctorId?: string;
  doctorName?: string;
  message: string;
  timestamp: string;
  resolved: boolean;
  notifiedTo: string[];
}

export interface WeeklyReport {
  id: string;
  weekStart: string;
  weekEnd: string;
  generatedAt: string;
  waitingTimeCompliance: number;
  avgPatientsPerDoctor: number;
  patientChurnRate: number;
  departmentStats: {
    departmentId: string;
    departmentName: string;
    waitingTimeCompliance: number;
    avgPatientsPerDoctor: number;
    saturation: number;
  }[];
  recommendations: string[];
}

export type TimeRange = 'day' | 'week' | 'month';
