import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_DIR = path.join(__dirname, '..', 'data')
const DB_PATH = path.join(DB_DIR, 'app.db')

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true })
  }

  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  initTables(db)
  seedData(db)

  return db
}

function initTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      avatar TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS service_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT,
      description TEXT,
      basePrice REAL NOT NULL DEFAULT 0,
      duration INTEGER NOT NULL DEFAULT 60
    );

    CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar TEXT,
      phone TEXT NOT NULL,
      skillTags TEXT NOT NULL DEFAULT '[]',
      rating REAL NOT NULL DEFAULT 5.0,
      totalOrders INTEGER NOT NULL DEFAULT 0,
      serviceAreas TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'idle',
      lat REAL,
      lng REAL,
      currentOrders INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      serviceTypeId TEXT NOT NULL,
      staffId TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      address TEXT,
      lat REAL,
      lng REAL,
      qrCode TEXT,
      checkInTime TEXT,
      serviceStartTime TEXT,
      serviceEndTime TEXT,
      price REAL,
      notes TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (serviceTypeId) REFERENCES service_types(id),
      FOREIGN KEY (staffId) REFERENCES staff(id)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      orderId TEXT NOT NULL UNIQUE,
      userId TEXT NOT NULL,
      staffId TEXT NOT NULL,
      rating REAL NOT NULL,
      comment TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (orderId) REFERENCES orders(id),
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (staffId) REFERENCES staff(id)
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      staffId TEXT NOT NULL,
      dayOfWeek INTEGER NOT NULL,
      startTime TEXT NOT NULL,
      endTime TEXT NOT NULL,
      isAvailable INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (staffId) REFERENCES staff(id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      orderId TEXT NOT NULL,
      senderId TEXT,
      senderType TEXT NOT NULL DEFAULT 'system',
      content TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (orderId) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      discount REAL NOT NULL,
      minAmount REAL NOT NULL DEFAULT 0,
      validFrom TEXT NOT NULL,
      validUntil TEXT NOT NULL,
      isActive INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS user_coupons (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      orderId TEXT,
      amount REAL NOT NULL,
      reason TEXT,
      code TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (orderId) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      relatedId TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    );
  `)

  try {
    db.exec(`ALTER TABLE orders ADD COLUMN overtime_reminded INTEGER NOT NULL DEFAULT 0`)
  } catch {}
  try {
    db.exec(`ALTER TABLE orders ADD COLUMN coupon_compensated INTEGER NOT NULL DEFAULT 0`)
  } catch {}
  try {
    db.exec(`ALTER TABLE reviews ADD COLUMN photos TEXT NOT NULL DEFAULT '[]'`)
  } catch {}
}

function seedData(db: Database.Database) {
  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count
  if (userCount > 0) return

  const insertUser = db.prepare(
    `INSERT INTO users (id, name, phone, role, avatar) VALUES (?, ?, ?, ?, ?)`
  )

  insertUser.run('admin-001', '系统管理员', '13800000001', 'admin', '')
  insertUser.run('user-001', '张三', '13800000002', 'user', '')
  insertUser.run('user-002', '李四', '13800000003', 'user', '')
  insertUser.run('user-003', '王五', '13800000004', 'user', '')

  const insertServiceType = db.prepare(
    `INSERT INTO service_types (id, name, icon, description, basePrice, duration) VALUES (?, ?, ?, ?, ?, ?)`
  )

  insertServiceType.run('svc-001', '日常保洁', '🧹', '日常家庭清洁打扫服务', 120, 120)
  insertServiceType.run('svc-002', '家电清洗', '🧊', '空调、洗衣机等家电深度清洗', 200, 90)
  insertServiceType.run('svc-003', '月嫂育儿', '👶', '专业月嫂及育儿嫂服务', 680, 480)
  insertServiceType.run('svc-004', '深度清洁', '✨', '全屋深度清洁除菌服务', 350, 180)
  insertServiceType.run('svc-005', '搬家服务', '📦', '专业搬家打包运输服务', 500, 240)

  const insertStaff = db.prepare(
    `INSERT INTO staff (id, name, avatar, phone, skillTags, rating, totalOrders, serviceAreas, status, lat, lng, currentOrders) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )

  const staffData = [
    ['staff-001', '刘阿姨', '', '13900000001', JSON.stringify(['日常保洁', '深度清洁']), 4.8, 156, JSON.stringify(['朝阳区', '东城区']), 'idle', 39.9219, 116.4435, 0],
    ['staff-002', '王师傅', '', '13900000002', JSON.stringify(['家电清洗', '日常保洁']), 4.5, 98, JSON.stringify(['海淀区', '西城区']), 'idle', 39.9590, 116.2982, 0],
    ['staff-003', '赵月嫂', '', '13900000003', JSON.stringify(['月嫂育儿']), 5.0, 67, JSON.stringify(['朝阳区', '丰台区']), 'busy', 39.8585, 116.4874, 1],
    ['staff-004', '陈师傅', '', '13900000004', JSON.stringify(['搬家服务', '日常保洁']), 4.2, 210, JSON.stringify(['通州区', '朝阳区']), 'idle', 39.9020, 116.6020, 0],
    ['staff-005', '孙阿姨', '', '13900000005', JSON.stringify(['日常保洁', '深度清洁', '家电清洗']), 4.9, 189, JSON.stringify(['东城区', '西城区', '朝阳区']), 'idle', 39.9142, 116.4094, 0],
    ['staff-006', '周师傅', '', '13900000006', JSON.stringify(['搬家服务']), 3.8, 45, JSON.stringify(['大兴区', '丰台区']), 'idle', 39.7264, 116.3380, 0],
    ['staff-007', '吴阿姨', '', '13900000007', JSON.stringify(['月嫂育儿', '日常保洁']), 4.6, 112, JSON.stringify(['海淀区', '昌平区']), 'busy', 40.0000, 116.3000, 1],
    ['staff-008', '郑师傅', '', '13900000008', JSON.stringify(['深度清洁', '家电清洗']), 3.5, 23, JSON.stringify(['顺义区', '朝阳区']), 'idle', 40.1200, 116.6500, 0],
  ]

  for (const s of staffData) {
    insertStaff.run(...s)
  }

  const insertSchedule = db.prepare(
    `INSERT INTO schedules (id, staffId, dayOfWeek, startTime, endTime, isAvailable) VALUES (?, ?, ?, ?, ?, ?)`
  )

  const days = [1, 2, 3, 4, 5]
  const staffIds = ['staff-001', 'staff-002', 'staff-003', 'staff-004', 'staff-005', 'staff-006', 'staff-007', 'staff-008']

  for (const sid of staffIds) {
    for (const day of days) {
      insertSchedule.run(
        `sch-${sid}-${day}`,
        sid,
        day,
        '08:00',
        '18:00',
        1
      )
    }
    insertSchedule.run(`sch-${sid}-6`, sid, 6, '09:00', '15:00', 1)
    insertSchedule.run(`sch-${sid}-0`, sid, 0, '10:00', '14:00', 0)
  }

  const insertOrder = db.prepare(
    `INSERT INTO orders (id, userId, serviceTypeId, staffId, status, address, lat, lng, qrCode, checkInTime, serviceStartTime, serviceEndTime, price, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )

  const now = new Date()
  const today = now.toISOString().slice(0, 10)

  insertOrder.run(
    'order-001', 'user-001', 'svc-001', 'staff-003', 'in_service',
    '北京市朝阳区建国路88号', 39.9080, 116.4600, 'qr-001',
    `${today}T09:00:00`, `${today}T09:15:00`, null, 120, '三室两厅，重点打扫厨房', `${today}T08:30:00`
  )
  insertOrder.run(
    'order-002', 'user-002', 'svc-002', 'staff-007', 'checked_in',
    '北京市海淀区中关村大街1号', 39.9840, 116.3100, 'qr-002',
    `${today}T10:00:00`, null, null, 200, '清洗空调和洗衣机', `${today}T09:45:00`
  )
  insertOrder.run(
    'order-003', 'user-001', 'svc-004', 'staff-005', 'completed',
    '北京市东城区东四北大街200号', 39.9300, 116.4200, 'qr-003',
    `${today}T08:00:00`, `${today}T08:10:00`, `${today}T11:10:00`, 350, '全屋深度除菌', `${today}T07:30:00`
  )
  insertOrder.run(
    'order-004', 'user-003', 'svc-005', 'staff-004', 'completed',
    '北京市通州区新华大街50号', 39.9020, 116.6020, 'qr-004',
    `${today}T07:00:00`, `${today}T07:20:00`, `${today}T11:20:00`, 500, '两室一厅搬家到朝阳区', `${today}T06:30:00`
  )
  insertOrder.run(
    'order-005', 'user-002', 'svc-001', 'staff-001', 'completed',
    '北京市丰台区南三环西路16号', 39.8600, 116.3700, 'qr-005',
    `${today}T10:00:00`, `${today}T10:10:00`, `${today}T12:10:00`, 120, '日常保洁两室', `${today}T09:30:00`
  )
  insertOrder.run(
    'order-006', 'user-003', 'svc-003', null, 'pending',
    '北京市朝阳区望京街道10号', 39.9900, 116.4800, 'qr-006',
    null, null, null, 680, '需要月嫂，预产期下月', `${today}T11:00:00`
  )

  const insertReview = db.prepare(
    `INSERT INTO reviews (id, orderId, userId, staffId, rating, comment, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`
  )

  insertReview.run('rev-001', 'order-003', 'user-001', 'staff-005', 5.0, '孙阿姨打扫得非常仔细，全屋焕然一新！', `${today}T11:30:00`)
  insertReview.run('rev-002', 'order-004', 'user-003', 'staff-004', 4.0, '搬家服务不错，就是时间稍长了一些。', `${today}T12:00:00`)
  insertReview.run('rev-003', 'order-005', 'user-002', 'staff-001', 4.8, '刘阿姨打扫得很干净，准时到达！', `${today}T12:20:00`)

  const insertMessage = db.prepare(
    `INSERT INTO messages (id, orderId, senderId, senderType, content, createdAt) VALUES (?, ?, ?, ?, ?, ?)`
  )

  insertMessage.run('msg-001', 'order-001', 'user-001', 'user', '请问大概几点到？', `${today}T08:35:00`)
  insertMessage.run('msg-002', 'order-001', 'staff-003', 'staff', '大约9点到，已经在路上了', `${today}T08:36:00`)
  insertMessage.run('msg-003', 'order-001', 'system', 'system', '服务人员已签到', `${today}T09:00:00`)
  insertMessage.run('msg-004', 'order-001', 'system', 'system', '服务已开始', `${today}T09:15:00`)
  insertMessage.run('msg-005', 'order-002', 'user-002', 'user', '我在门口等你', `${today}T09:50:00`)
  insertMessage.run('msg-006', 'order-002', 'staff-007', 'staff', '好的，马上到', `${today}T09:51:00`)

  const insertCoupon = db.prepare(
    `INSERT INTO coupons (id, code, discount, minAmount, validFrom, validUntil, isActive) VALUES (?, ?, ?, ?, ?, ?, ?)`
  )

  insertCoupon.run('coupon-001', 'NEWUSER20', 20, 100, '2025-01-01', '2026-12-31', 1)
  insertCoupon.run('coupon-002', 'SPRING50', 50, 300, '2025-03-01', '2025-06-30', 1)
}
