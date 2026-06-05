import type { DepartmentStats, WaitingRecord, Alert, DoctorStats, Schedule, Registration, Department } from '../types';

export const calculateSaturation = (totalPatients: number, capacity: number): number => {
  return Math.round((totalPatients / capacity) * 1000) / 10;
};

export const calculateAverageWaitingTime = (records: WaitingRecord[]): number => {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.averageWaitingTime, 0);
  return Math.round((sum / records.length) * 10) / 10;
};

export const detectWaitingTimeAlerts = (records: WaitingRecord[], departments: Department[]): Alert[] => {
  const alerts: Alert[] = [];
  const now = new Date();
  
  departments.forEach(dept => {
    const deptRecords = records
      .filter(r => r.departmentId === dept.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    if (deptRecords.length < 2) return;
    
    const lastHourRecords = deptRecords.filter(r => {
      const recordTime = new Date(r.timestamp);
      return (now.getTime() - recordTime.getTime()) <= 60 * 60 * 1000;
    });
    
    if (lastHourRecords.length >= 2) {
      const allOver30 = lastHourRecords.every(r => r.averageWaitingTime > 30);
      const avgWait = calculateAverageWaitingTime(lastHourRecords);
      
      if (allOver30) {
        const existingAlert = alerts.find(a => 
          a.departmentId === dept.id && a.type === 'waiting_time' && !a.resolved
        );
        
        if (!existingAlert) {
          alerts.push({
            id: `alert-wait-${dept.id}-${Date.now()}`,
            type: 'waiting_time',
            level: avgWait > 40 ? 'danger' : 'warning',
            departmentId: dept.id,
            departmentName: dept.name,
            message: `${dept.name}连续1小时平均候诊时间超过${Math.round(avgWait)}分钟，请${avgWait > 40 ? '立即增派医生' : '关注患者流量变化'}！`,
            timestamp: now.toISOString(),
            resolved: false,
            notifiedTo: [dept.director, '调度中心'],
          });
        }
      }
    }
  });
  
  return alerts;
};

export const detectScheduleMismatch = (
  schedules: Schedule[],
  registrations: Registration[],
  doctors: { id: string; name: string }[],
  departments: Department[]
): Alert[] => {
  const alerts: Alert[] = [];
  const today = new Date().toISOString().split('T')[0];
  
  schedules
    .filter(s => s.date === today)
    .forEach(schedule => {
      const actualPatients = registrations.filter(
        r => r.doctorId === schedule.doctorId && 
             r.registerTime.startsWith(today) &&
             r.status !== 'cancelled'
      ).length;
      
      const mismatchThreshold = schedule.expectedPatients * 0.5;
      if (actualPatients < mismatchThreshold && actualPatients > 0) {
        const doctor = doctors.find(d => d.id === schedule.doctorId);
        alerts.push({
          id: `alert-schedule-${schedule.doctorId}-${Date.now()}`,
          type: 'schedule_mismatch',
          level: 'warning',
          departmentId: schedule.departmentId,
          departmentName: schedule.departmentName,
          doctorId: schedule.doctorId,
          doctorName: doctor?.name || schedule.doctorName,
          message: `医生${doctor?.name || schedule.doctorName}今日排班接诊${schedule.expectedPatients}人，实际仅接诊${actualPatients}人，请核实情况。`,
          timestamp: new Date().toISOString(),
          resolved: false,
          notifiedTo: [
            departments.find(d => d.id === schedule.departmentId)?.director || '',
            doctor?.name || schedule.doctorName,
          ].filter(Boolean),
        });
      }
    });
  
  return alerts;
};

export const calculateWaitingTimeCompliance = (stats: DepartmentStats[]): number => {
  if (stats.length === 0) return 0;
  const compliantDays = stats.filter(s => s.averageWaitingTime <= 30).length;
  return Math.round((compliantDays / stats.length) * 1000) / 10;
};

export const calculatePatientChurnRate = (stats: DepartmentStats[]): number => {
  if (stats.length === 0) return 0;
  const totalRegistrations = stats.reduce((acc, s) => acc + s.totalRegistrations, 0);
  const totalCancelled = stats.reduce((acc, s) => acc + s.cancelledVisits, 0);
  return totalRegistrations > 0 ? Math.round((totalCancelled / totalRegistrations) * 1000) / 10 : 0;
};

export const calculateAvgPatientsPerDoctor = (
  doctorStats: DoctorStats[],
  deptId?: string
): number => {
  const filtered = deptId ? doctorStats.filter(s => s.departmentId === deptId) : doctorStats;
  if (filtered.length === 0) return 0;
  const uniqueDoctors = new Set(filtered.map(s => s.doctorId)).size;
  const totalPatients = filtered.reduce((acc, s) => acc + s.totalPatients, 0);
  return uniqueDoctors > 0 ? Math.round((totalPatients / uniqueDoctors) * 10) / 10 : 0;
};

export const generateRecommendations = (
  departmentStats: DepartmentStats[],
  doctorStats: DoctorStats[],
  departments: Department[]
): string[] => {
  const recommendations: string[] = [];
  
  const deptSummary = departments.map(dept => {
    const deptStats = departmentStats.filter(s => s.departmentId === dept.id);
    const compliance = calculateWaitingTimeCompliance(deptStats);
    const avgPatients = calculateAvgPatientsPerDoctor(doctorStats, dept.id);
    const avgSaturation = deptStats.length > 0 
      ? Math.round(deptStats.reduce((acc, s) => acc + s.saturation, 0) / deptStats.length)
      : 0;
    return { dept, compliance, avgPatients, avgSaturation };
  });
  
  deptSummary
    .filter(d => d.compliance < 70)
    .sort((a, b) => a.compliance - b.compliance)
    .forEach(d => {
      recommendations.push(
        `${d.dept.name}候诊时间达标率仅${d.compliance}%，建议增加高峰时段（10:00-14:00）出诊医生2-3名`
      );
    });
  
  deptSummary
    .filter(d => d.avgSaturation < 70)
    .forEach(d => {
      recommendations.push(
        `${d.dept.name}资源利用率偏低（${d.avgSaturation}%），可考虑开展特色门诊增加收入`
      );
    });
  
  const highWorkload = deptSummary.filter(d => d.avgPatients > 25);
  if (highWorkload.length > 0) {
    const names = highWorkload.map(d => d.dept.name).join('、');
    recommendations.push(`${names}医生人均接诊量较高，建议合理控制每位医生单日接诊上限`);
  }
  
  if (recommendations.length === 0) {
    recommendations.push('本周各科室运营情况良好，建议继续保持现有调度策略');
  }
  
  return recommendations;
};

export const getHeatmapData = (stats: DepartmentStats[], timeRange: string, departments: Department[]) => {
  const days = timeRange === 'day' ? 1 : timeRange === 'week' ? 7 : 30;
  const filteredStats = stats.slice(0, days * departments.length);
  
  const data: (string | number)[][] = [];
  const deptNames = departments.map(d => d.name);
  const dates: string[] = [];
  
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0].slice(5));
  }
  
  dates.reverse();
  
  departments.forEach((dept, deptIndex) => {
    dates.forEach((date, dateIndex) => {
      const stat = filteredStats.find(s => s.departmentId === dept.id && s.date.endsWith(date.replace('-', '-')));
      const value = stat ? stat.totalRegistrations : Math.floor(dept.dailyCapacity * 0.75);
      data.push([dateIndex, deptIndex, value]);
    });
  });
  
  return { data, xAxis: dates, yAxis: deptNames };
};

export const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

export const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
};

export const formatDateTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getTimeAgo = (isoString: string): string => {
  const now = new Date();
  const date = new Date(isoString);
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  return `${days}天前`;
};
