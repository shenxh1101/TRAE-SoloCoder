const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db;

function initDB() {
  const dbPath = path.join(__dirname, 'data', 'lab.db');
  const dbDir = path.dirname(dbPath);
  
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  createTables();
  seedInitialData();

  return db;
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS experiment_tables (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      project TEXT NOT NULL,
      person TEXT NOT NULL,
      temp REAL DEFAULT 25.0,
      ph REAL DEFAULT 7.0,
      temp_threshold REAL DEFAULT 30.0,
      ph_min REAL DEFAULT 6.0,
      ph_max REAL DEFAULT 8.0,
      status TEXT DEFAULT 'normal',
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reagents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      remaining REAL DEFAULT 100,
      capacity REAL DEFAULT 100,
      unit TEXT DEFAULT '%',
      expiry TEXT,
      status TEXT DEFAULT 'normal',
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY,
      reagent_id TEXT,
      reagent_name TEXT,
      current_remaining REAL,
      suggested_amount TEXT,
      amount TEXT,
      applicant TEXT DEFAULT '系统自动生成',
      remark TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reagent_id) REFERENCES reagents(id)
    );

    CREATE TABLE IF NOT EXISTS instruments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      runtime INTEGER DEFAULT 0,
      maintenance_threshold INTEGER DEFAULT 2000,
      status TEXT DEFAULT 'normal',
      locked INTEGER DEFAULT 0,
      last_maintenance DATETIME,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS maintenance_workorders (
      id TEXT PRIMARY KEY,
      instrument_id TEXT,
      instrument_name TEXT,
      runtime INTEGER,
      maintenance_type TEXT DEFAULT '常规保养',
      scheduled_date TEXT,
      description TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (instrument_id) REFERENCES instruments(id)
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      resource_name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      project TEXT NOT NULL,
      person TEXT NOT NULL,
      priority INTEGER DEFAULT 2,
      conflict INTEGER DEFAULT 0,
      conflict_suggestion TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS waste_bins (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      level REAL DEFAULT 0,
      capacity REAL DEFAULT 100,
      status TEXT DEFAULT 'normal',
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transfer_workorders (
      id TEXT PRIMARY KEY,
      waste_id TEXT,
      waste_name TEXT,
      level REAL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (waste_id) REFERENCES waste_bins(id)
    );

    CREATE TABLE IF NOT EXISTS authorized_persons (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      employee_id TEXT UNIQUE,
      department TEXT,
      face_encoding TEXT,
      access_level INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS access_logs (
      id TEXT PRIMARY KEY,
      person_name TEXT,
      employee_id TEXT,
      access_point TEXT DEFAULT 'P3实验室',
      authorized INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      level TEXT DEFAULT 'warning',
      related_id TEXT,
      related_type TEXT,
      acknowledged INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function seedInitialData() {
  const tableCount = db.prepare('SELECT COUNT(*) as count FROM experiment_tables').get().count;
  
  if (tableCount === 0) {
    const insertTable = db.prepare(`
      INSERT INTO experiment_tables (id, name, project, person, temp, ph, temp_threshold, ph_min, ph_max, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const tables = [
      ['table1', '生物实验台-01', '基因测序项目', '张博士', 24.5, 7.2, 28.0, 6.5, 8.5, 'normal'],
      ['table2', '生物实验台-02', '疫苗研发', '李研究员', 26.8, 7.0, 28.0, 6.5, 8.5, 'normal'],
      ['table3', '化学实验台-01', '有机合成', '王工程师', 32.5, 5.8, 30.0, 6.0, 8.0, 'danger'],
      ['table4', '化学实验台-02', '材料分析', '赵技术员', 25.0, 7.5, 30.0, 6.0, 8.0, 'normal'],
      ['table5', '化学实验台-03', '药物研发', '陈博士', 29.0, 9.2, 30.0, 6.0, 8.0, 'danger'],
      ['table6', '综合实验台', '样品制备', '刘助理', 24.0, 7.0, 30.0, 6.0, 8.0, 'normal']
    ];

    tables.forEach(t => insertTable.run(...t));

    const insertReagent = db.prepare(`
      INSERT INTO reagents (id, name, remaining, capacity, unit, expiry, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const reagents = [
      ['reagent1', '乙醇(95%)', 85, 100, '%', '2025-06-15', 'normal'],
      ['reagent2', '氯化钠', 72, 100, '%', '2026-03-20', 'normal'],
      ['reagent3', 'PCR试剂盒', 15, 100, '%', '2024-08-10', 'warning'],
      ['reagent4', '琼脂糖', 18, 100, '%', '2025-12-01', 'warning'],
      ['reagent5', 'Tris-HCl', 45, 100, '%', '2025-09-30', 'normal'],
      ['reagent6', '溴化乙锭', 12, 100, '%', '2024-05-15', 'warning'],
      ['reagent7', '甲醇', 60, 100, '%', '2025-04-20', 'normal'],
      ['reagent8', '丙酮', 35, 100, '%', '2025-07-10', 'normal']
    ];

    reagents.forEach(r => insertReagent.run(...r));

    const insertInstrument = db.prepare(`
      INSERT INTO instruments (id, name, runtime, maintenance_threshold, status, locked)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const instruments = [
      ['inst1', 'PCR仪-01', 1850, 2000, 'warning', 0],
      ['inst2', '高速离心机', 1200, 1500, 'normal', 0],
      ['inst3', '紫外分光光度计', 2300, 2000, 'warning', 1],
      ['inst4', '凝胶成像系统', 850, 1500, 'normal', 0],
      ['inst5', '高效液相色谱', 1500, 2000, 'normal', 0]
    ];

    instruments.forEach(i => insertInstrument.run(...i));

    const insertSchedule = db.prepare(`
      INSERT INTO schedules (id, resource_name, start_time, end_time, project, person, priority, conflict, conflict_suggestion)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const schedules = [
      ['s1', '生物实验台-01', '08:00', '10:00', '基因测序项目', '张博士', 1, 0, null],
      ['s2', '生物实验台-01', '10:30', '12:00', '引物合成', '李研究员', 2, 0, null],
      ['s3', '生物实验台-02', '09:00', '11:00', '疫苗研发', '王工程师', 1, 0, null],
      ['s4', '化学实验台-01', '08:00', '12:00', '有机合成', '赵技术员', 1, 1, '建议将样品分析调整至13:00开始'],
      ['s5', '化学实验台-01', '11:00', '14:00', '样品分析', '陈博士', 2, 1, '建议将样品分析调整至13:00开始'],
      ['s6', '化学实验台-02', '13:00', '16:00', '材料测试', '刘助理', 2, 0, null],
      ['s7', 'PCR仪-01', '08:00', '11:00', 'PCR扩增', '张博士', 1, 0, null],
      ['s8', 'PCR仪-01', '14:00', '17:00', '定量PCR', '李研究员', 2, 0, null]
    ];

    schedules.forEach(s => insertSchedule.run(...s));

    const insertWaste = db.prepare(`
      INSERT INTO waste_bins (id, name, level, capacity, status)
      VALUES (?, ?, ?, ?, ?)
    `);

    const wastes = [
      ['waste1', '化学废液桶A', 92, 100, 'danger'],
      ['waste2', '化学废液桶B', 65, 100, 'normal'],
      ['waste3', '生物废弃物', 45, 100, 'normal'],
      ['waste4', '利器收纳盒', 78, 100, 'normal']
    ];

    wastes.forEach(w => insertWaste.run(...w));

    const insertPerson = db.prepare(`
      INSERT INTO authorized_persons (id, name, employee_id, department, access_level)
      VALUES (?, ?, ?, ?, ?)
    `);

    const persons = [
      ['p1', '张博士', 'EMP001', '分子生物学', 3],
      ['p2', '李研究员', 'EMP002', '疫苗研发', 3],
      ['p3', '王主任', 'EMP003', '实验室管理', 3],
      ['p4', '王工程师', 'EMP004', '有机化学', 2],
      ['p5', '赵技术员', 'EMP005', '分析测试', 2],
      ['p6', '陈博士', 'EMP006', '药物研发', 2]
    ];

    persons.forEach(p => insertPerson.run(...p));

    const insertAlert = db.prepare(`
      INSERT INTO alerts (id, type, title, description, level, related_id, related_type)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const alerts = [
      ['a1', 'temperature', '温度超阈值', '化学实验台-01温度32.5°C超过阈值30°C，安全柜已闭锁', 'danger', 'table3', 'experiment_table'],
      ['a2', 'ph', 'pH值异常', '化学实验台-03 pH值9.2超出正常范围', 'danger', 'table5', 'experiment_table'],
      ['a3', 'reagent', '试剂库存不足', 'PCR试剂盒、琼脂糖、溴化乙锭库存低于20%', 'warning', null, 'reagent']
    ];

    alerts.forEach(a => insertAlert.run(...a));
  }
}

function getDB() {
  if (!db) {
    initDB();
  }
  return db;
}

module.exports = { initDB, getDB };
