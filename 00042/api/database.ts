import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'

const db = new Database(':memory:')

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('nurse','doctor','director','cashier','admin')),
    department TEXT
  );

  CREATE TABLE rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('rescue','emergency','general')),
    capacity INTEGER NOT NULL DEFAULT 1,
    current_load INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available','busy','full','maintenance'))
  );

  CREATE TABLE doctors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    specialty TEXT NOT NULL,
    room_id TEXT,
    status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available','busy','off'))
  );

  CREATE TABLE equipment (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('lab','imaging','other')),
    room_id TEXT,
    status TEXT NOT NULL DEFAULT 'idle' CHECK(status IN ('idle','in_use','maintenance'))
  );

  CREATE TABLE beds (
    id TEXT PRIMARY KEY,
    number TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'empty' CHECK(status IN ('empty','occupied')),
    patient_id TEXT,
    occupied_at DATETIME
  );

  CREATE TABLE patients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    id_card TEXT NOT NULL,
    chief_complaint TEXT NOT NULL,
    temperature REAL,
    heart_rate INTEGER,
    respiratory_rate INTEGER,
    systolic_bp INTEGER,
    diastolic_bp INTEGER,
    blood_oxygen INTEGER,
    allergy_history TEXT,
    triage_level TEXT CHECK(triage_level IN ('red','yellow','green')),
    status TEXT NOT NULL DEFAULT 'waiting' CHECK(status IN ('waiting','treating','examining','observation','transfer','discharged')),
    assigned_room_id TEXT,
    assigned_doctor_id TEXT,
    created_by TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE examinations (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('lab','imaging')),
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ordered' CHECK(status IN ('ordered','in_progress','completed')),
    result TEXT,
    result_value REAL,
    critical_value INTEGER NOT NULL DEFAULT 0,
    ordered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
  );

  CREATE TABLE observations (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    bed_id TEXT NOT NULL,
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    bed_fee REAL NOT NULL DEFAULT 0
  );

  CREATE TABLE billing_items (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('drug','examination','observation','other')),
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE settlements (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    total_amount REAL NOT NULL,
    payment_method TEXT NOT NULL CHECK(payment_method IN ('cash','insurance','credit_card')),
    insurance_covered REAL NOT NULL DEFAULT 0,
    self_paid REAL NOT NULL,
    settled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    invoice_number TEXT NOT NULL UNIQUE
  );

  CREATE TABLE alerts (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK(type IN ('timeout','critical_value','bed_capacity','adjustment')),
    level TEXT NOT NULL CHECK(level IN ('warning','urgent','critical')),
    message TEXT NOT NULL,
    patient_id TEXT,
    acknowledged INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE adjustments (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    original_room_id TEXT,
    new_room_id TEXT,
    original_doctor_id TEXT,
    new_doctor_id TEXT,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
    approved_by TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`)

const seedUsers = db.prepare(`
  INSERT INTO users (id, username, password, name, role, department) VALUES (?, ?, ?, ?, ?, ?)
`)

const seedUsersData = [
  [uuidv4(), 'nurse01', '123456', '张护士', 'nurse', '分诊台'],
  [uuidv4(), 'doctor01', '123456', '李医生', 'doctor', '急诊科'],
  [uuidv4(), 'director01', '123456', '王主任', 'director', '急诊科'],
  [uuidv4(), 'cashier01', '123456', '赵收费', 'cashier', '收费处'],
  [uuidv4(), 'admin01', '123456', '陈管理', 'admin', '信息科'],
]

const insertUsers = db.transaction((users) => {
  for (const u of users) seedUsers.run(...u)
})
insertUsers(seedUsersData)

const roomIds = [uuidv4(), uuidv4(), uuidv4(), uuidv4(), uuidv4(), uuidv4(), uuidv4(), uuidv4()]
const seedRoomsData = [
  [roomIds[0], '抢救室1', 'rescue', 2, 0, 'available'],
  [roomIds[1], '抢救室2', 'rescue', 2, 1, 'busy'],
  [roomIds[2], '急诊室1', 'emergency', 3, 0, 'available'],
  [roomIds[3], '急诊室2', 'emergency', 3, 2, 'busy'],
  [roomIds[4], '急诊室3', 'emergency', 3, 1, 'available'],
  [roomIds[5], '急诊室4', 'emergency', 3, 3, 'full'],
  [roomIds[6], '普通诊室1', 'general', 4, 1, 'available'],
  [roomIds[7], '普通诊室2', 'general', 4, 0, 'available'],
]

const seedRooms = db.prepare(`
  INSERT INTO rooms (id, name, type, capacity, current_load, status) VALUES (?, ?, ?, ?, ?, ?)
`)
const insertRooms = db.transaction((rooms) => {
  for (const r of rooms) seedRooms.run(...r)
})
insertRooms(seedRoomsData)

const doctorIds = [uuidv4(), uuidv4(), uuidv4(), uuidv4(), uuidv4(), uuidv4(), uuidv4(), uuidv4()]
const seedDoctorsData = [
  [doctorIds[0], '李医生', '主任医师', '急诊医学', roomIds[0], 'available'],
  [doctorIds[1], '周医生', '副主任医师', '心内科', roomIds[1], 'busy'],
  [doctorIds[2], '吴医生', '主治医师', '创伤外科', roomIds[2], 'available'],
  [doctorIds[3], '郑医生', '主治医师', '呼吸内科', roomIds[3], 'available'],
  [doctorIds[4], '孙医生', '住院医师', '急诊医学', roomIds[4], 'busy'],
  [doctorIds[5], '钱医生', '住院医师', '骨科', roomIds[6], 'available'],
  [doctorIds[6], '冯医生', '主治医师', '普外科', roomIds[6], 'available'],
  [doctorIds[7], '陈医生', '副主任医师', '神经内科', roomIds[7], 'off'],
]

const seedDoctors = db.prepare(`
  INSERT INTO doctors (id, name, title, specialty, room_id, status) VALUES (?, ?, ?, ?, ?, ?)
`)
const insertDoctors = db.transaction((doctors) => {
  for (const d of doctors) seedDoctors.run(...d)
})
insertDoctors(seedDoctorsData)

const equipmentIds = [uuidv4(), uuidv4(), uuidv4(), uuidv4(), uuidv4(), uuidv4()]
const seedEquipmentData = [
  [equipmentIds[0], '血气分析仪', 'lab', roomIds[0], 'idle'],
  [equipmentIds[1], 'CT扫描仪', 'imaging', roomIds[2], 'in_use'],
  [equipmentIds[2], 'X光机', 'imaging', roomIds[3], 'idle'],
  [equipmentIds[3], '超声仪', 'imaging', roomIds[4], 'maintenance'],
  [equipmentIds[4], '心电图机', 'other', roomIds[0], 'idle'],
  [equipmentIds[5], '生化分析仪', 'lab', roomIds[2], 'idle'],
]

const seedEquipment = db.prepare(`
  INSERT INTO equipment (id, name, type, room_id, status) VALUES (?, ?, ?, ?, ?)
`)
const insertEquipment = db.transaction((items) => {
  for (const e of items) seedEquipment.run(...e)
})
insertEquipment(seedEquipmentData)

const bedIds = Array.from({ length: 10 }, () => uuidv4())
const seedBedsData = [
  [bedIds[0], 'A-01', 'empty', null, null],
  [bedIds[1], 'A-02', 'occupied', null, new Date().toISOString()],
  [bedIds[2], 'A-03', 'empty', null, null],
  [bedIds[3], 'B-01', 'occupied', null, new Date().toISOString()],
  [bedIds[4], 'B-02', 'empty', null, null],
  [bedIds[5], 'B-03', 'empty', null, null],
  [bedIds[6], 'C-01', 'occupied', null, new Date().toISOString()],
  [bedIds[7], 'C-02', 'empty', null, null],
  [bedIds[8], 'C-03', 'empty', null, null],
  [bedIds[9], 'C-04', 'empty', null, null],
]

const seedBeds = db.prepare(`
  INSERT INTO beds (id, number, status, patient_id, occupied_at) VALUES (?, ?, ?, ?, ?)
`)
const insertBeds = db.transaction((beds) => {
  for (const b of beds) seedBeds.run(...b)
})
insertBeds(seedBedsData)

const patientIds = [uuidv4(), uuidv4(), uuidv4(), uuidv4(), uuidv4(), uuidv4()]
const now = new Date().toISOString()
const seedPatientsData = [
  [patientIds[0], '王建国', '110101199001011234', '心脏骤停', 36.5, 130, 28, 85, 55, 82, null, 'red', 'treating', roomIds[0], doctorIds[0], 'nurse01', now, now],
  [patientIds[1], '刘芳', '110101198505052345', '胸痛伴呼吸困难', 38.8, 115, 26, 95, 60, 90, '青霉素', 'yellow', 'examining', roomIds[2], doctorIds[2], 'nurse01', now, now],
  [patientIds[2], '赵明', '110101197803033456', '右腕骨折', 36.8, 78, 18, 120, 80, 98, null, 'yellow', 'treating', roomIds[3], doctorIds[5], 'nurse01', now, now],
  [patientIds[3], '孙丽华', '110101196512124567', '感冒发烧三天', 38.2, 88, 20, 110, 70, 97, null, 'green', 'waiting', roomIds[6], doctorIds[6], 'nurse01', now, now],
  [patientIds[4], '钱伟', '110101199507075678', '剧烈腹痛', 39.0, 100, 24, 130, 85, 95, '磺胺类', 'yellow', 'treating', roomIds[4], doctorIds[4], 'nurse01', now, now],
  [patientIds[5], '周小燕', '110101200009096789', '轻微外伤', 36.6, 72, 16, 115, 75, 99, null, 'green', 'observation', roomIds[7], doctorIds[6], 'nurse01', now, now],
]

const seedPatients = db.prepare(`
  INSERT INTO patients (id, name, id_card, chief_complaint, temperature, heart_rate, respiratory_rate, systolic_bp, diastolic_bp, blood_oxygen, allergy_history, triage_level, status, assigned_room_id, assigned_doctor_id, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)
const insertPatients = db.transaction((patients) => {
  for (const p of patients) seedPatients.run(...p)
})
insertPatients(seedPatientsData)

const examIds = [uuidv4(), uuidv4(), uuidv4()]
const seedExamsData = [
  [examIds[0], patientIds[0], 'lab', '血气分析', 'completed', 'pH 7.25, PaCO2 55mmHg', 7.25, 1, now, now],
  [examIds[1], patientIds[1], 'imaging', '胸部CT', 'in_progress', null, null, 0, now, null],
  [examIds[2], patientIds[4], 'lab', '血常规', 'ordered', null, null, 0, now, null],
]

const seedExams = db.prepare(`
  INSERT INTO examinations (id, patient_id, type, name, status, result, result_value, critical_value, ordered_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)
const insertExams = db.transaction((exams) => {
  for (const e of exams) seedExams.run(...e)
})
insertExams(seedExamsData)

const obsIds = [uuidv4(), uuidv4()]
const seedObsData = [
  [obsIds[0], patientIds[5], bedIds[3], now, null, 50],
  [obsIds[1], patientIds[2], bedIds[1], new Date(Date.now() - 3600000).toISOString(), now, 50],
]

const seedObs = db.prepare(`
  INSERT INTO observations (id, patient_id, bed_id, started_at, ended_at, bed_fee) VALUES (?, ?, ?, ?, ?, ?)
`)
const insertObs = db.transaction((obs) => {
  for (const o of obs) seedObs.run(...o)
})
insertObs(seedObsData)

const billingIds = [uuidv4(), uuidv4(), uuidv4(), uuidv4(), uuidv4()]
const seedBillingData = [
  [billingIds[0], patientIds[0], 'drug', '肾上腺素注射液', 25.0, now],
  [billingIds[1], patientIds[0], 'examination', '血气分析', 180.0, now],
  [billingIds[2], patientIds[1], 'examination', '胸部CT', 580.0, now],
  [billingIds[3], patientIds[5], 'observation', '留观床位费', 50.0, now],
  [billingIds[4], patientIds[2], 'drug', '止痛药', 35.0, now],
]

const seedBilling = db.prepare(`
  INSERT INTO billing_items (id, patient_id, category, name, amount, created_at) VALUES (?, ?, ?, ?, ?, ?)
`)
const insertBilling = db.transaction((items) => {
  for (const b of items) seedBilling.run(...b)
})
insertBilling(seedBillingData)

const alertIds = [uuidv4(), uuidv4(), uuidv4()]
const seedAlertsData = [
  [alertIds[0], 'critical_value', 'critical', '患者王建国血气分析结果异常：pH 7.25，低于正常值', patientIds[0], 0, now],
  [alertIds[1], 'timeout', 'warning', '患者刘芳等待检查结果超过30分钟', patientIds[1], 0, now],
  [alertIds[2], 'bed_capacity', 'urgent', '急诊室4号床位已满', null, 0, now],
]

const seedAlerts = db.prepare(`
  INSERT INTO alerts (id, type, level, message, patient_id, acknowledged, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)
`)
const insertAlerts = db.transaction((alerts) => {
  for (const a of alerts) seedAlerts.run(...a)
})
insertAlerts(seedAlertsData)

const adjIds = [uuidv4()]
const seedAdjData = [
  [adjIds[0], patientIds[4], roomIds[4], roomIds[0], doctorIds[4], doctorIds[0], '患者病情加重需要转抢救室', 'pending', null, now],
]

const seedAdj = db.prepare(`
  INSERT INTO adjustments (id, patient_id, original_room_id, new_room_id, original_doctor_id, new_doctor_id, reason, status, approved_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)
const insertAdj = db.transaction((adjs) => {
  for (const a of adjs) seedAdj.run(...a)
})
insertAdj(seedAdjData)

db.prepare(`UPDATE beds SET patient_id = ? WHERE id = ?`).run(patientIds[5], bedIds[3])
db.prepare(`UPDATE beds SET patient_id = ? WHERE id = ?`).run(patientIds[2], bedIds[1])
db.prepare(`UPDATE beds SET patient_id = ? WHERE id = ?`).run(patientIds[0], bedIds[6])

export default db
