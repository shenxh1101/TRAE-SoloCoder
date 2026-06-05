import type { Department, Doctor, Schedule, Registration, WaitingRecord, DepartmentStats, DoctorStats, Alert, WeeklyReport } from '../types';

export const departments: Department[] = [
  { id: 'dept-001', name: '内科', director: '张明华', directorPhone: '138****1234', totalDoctors: 8, dailyCapacity: 160 },
  { id: 'dept-002', name: '外科', director: '李建国', directorPhone: '139****5678', totalDoctors: 10, dailyCapacity: 200 },
  { id: 'dept-003', name: '儿科', director: '王秀英', directorPhone: '137****9012', totalDoctors: 6, dailyCapacity: 120 },
  { id: 'dept-004', name: '妇产科', director: '陈美娟', directorPhone: '136****3456', totalDoctors: 7, dailyCapacity: 140 },
  { id: 'dept-005', name: '骨科', director: '刘志强', directorPhone: '135****7890', totalDoctors: 8, dailyCapacity: 160 },
  { id: 'dept-006', name: '眼科', director: '赵光明', directorPhone: '134****2345', totalDoctors: 5, dailyCapacity: 100 },
  { id: 'dept-007', name: '耳鼻喉科', director: '孙晓峰', directorPhone: '133****6789', totalDoctors: 4, dailyCapacity: 80 },
  { id: 'dept-008', name: '皮肤科', director: '周丽萍', directorPhone: '132****0123', totalDoctors: 4, dailyCapacity: 80 },
  { id: 'dept-009', name: '口腔科', director: '吴天翔', directorPhone: '131****4567', totalDoctors: 5, dailyCapacity: 100 },
  { id: 'dept-010', name: '急诊科', director: '郑海涛', directorPhone: '130****8901', totalDoctors: 12, dailyCapacity: 300 },
];

export const doctors: Doctor[] = [
  { id: 'doc-001', name: '张明华', departmentId: 'dept-001', departmentName: '内科', title: '主任医师', phone: '138****1234' },
  { id: 'doc-002', name: '李建国', departmentId: 'dept-002', departmentName: '外科', title: '主任医师', phone: '139****5678' },
  { id: 'doc-003', name: '王秀英', departmentId: 'dept-003', departmentName: '儿科', title: '主任医师', phone: '137****9012' },
  { id: 'doc-004', name: '陈美娟', departmentId: 'dept-004', departmentName: '妇产科', title: '主任医师', phone: '136****3456' },
  { id: 'doc-005', name: '刘志强', departmentId: 'dept-005', departmentName: '骨科', title: '主任医师', phone: '135****7890' },
  { id: 'doc-006', name: '赵光明', departmentId: 'dept-006', departmentName: '眼科', title: '主任医师', phone: '134****2345' },
  { id: 'doc-007', name: '孙晓峰', departmentId: 'dept-007', departmentName: '耳鼻喉科', title: '副主任医师', phone: '133****6789' },
  { id: 'doc-008', name: '周丽萍', departmentId: 'dept-008', departmentName: '皮肤科', title: '副主任医师', phone: '132****0123' },
  { id: 'doc-009', name: '吴天翔', departmentId: 'dept-009', departmentName: '口腔科', title: '副主任医师', phone: '131****4567' },
  { id: 'doc-010', name: '郑海涛', departmentId: 'dept-010', departmentName: '急诊科', title: '主任医师', phone: '130****8901' },
  { id: 'doc-011', name: '钱伟民', departmentId: 'dept-001', departmentName: '内科', title: '副主任医师', phone: '138****2345' },
  { id: 'doc-012', name: '马晓东', departmentId: 'dept-001', departmentName: '内科', title: '主治医师', phone: '138****3456' },
  { id: 'doc-013', name: '林小芳', departmentId: 'dept-002', departmentName: '外科', title: '副主任医师', phone: '139****6789' },
  { id: 'doc-014', name: '黄建国', departmentId: 'dept-002', departmentName: '外科', title: '主治医师', phone: '139****7890' },
  { id: 'doc-015', name: '徐小红', departmentId: 'dept-003', departmentName: '儿科', title: '副主任医师', phone: '137****0123' },
  { id: 'doc-016', name: '朱德明', departmentId: 'dept-003', departmentName: '儿科', title: '主治医师', phone: '137****1234' },
  { id: 'doc-017', name: '杨丽华', departmentId: 'dept-004', departmentName: '妇产科', title: '副主任医师', phone: '136****4567' },
  { id: 'doc-018', name: '何志强', departmentId: 'dept-005', departmentName: '骨科', title: '副主任医师', phone: '135****8901' },
  { id: 'doc-019', name: '罗美玲', departmentId: 'dept-006', departmentName: '眼科', title: '主治医师', phone: '134****3456' },
  { id: 'doc-020', name: '谢伟光', departmentId: 'dept-010', departmentName: '急诊科', title: '副主任医师', phone: '130****9012' },
];

const generateSchedules = (): Schedule[] => {
  const schedules: Schedule[] = [];
  const shiftTypes: ('morning' | 'afternoon' | 'evening')[] = ['morning', 'afternoon', 'evening'];
  const timeRanges = {
    morning: { start: '08:00', end: '12:00', expected: 25 },
    afternoon: { start: '14:00', end: '17:30', expected: 20 },
    evening: { start: '18:00', end: '21:00', expected: 15 },
  };

  const today = new Date();
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);
    const dateStr = date.toISOString().split('T')[0];

    doctors.forEach((doctor, docIndex) => {
      if (Math.random() > 0.3) {
        const shiftType = shiftTypes[docIndex % 3];
        const timeRange = timeRanges[shiftType];
        schedules.push({
          id: `sch-${dateStr}-${doctor.id}`,
          doctorId: doctor.id,
          doctorName: doctor.name,
          departmentId: doctor.departmentId,
          departmentName: doctor.departmentName,
          date: dateStr,
          startTime: timeRange.start,
          endTime: timeRange.end,
          shiftType,
          expectedPatients: timeRange.expected,
        });
      }
    });
  }
  return schedules;
};

export const schedules: Schedule[] = generateSchedules();

const patientNames = ['张伟', '王芳', '李娜', '刘洋', '陈静', '杨帆', '赵敏', '黄磊', '周杰', '吴刚',
  '郑爽', '孙俪', '马云', '朱琳', '胡歌', '林志玲', '徐峥', '高圆圆', '邓超', '范冰冰'];

const generateRegistrations = (): Registration[] => {
  const registrations: Registration[] = [];
  const today = new Date();

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);
    const dateStr = date.toISOString().split('T')[0];

    departments.forEach((dept) => {
      const deptDoctors = doctors.filter(d => d.departmentId === dept.id);
      const dailyCount = Math.floor(dept.dailyCapacity * (0.7 + Math.random() * 0.5));

      for (let i = 0; i < dailyCount; i++) {
        const doctor = deptDoctors[Math.floor(Math.random() * deptDoctors.length)];
        const hour = 8 + Math.floor(Math.random() * 12);
        const minute = Math.floor(Math.random() * 60);
        const registerTime = new Date(date);
        registerTime.setHours(hour, minute, 0);

        const waitMinutes = Math.floor(Math.random() * 45 + 10);
        const visitDuration = Math.floor(Math.random() * 20 + 10);
        const estimatedTime = new Date(registerTime.getTime() + waitMinutes * 60000);
        const actualStartTime = new Date(estimatedTime.getTime() + (Math.random() - 0.3) * 10 * 60000);
        const actualEndTime = new Date(actualStartTime.getTime() + visitDuration * 60000);

        const statuses: ('waiting' | 'visiting' | 'completed' | 'cancelled')[] = ['completed', 'completed', 'completed', 'completed', 'cancelled'];
        const status = dayOffset === 0 && hour > new Date().getHours() ?
          (Math.random() > 0.5 ? 'waiting' : 'visiting') :
          statuses[Math.floor(Math.random() * statuses.length)];

        registrations.push({
          id: `reg-${dateStr}-${dept.id}-${i.toString().padStart(3, '0')}`,
          patientName: patientNames[Math.floor(Math.random() * patientNames.length)],
          patientId: `P${Math.floor(Math.random() * 900000 + 100000)}`,
          departmentId: dept.id,
          departmentName: dept.name,
          doctorId: doctor.id,
          doctorName: doctor.name,
          registerTime: registerTime.toISOString(),
          estimatedTime: estimatedTime.toISOString(),
          actualStartTime: status === 'waiting' ? null : actualStartTime.toISOString(),
          actualEndTime: status === 'completed' ? actualEndTime.toISOString() : null,
          status,
          satisfaction: status === 'completed' ? Math.floor(Math.random() * 2 + 4) : null,
        });
      }
    });
  }
  return registrations;
};

export const registrations: Registration[] = generateRegistrations();

const generateWaitingRecords = (): WaitingRecord[] => {
  const records: WaitingRecord[] = [];
  const today = new Date();

  for (let hour = 8; hour < 20; hour++) {
    departments.forEach((dept, deptIndex) => {
      const timestamp = new Date(today);
      timestamp.setHours(hour, 0, 0, 0);

      const baseWait = [15, 25, 35, 20, 18, 12, 15, 10, 12, 40][deptIndex];
      const peakFactor = hour >= 9 && hour <= 11 ? 1.5 : (hour >= 14 && hour <= 16 ? 1.3 : 0.8);
      const avgWait = Math.floor(baseWait * peakFactor * (0.8 + Math.random() * 0.4));

      records.push({
        id: `wait-${timestamp.getTime()}-${dept.id}`,
        departmentId: dept.id,
        departmentName: dept.name,
        timestamp: timestamp.toISOString(),
        waitingCount: Math.floor(Math.random() * 15 + 5),
        averageWaitingTime: avgWait,
        maxWaitingTime: Math.floor(avgWait * 1.5 + Math.random() * 20),
      });
    });
  }
  return records;
};

export const waitingRecords: WaitingRecord[] = generateWaitingRecords();

const generateDepartmentStats = (): DepartmentStats[] => {
  const stats: DepartmentStats[] = [];
  const today = new Date();

  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);
    const dateStr = date.toISOString().split('T')[0];

    departments.forEach((dept, deptIndex) => {
      const total = Math.floor(dept.dailyCapacity * (0.7 + Math.random() * 0.5));
      const cancelled = Math.floor(total * 0.05);
      const completed = total - cancelled;

      const baseWait = [15, 25, 35, 20, 18, 12, 15, 10, 12, 40][deptIndex];
      const avgWait = Math.floor(baseWait * (0.8 + Math.random() * 0.4));
      const saturation = (total / dept.dailyCapacity) * 100;

      stats.push({
        departmentId: dept.id,
        departmentName: dept.name,
        date: dateStr,
        totalRegistrations: total,
        completedVisits: completed,
        cancelledVisits: cancelled,
        averageWaitingTime: avgWait,
        maxWaitingTime: Math.floor(avgWait * 1.8),
        averageVisitDuration: Math.floor(Math.random() * 10 + 12),
        saturation: Math.round(saturation * 10) / 10,
        resourceUtilization: Math.round(saturation * (0.85 + Math.random() * 0.15) * 10) / 10,
      });
    });
  }
  return stats;
};

export const departmentStats: DepartmentStats[] = generateDepartmentStats();

const generateDoctorStats = (): DoctorStats[] => {
  const stats: DoctorStats[] = [];
  const today = new Date();

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);
    const dateStr = date.toISOString().split('T')[0];

    doctors.forEach((doctor) => {
      const hasSchedule = schedules.some(s => s.doctorId === doctor.id && s.date === dateStr);
      if (!hasSchedule) return;

      const basePatients = doctor.title === '主任医师' ? 28 : doctor.title === '副主任医师' ? 24 : 20;
      const totalPatients = Math.floor(basePatients * (0.8 + Math.random() * 0.4));
      const avgDuration = Math.floor(Math.random() * 8 + 12);
      const avgSatisfaction = 4 + Math.random();

      stats.push({
        doctorId: doctor.id,
        doctorName: doctor.name,
        departmentId: doctor.departmentId,
        departmentName: doctor.departmentName,
        date: dateStr,
        totalPatients,
        completedPatients: Math.floor(totalPatients * 0.95),
        averageVisitDuration: avgDuration,
        averageSatisfaction: Math.round(avgSatisfaction * 10) / 10,
        efficiencyScore: Math.round((totalPatients / basePatients) * 50 + (20 / avgDuration) * 30 + (avgSatisfaction / 5) * 20),
      });
    });
  }
  return stats;
};

export const doctorStats: DoctorStats[] = generateDoctorStats();

export const alerts: Alert[] = [
  {
    id: 'alert-001',
    type: 'waiting_time',
    level: 'danger',
    departmentId: 'dept-010',
    departmentName: '急诊科',
    message: '急诊科连续1小时平均候诊时间超过45分钟，请立即增派医生！',
    timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
    resolved: false,
    notifiedTo: ['郑海涛', '调度中心'],
  },
  {
    id: 'alert-002',
    type: 'waiting_time',
    level: 'warning',
    departmentId: 'dept-003',
    departmentName: '儿科',
    message: '儿科平均候诊时间已达38分钟，请关注患者流量变化。',
    timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
    resolved: false,
    notifiedTo: ['王秀英', '调度中心'],
  },
  {
    id: 'alert-003',
    type: 'schedule_mismatch',
    level: 'warning',
    departmentId: 'dept-002',
    departmentName: '外科',
    doctorId: 'doc-014',
    doctorName: '黄建国',
    message: '医生黄建国今日排班接诊20人，实际仅接诊8人，请核实情况。',
    timestamp: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
    resolved: false,
    notifiedTo: ['李建国', '黄建国'],
  },
  {
    id: 'alert-004',
    type: 'saturation',
    level: 'warning',
    departmentId: 'dept-001',
    departmentName: '内科',
    message: '内科当前饱和度达92%，建议启动应急预案。',
    timestamp: new Date(Date.now() - 90 * 60000).toISOString(),
    resolved: true,
    notifiedTo: ['张明华'],
  },
];

const generateWeeklyReport = (): WeeklyReport => {
  const today = new Date();
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() - 1);
  const weekStart = new Date(weekEnd);
  weekStart.setDate(weekStart.getDate() - 6);

  return {
    id: 'report-' + weekStart.toISOString().split('T')[0],
    weekStart: weekStart.toISOString().split('T')[0],
    weekEnd: weekEnd.toISOString().split('T')[0],
    generatedAt: new Date().toISOString(),
    waitingTimeCompliance: 78.5,
    avgPatientsPerDoctor: 22.3,
    patientChurnRate: 4.8,
    departmentStats: departments.map((dept, index) => ({
      departmentId: dept.id,
      departmentName: dept.name,
      waitingTimeCompliance: [85, 72, 65, 80, 78, 92, 88, 90, 86, 55][index],
      avgPatientsPerDoctor: [24, 26, 20, 22, 23, 18, 19, 17, 16, 32][index],
      saturation: [85, 88, 92, 78, 82, 72, 75, 68, 70, 95][index],
    })),
    recommendations: [
      '急诊科候诊时间达标率仅55%，建议增加高峰时段（10:00-14:00）出诊医生2-3名',
      '儿科患者流失率达6.2%，建议优化叫号系统，增加候诊区娱乐设施',
      '皮肤科资源利用率偏低（68%），可考虑开展皮肤美容等特色门诊增加收入',
      '内科和外科医生人均接诊量较高，建议合理控制每位医生单日接诊上限',
      '建议在急诊科和儿科引入智能预诊系统，缩短患者候诊时间',
    ],
  };
};

export const weeklyReport: WeeklyReport = generateWeeklyReport();
