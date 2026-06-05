const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const dbPath = path.join(dataDir, 'insurance.db');
const db = new Database(dbPath);

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  region TEXT,
  branch TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS policies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  policy_no TEXT UNIQUE NOT NULL,
  holder_name TEXT NOT NULL,
  insurance_type TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  premium REAL,
  coverage REAL,
  branch TEXT,
  region TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  claim_no TEXT UNIQUE NOT NULL,
  policy_id INTEGER,
  policy_no TEXT,
  holder_name TEXT,
  insurance_type TEXT,
  accident_type TEXT,
  accident_date DATE,
  report_date DATE,
  status TEXT DEFAULT 'pending',
  claim_amount REAL DEFAULT 0,
  approved_amount REAL DEFAULT 0,
  assessor TEXT,
  handler TEXT,
  branch TEXT,
  region TEXT,
  close_date DATE,
  reject_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assessment_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  claim_id INTEGER,
  claim_no TEXT,
  assessor TEXT,
  assessment_date DATE,
  total_estimated REAL DEFAULT 0,
  total_actual REAL DEFAULT 0,
  status TEXT DEFAULT 'draft',
  deviation_flag INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assessment_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_id INTEGER,
  item_name TEXT,
  category TEXT,
  estimated_cost REAL,
  actual_cost REAL,
  deviation REAL,
  needs_review INTEGER DEFAULT 0,
  FOREIGN KEY (record_id) REFERENCES assessment_records(id)
);

CREATE TABLE IF NOT EXISTS early_warnings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  branch TEXT,
  region TEXT,
  insurance_type TEXT,
  accident_type TEXT,
  anomaly_days INTEGER DEFAULT 0,
  avg_anomaly_count REAL DEFAULT 0,
  historical_avg REAL DEFAULT 0,
  threshold REAL DEFAULT 0,
  trigger_date DATE,
  status TEXT DEFAULT 'active',
  assignee TEXT,
  level TEXT DEFAULT 'medium',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  warning_id INTEGER,
  title TEXT,
  content TEXT,
  type TEXT,
  is_read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

console.log('Tables created');

const hashedPassword = bcrypt.hashSync('123456', 10);
const insertUser = db.prepare(
  'INSERT OR REPLACE INTO users (username, password, name, role, region, branch) VALUES (?, ?, ?, ?, ?, ?)'
);

insertUser.run('admin', hashedPassword, '系统管理员', 'headquarters', null, null);
insertUser.run('region_manager', hashedPassword, '区域经理', 'region', '华东区', null);
insertUser.run('branch_user', hashedPassword, '支公司用户', 'branch', '华东区', '上海支公司');

const insuranceTypes = ['车险', '财产险', '人身险', '健康险', '责任险'];
const accidentTypes = ['交通事故', '火灾', '水灾', '意外伤害', '疾病', '盗窃', '自然灾害', '第三方责任'];
const handlers = ['张伟', '李娜', '王强', '赵敏', '刘洋', '陈静'];
const statuses = ['pending', 'assessing', 'approved', 'rejected', 'paid'];
const branches = ['上海支公司', '南京支公司', '杭州支公司', '广州支公司', '深圳支公司', '北京支公司'];
const regions = ['华东区', '华东区', '华东区', '华南区', '华南区', '华北区'];

const insertClaim = db.prepare(
  'INSERT OR REPLACE INTO claims (claim_no, policy_id, policy_no, holder_name, insurance_type, accident_type, accident_date, report_date, status, claim_amount, approved_amount, handler, branch, region, close_date, reject_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);

for (let i = 1; i <= 50; i++) {
  const insType = insuranceTypes[i % insuranceTypes.length];
  const accType = accidentTypes[i % accidentTypes.length];
  const status = statuses[i % statuses.length];
  const branchIdx = i % branches.length;
  const claimAmount = 1000 + i * 500;
  const isRejected = status === 'rejected';
  const isPaid = status === 'paid';
  
  const day = (i % 28) + 1;
  const closeDay = (i % 25) + 5;
  
  insertClaim.run(
    'C' + String(i).padStart(8, '0'),
    i,
    'P' + String(i).padStart(8, '0'),
    '投保人' + i,
    insType,
    accType,
    '2026-05-' + String(day).padStart(2, '0'),
    '2026-05-' + String(day).padStart(2, '0'),
    status,
    claimAmount,
    isPaid ? claimAmount * 0.8 : 0,
    handlers[i % handlers.length],
    branches[branchIdx],
    regions[branchIdx],
    (isPaid || isRejected) ? '2026-05-' + String(closeDay).padStart(2, '0') : null,
    isRejected ? '不在保障范围内' : null
  );
}

const insertWarning = db.prepare(
  'INSERT OR REPLACE INTO early_warnings (branch, region, insurance_type, accident_type, anomaly_days, avg_anomaly_count, historical_avg, threshold, trigger_date, status, assignee, level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);

for (let i = 1; i <= 15; i++) {
  const branchIdx = i % branches.length;
  const histAvg = 2 + (i % 5);
  insertWarning.run(
    branches[branchIdx],
    regions[branchIdx],
    insuranceTypes[i % insuranceTypes.length],
    accidentTypes[i % accidentTypes.length],
    3 + (i % 7),
    histAvg * (2 + (i % 3)),
    histAvg,
    histAvg * 2,
    '2026-06-' + String((i % 3) + 1).padStart(2, '0'),
    i % 3 === 0 ? 'active' : (i % 3 === 1 ? 'acknowledged' : 'resolved'),
    handlers[i % handlers.length],
    i % 3 === 0 ? 'high' : (i % 3 === 1 ? 'medium' : 'low')
  );
}

console.log('Database seeded successfully!');
console.log('Test users:');
console.log('  - admin / 123456 (headquarters)');
console.log('  - region_manager / 123456 (region)');
console.log('  - branch_user / 123456 (branch)');
db.close();
