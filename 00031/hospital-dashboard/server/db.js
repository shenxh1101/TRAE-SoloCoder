import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'data', 'hospital.db');

let db;

export function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function initDatabase() {
  mkdirSync(dirname(DB_PATH), { recursive: true });

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  createTables();
  createViews();

  const count = db.prepare('SELECT COUNT(*) as cnt FROM departments').get();
  if (count.cnt === 0) {
    seedData();
  }

  return db;
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      director TEXT NOT NULL,
      directorPhone TEXT NOT NULL,
      totalDoctors INTEGER NOT NULL,
      dailyCapacity INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS doctors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      departmentId TEXT NOT NULL,
      departmentName TEXT NOT NULL,
      title TEXT NOT NULL,
      phone TEXT NOT NULL,
      FOREIGN KEY (departmentId) REFERENCES departments(id)
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      doctorId TEXT NOT NULL,
      doctorName TEXT NOT NULL,
      departmentId TEXT NOT NULL,
      departmentName TEXT NOT NULL,
      date TEXT NOT NULL,
      startTime TEXT NOT NULL,
      endTime TEXT NOT NULL,
      shiftType TEXT NOT NULL,
      expectedPatients INTEGER NOT NULL,
      FOREIGN KEY (doctorId) REFERENCES doctors(id),
      FOREIGN KEY (departmentId) REFERENCES departments(id)
    );

    CREATE TABLE IF NOT EXISTS registrations (
      id TEXT PRIMARY KEY,
      patientName TEXT NOT NULL,
      patientId TEXT NOT NULL,
      departmentId TEXT NOT NULL,
      departmentName TEXT NOT NULL,
      doctorId TEXT NOT NULL,
      doctorName TEXT NOT NULL,
      registerTime TEXT NOT NULL,
      estimatedTime TEXT NOT NULL,
      actualStartTime TEXT,
      actualEndTime TEXT,
      status TEXT NOT NULL,
      satisfaction INTEGER,
      FOREIGN KEY (departmentId) REFERENCES departments(id),
      FOREIGN KEY (doctorId) REFERENCES doctors(id)
    );

    CREATE TABLE IF NOT EXISTS waiting_records (
      id TEXT PRIMARY KEY,
      departmentId TEXT NOT NULL,
      departmentName TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      waitingCount INTEGER NOT NULL,
      averageWaitingTime INTEGER NOT NULL,
      maxWaitingTime INTEGER NOT NULL,
      FOREIGN KEY (departmentId) REFERENCES departments(id)
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      level TEXT NOT NULL,
      departmentId TEXT NOT NULL,
      departmentName TEXT NOT NULL,
      doctorId TEXT,
      doctorName TEXT,
      message TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      resolved INTEGER NOT NULL DEFAULT 0,
      notifiedTo TEXT NOT NULL DEFAULT '[]',
      FOREIGN KEY (departmentId) REFERENCES departments(id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alertId TEXT NOT NULL,
      recipient TEXT NOT NULL,
      channel TEXT NOT NULL,
      content TEXT NOT NULL,
      sentAt TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      FOREIGN KEY (alertId) REFERENCES alerts(id)
    );

    CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(date);
    CREATE INDEX IF NOT EXISTS idx_schedules_doctor ON schedules(doctorId);
    CREATE INDEX IF NOT EXISTS idx_schedules_department ON schedules(departmentId);
    CREATE INDEX IF NOT EXISTS idx_registrations_date ON registrations(registerTime);
    CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);
    CREATE INDEX IF NOT EXISTS idx_registrations_department ON registrations(departmentId);
    CREATE INDEX IF NOT EXISTS idx_registrations_doctor ON registrations(doctorId);
    CREATE INDEX IF NOT EXISTS idx_waiting_dept ON waiting_records(departmentId);
    CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(resolved);
    CREATE INDEX IF NOT EXISTS idx_messages_alert ON messages(alertId);
  `);
}

function createViews() {
  db.exec(`
    DROP VIEW IF EXISTS department_stats;
    DROP VIEW IF EXISTS doctor_stats;
  `);

  db.exec(`
    CREATE VIEW department_stats AS
    SELECT
      r.departmentId,
      r.departmentName,
      DATE(r.registerTime) as date,
      COUNT(*) as totalRegistrations,
      SUM(CASE WHEN r.status = 'completed' THEN 1 ELSE 0 END) as completedVisits,
      SUM(CASE WHEN r.status = 'cancelled' THEN 1 ELSE 0 END) as cancelledVisits,
      COALESCE(AVG(CASE WHEN r.status = 'completed' AND r.actualStartTime IS NOT NULL
        THEN (julianday(r.actualStartTime) - julianday(r.registerTime)) * 24 * 60
      END), 0) as averageWaitingTime,
      COALESCE(MAX(CASE WHEN r.status = 'completed' AND r.actualStartTime IS NOT NULL
        THEN (julianday(r.actualStartTime) - julianday(r.registerTime)) * 24 * 60
      END), 0) as maxWaitingTime,
      COALESCE(AVG(CASE WHEN r.status = 'completed' AND r.actualStartTime IS NOT NULL AND r.actualEndTime IS NOT NULL
        THEN (julianday(r.actualEndTime) - julianday(r.actualStartTime)) * 24 * 60
      END), 0) as averageVisitDuration,
      ROUND(COUNT(*) * 100.0 / d.dailyCapacity, 1) as saturation,
      ROUND(COUNT(*) * 100.0 * 0.92 / d.dailyCapacity, 1) as resourceUtilization
    FROM registrations r
    JOIN departments d ON r.departmentId = d.id
    GROUP BY r.departmentId, DATE(r.registerTime);

    CREATE VIEW doctor_stats AS
    SELECT
      r.doctorId,
      r.doctorName,
      r.departmentId,
      r.departmentName,
      DATE(r.registerTime) as date,
      COUNT(*) as totalPatients,
      SUM(CASE WHEN r.status = 'completed' THEN 1 ELSE 0 END) as completedPatients,
      COALESCE(AVG(CASE WHEN r.status = 'completed' AND r.actualStartTime IS NOT NULL AND r.actualEndTime IS NOT NULL
        THEN (julianday(r.actualEndTime) - julianday(r.actualStartTime)) * 24 * 60
      END), 0) as averageVisitDuration,
      COALESCE(AVG(CASE WHEN r.satisfaction IS NOT NULL THEN r.satisfaction END), 0) as averageSatisfaction,
      CASE WHEN MAX(s.expectedPatients) IS NULL THEN
        ROUND(MIN(100, (COUNT(*) * 1.0 / 25.0) * 50 +
        (20.0 / MAX(COALESCE(AVG(CASE WHEN r.status = 'completed' AND r.actualStartTime IS NOT NULL AND r.actualEndTime IS NOT NULL
          THEN (julianday(r.actualEndTime) - julianday(r.actualStartTime)) * 24 * 60
        END), 15), 1)) * 30 +
        (COALESCE(AVG(CASE WHEN r.satisfaction IS NOT NULL THEN r.satisfaction END), 4) / 5.0) * 20))
      ELSE
        ROUND(MIN(100, (COUNT(*) * 1.0 / MAX(s.expectedPatients, 1)) * 50 +
        (20.0 / MAX(COALESCE(AVG(CASE WHEN r.status = 'completed' AND r.actualStartTime IS NOT NULL AND r.actualEndTime IS NOT NULL
          THEN (julianday(r.actualEndTime) - julianday(r.actualStartTime)) * 24 * 60
        END), 15), 1)) * 30 +
        (COALESCE(AVG(CASE WHEN r.satisfaction IS NOT NULL THEN r.satisfaction END), 4) / 5.0) * 20))
      END as efficiencyScore
    FROM registrations r
    LEFT JOIN schedules s ON r.doctorId = s.doctorId AND DATE(r.registerTime) = s.date
    GROUP BY r.doctorId, DATE(r.registerTime);
  `);
}

function seedData() {
  const insertDepartment = db.prepare(`
    INSERT INTO departments (id, name, director, directorPhone, totalDoctors, dailyCapacity)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const departments = [
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

  const insertDoctor = db.prepare(`
    INSERT INTO doctors (id, name, departmentId, departmentName, title, phone)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const doctors = [
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

  const transaction = db.transaction(() => {
    for (const dept of departments) {
      insertDepartment.run(dept.id, dept.name, dept.director, dept.directorPhone, dept.totalDoctors, dept.dailyCapacity);
    }

    for (const doc of doctors) {
      insertDoctor.run(doc.id, doc.name, doc.departmentId, doc.departmentName, doc.title, doc.phone);
    }

    generateSchedules();
    generateRegistrations();
    generateWaitingRecords();
    insertInitialAlerts();
  });

  transaction();
}

function generateSchedules() {
  const insertSchedule = db.prepare(`
    INSERT INTO schedules (id, doctorId, doctorName, departmentId, departmentName, date, startTime, endTime, shiftType, expectedPatients)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const doctors = db.prepare('SELECT * FROM doctors').all();
  const shiftTypes = ['morning', 'afternoon', 'evening'];
  const timeRanges = {
    morning: { start: '08:00', end: '12:00', expected: 25 },
    afternoon: { start: '14:00', end: '17:30', expected: 20 },
    evening: { start: '18:00', end: '21:00', expected: 15 },
  };

  const today = new Date();
  const seed = seedRandom(42);

  const stmts = [];
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);
    const dateStr = date.toISOString().split('T')[0];

    doctors.forEach((doctor, docIndex) => {
      if (seed() > 0.3) {
        const shiftType = shiftTypes[docIndex % 3];
        const timeRange = timeRanges[shiftType];
        const id = `sch-${dateStr}-${doctor.id}`;
        stmts.push({
          id, doctorId: doctor.id, doctorName: doctor.name,
          departmentId: doctor.departmentId, departmentName: doctor.departmentName,
          date: dateStr, startTime: timeRange.start, endTime: timeRange.end,
          shiftType, expectedPatients: timeRange.expected,
        });
      }
    });
  }

  const insertMany = db.transaction((items) => {
    for (const s of items) {
      insertSchedule.run(s.id, s.doctorId, s.doctorName, s.departmentId, s.departmentName,
        s.date, s.startTime, s.endTime, s.shiftType, s.expectedPatients);
    }
  });
  insertMany(stmts);
}

function generateRegistrations() {
  const insertRegistration = db.prepare(`
    INSERT INTO registrations (id, patientName, patientId, departmentId, departmentName, doctorId, doctorName, registerTime, estimatedTime, actualStartTime, actualEndTime, status, satisfaction)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const patientNames = ['张伟', '王芳', '李娜', '刘洋', '陈静', '杨帆', '赵敏', '黄磊', '周杰', '吴刚',
    '郑爽', '孙俪', '马云', '朱琳', '胡歌', '林志玲', '徐峥', '高圆圆', '邓超', '范冰冰'];

  const departments = db.prepare('SELECT * FROM departments').all();
  const doctors = db.prepare('SELECT * FROM doctors').all();
  const today = new Date();
  const seed = seedRandom(123);
  const now = new Date();

  const allRegistrations = [];

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);
    const dateStr = date.toISOString().split('T')[0];

    for (const dept of departments) {
      const deptDoctors = doctors.filter(d => d.departmentId === dept.id);
      const dailyCount = Math.floor(dept.dailyCapacity * (0.7 + seed() * 0.5));

      for (let i = 0; i < dailyCount; i++) {
        const doctor = deptDoctors[Math.floor(seed() * deptDoctors.length)];
        const hour = 8 + Math.floor(seed() * 12);
        const minute = Math.floor(seed() * 60);
        const registerTime = new Date(date);
        registerTime.setHours(hour, minute, 0, 0);

        const waitMinutes = Math.floor(seed() * 45 + 10);
        const visitDuration = Math.floor(seed() * 20 + 10);
        const estimatedTime = new Date(registerTime.getTime() + waitMinutes * 60000);
        const actualStartTime = new Date(estimatedTime.getTime() + (seed() - 0.3) * 10 * 60000);
        const actualEndTime = new Date(actualStartTime.getTime() + visitDuration * 60000);

        const statuses = ['completed', 'completed', 'completed', 'completed', 'cancelled'];
        const isToday = dayOffset === 0;
        const status = isToday && hour > now.getHours()
          ? (seed() > 0.5 ? 'waiting' : 'visiting')
          : statuses[Math.floor(seed() * statuses.length)];

        allRegistrations.push({
          id: `reg-${dateStr}-${dept.id}-${i.toString().padStart(3, '0')}`,
          patientName: patientNames[Math.floor(seed() * patientNames.length)],
          patientId: `P${Math.floor(seed() * 900000 + 100000)}`,
          departmentId: dept.id,
          departmentName: dept.name,
          doctorId: doctor.id,
          doctorName: doctor.name,
          registerTime: registerTime.toISOString(),
          estimatedTime: estimatedTime.toISOString(),
          actualStartTime: status === 'waiting' ? null : actualStartTime.toISOString(),
          actualEndTime: status === 'completed' ? actualEndTime.toISOString() : null,
          status,
          satisfaction: status === 'completed' ? Math.floor(seed() * 2 + 4) : null,
        });
      }
    }
  }

  const insertMany = db.transaction((items) => {
    for (const r of items) {
      insertRegistration.run(r.id, r.patientName, r.patientId, r.departmentId, r.departmentName,
        r.doctorId, r.doctorName, r.registerTime, r.estimatedTime, r.actualStartTime,
        r.actualEndTime, r.status, r.satisfaction);
    }
  });
  insertMany(allRegistrations);
}

function generateWaitingRecords() {
  const insertWaiting = db.prepare(`
    INSERT INTO waiting_records (id, departmentId, departmentName, timestamp, waitingCount, averageWaitingTime, maxWaitingTime)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const departments = db.prepare('SELECT * FROM departments').all();
  const today = new Date();
  const seed = seedRandom(456);
  const baseWaits = [15, 25, 35, 20, 18, 12, 15, 10, 12, 40];

  const records = [];

  for (let hour = 8; hour < 20; hour++) {
    for (let deptIndex = 0; deptIndex < departments.length; deptIndex++) {
      const dept = departments[deptIndex];
      const timestamp = new Date(today);
      timestamp.setHours(hour, 0, 0, 0);

      const baseWait = baseWaits[deptIndex];
      const peakFactor = hour >= 9 && hour <= 11 ? 1.5 : (hour >= 14 && hour <= 16 ? 1.3 : 0.8);
      const avgWait = Math.floor(baseWait * peakFactor * (0.8 + seed() * 0.4));

      records.push({
        id: `wait-${timestamp.getTime()}-${dept.id}`,
        departmentId: dept.id,
        departmentName: dept.name,
        timestamp: timestamp.toISOString(),
        waitingCount: Math.floor(seed() * 15 + 5),
        averageWaitingTime: avgWait,
        maxWaitingTime: Math.floor(avgWait * 1.5 + seed() * 20),
      });
    }
  }

  const insertMany = db.transaction((items) => {
    for (const r of items) {
      insertWaiting.run(r.id, r.departmentId, r.departmentName, r.timestamp,
        r.waitingCount, r.averageWaitingTime, r.maxWaitingTime);
    }
  });
  insertMany(records);
}

function insertInitialAlerts() {
  const insertAlert = db.prepare(`
    INSERT INTO alerts (id, type, level, departmentId, departmentName, doctorId, doctorName, message, timestamp, resolved, notifiedTo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const alerts = [
    {
      id: 'alert-001', type: 'waiting_time', level: 'danger',
      departmentId: 'dept-010', departmentName: '急诊科',
      doctorId: null, doctorName: null,
      message: '急诊科连续1小时平均候诊时间超过45分钟，请立即增派医生！',
      timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
      resolved: 0, notifiedTo: JSON.stringify(['郑海涛', '调度中心']),
    },
    {
      id: 'alert-002', type: 'waiting_time', level: 'warning',
      departmentId: 'dept-003', departmentName: '儿科',
      doctorId: null, doctorName: null,
      message: '儿科平均候诊时间已达38分钟，请关注患者流量变化。',
      timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
      resolved: 0, notifiedTo: JSON.stringify(['王秀英', '调度中心']),
    },
    {
      id: 'alert-003', type: 'schedule_mismatch', level: 'warning',
      departmentId: 'dept-002', departmentName: '外科',
      doctorId: 'doc-014', doctorName: '黄建国',
      message: '医生黄建国今日排班接诊20人，实际仅接诊8人，请核实情况。',
      timestamp: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
      resolved: 0, notifiedTo: JSON.stringify(['李建国', '黄建国']),
    },
    {
      id: 'alert-004', type: 'saturation', level: 'warning',
      departmentId: 'dept-001', departmentName: '内科',
      doctorId: null, doctorName: null,
      message: '内科当前饱和度达92%，建议启动应急预案。',
      timestamp: new Date(Date.now() - 90 * 60000).toISOString(),
      resolved: 1, notifiedTo: JSON.stringify(['张明华']),
    },
  ];

  const insertMany = db.transaction((items) => {
    for (const a of items) {
      insertAlert.run(a.id, a.type, a.level, a.departmentId, a.departmentName,
        a.doctorId, a.doctorName, a.message, a.timestamp, a.resolved, a.notifiedTo);
    }
  });
  insertMany(alerts);
}

function seedRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
