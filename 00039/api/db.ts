import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const uploadsDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const dbPath = path.join(__dirname, 'data.db')
const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin','purchaser','supplier','inspector','warehouse')),
    name TEXT NOT NULL,
    email TEXT
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact TEXT,
    phone TEXT,
    email TEXT,
    address TEXT
  );

  CREATE TABLE IF NOT EXISTS materials (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    unit TEXT NOT NULL,
    specification TEXT
  );

  CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY,
    order_no TEXT NOT NULL UNIQUE,
    supplier_id TEXT NOT NULL REFERENCES suppliers(id),
    created_by TEXT NOT NULL REFERENCES users(id),
    budget_amount REAL NOT NULL,
    total_amount REAL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES purchase_orders(id),
    material_id TEXT NOT NULL REFERENCES materials(id),
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    suggested_price REAL DEFAULT 0,
    quoted_price REAL DEFAULT 0,
    historical_avg_price REAL DEFAULT 0,
    market_price REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS contracts (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES purchase_orders(id),
    buyer_signature TEXT,
    supplier_signature TEXT,
    buyer_signed_at TEXT,
    supplier_signed_at TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
  );

  CREATE TABLE IF NOT EXISTS inspection_reports (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES purchase_orders(id),
    batch_no TEXT NOT NULL,
    material_id TEXT NOT NULL REFERENCES materials(id),
    inspector TEXT NOT NULL REFERENCES users(id),
    result TEXT NOT NULL CHECK(result IN ('pass','fail')),
    report_file_path TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS inspection_items (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES inspection_reports(id),
    name TEXT NOT NULL,
    standard TEXT NOT NULL,
    actual TEXT NOT NULL,
    passed INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id TEXT PRIMARY KEY,
    material_id TEXT NOT NULL REFERENCES materials(id),
    warehouse TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 0,
    last_in_at TEXT
  );

  CREATE TABLE IF NOT EXISTS returns (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES purchase_orders(id),
    report_id TEXT NOT NULL REFERENCES inspection_reports(id),
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    recipient_role TEXT NOT NULL,
    recipient_id TEXT REFERENCES users(id),
    related_order_id TEXT REFERENCES purchase_orders(id),
    attachment_path TEXT,
    read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS monthly_reports (
    id TEXT PRIMARY KEY,
    month TEXT NOT NULL UNIQUE,
    total_purchase REAL NOT NULL DEFAULT 0,
    total_return REAL NOT NULL DEFAULT 0,
    order_count INTEGER NOT NULL DEFAULT 0,
    return_count INTEGER NOT NULL DEFAULT 0,
    generated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS price_history (
    id TEXT PRIMARY KEY,
    material_id TEXT NOT NULL REFERENCES materials(id),
    price REAL NOT NULL,
    source TEXT NOT NULL,
    recorded_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_orders_status ON purchase_orders(status);
  CREATE INDEX IF NOT EXISTS idx_orders_supplier ON purchase_orders(supplier_id);
  CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id, read);
  CREATE INDEX IF NOT EXISTS idx_price_history_material ON price_history(material_id, recorded_at);
  CREATE INDEX IF NOT EXISTS idx_inventory_material ON inventory(material_id);
`)

function seed() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }
  if (userCount.count > 0) return

  const now = new Date().toISOString()

  const insertUser = db.prepare(
    `INSERT INTO users (id, username, password, role, name, email) VALUES (?, ?, ?, ?, ?, ?)`
  )

  const users = [
    { id: uuidv4(), username: 'admin', password: '123456', role: 'admin', name: '系统管理员', email: 'admin@zhmfg.com' },
    { id: uuidv4(), username: 'purchaser1', password: '123456', role: 'purchaser', name: '张伟', email: 'zhangwei@zhmfg.com' },
    { id: uuidv4(), username: 'purchaser2', password: '123456', role: 'purchaser', name: '李娜', email: 'lina@zhmfg.com' },
    { id: uuidv4(), username: 'supplier1', password: '123456', role: 'supplier', name: '王强（华鑫钢铁）', email: 'wangqiang@huaxin.com' },
    { id: uuidv4(), username: 'supplier2', password: '123456', role: 'supplier', name: '赵敏（盛达化工）', email: 'zhaomin@shengda.com' },
    { id: uuidv4(), username: 'inspector1', password: '123456', role: 'inspector', name: '陈刚', email: 'chengang@zhmfg.com' },
    { id: uuidv4(), username: 'inspector2', password: '123456', role: 'inspector', name: '刘芳', email: 'liufang@zhmfg.com' },
    { id: uuidv4(), username: 'warehouse1', password: '123456', role: 'warehouse', name: '周明', email: 'zhouming@zhmfg.com' },
    { id: uuidv4(), username: 'warehouse2', password: '123456', role: 'warehouse', name: '吴静', email: 'wujing@zhmfg.com' },
  ]
  for (const u of users) {
    insertUser.run(u.id, u.username, u.password, u.role, u.name, u.email)
  }

  const adminId = users[0].id
  const purchaser1Id = users[1].id
  const purchaser2Id = users[2].id
  const supplier1UserId = users[3].id
  const supplier2UserId = users[4].id
  const inspector1Id = users[5].id
  const inspector2Id = users[6].id

  const insertSupplier = db.prepare(
    `INSERT INTO suppliers (id, name, contact, phone, email, address) VALUES (?, ?, ?, ?, ?, ?)`
  )

  const suppliers = [
    { id: uuidv4(), name: '华鑫钢铁集团', contact: '王强', phone: '021-55551001', email: 'sales@huaxin.com', address: '上海市宝山区工业园区168号' },
    { id: uuidv4(), name: '盛达化工有限公司', contact: '赵敏', phone: '0571-55552002', email: 'sales@shengda.com', address: '杭州市萧山区化工园88号' },
    { id: uuidv4(), name: '恒力机械制造', contact: '孙浩', phone: '0512-55553003', email: 'sales@hengli.com', address: '苏州市吴中区机械大道56号' },
    { id: uuidv4(), name: '鼎盛电子科技', contact: '钱磊', phone: '0755-55554004', email: 'sales@dingsheng.com', address: '深圳市南山区科技园200号' },
    { id: uuidv4(), name: '中联建材集团', contact: '周涛', phone: '025-55555005', email: 'sales@zhonglian.com', address: '南京市江宁区建材路99号' },
  ]
  for (const s of suppliers) {
    insertSupplier.run(s.id, s.name, s.contact, s.phone, s.email, s.address)
  }

  const insertMaterial = db.prepare(
    `INSERT INTO materials (id, name, category, unit, specification) VALUES (?, ?, ?, ?, ?)`
  )

  const materials = [
    { id: uuidv4(), name: 'Q235B热轧钢板', category: '钢材', unit: '吨', specification: '6mm×1500mm×6000mm' },
    { id: uuidv4(), name: '304不锈钢板', category: '钢材', unit: '吨', specification: '3mm×1220mm×2440mm' },
    { id: uuidv4(), name: '环氧树脂E-44', category: '化工', unit: '桶', specification: '200kg/桶' },
    { id: uuidv4(), name: '工业酒精(乙醇)', category: '化工', unit: '桶', specification: '160kg/桶 99.5%' },
    { id: uuidv4(), name: '6205-2RS深沟球轴承', category: '机械', unit: '个', specification: '25×52×15mm' },
    { id: uuidv4(), name: 'HY2-8行程开关', category: '电子', unit: '个', specification: 'AC380V 5A' },
    { id: uuidv4(), name: 'YJV3×4电力电缆', category: '电子', unit: '米', specification: '450/750V 铜芯' },
    { id: uuidv4(), name: '42.5普通硅酸盐水泥', category: '建材', unit: '吨', specification: 'P.O 42.5 袋装50kg' },
    { id: uuidv4(), name: 'HRB400螺纹钢', category: '钢材', unit: '吨', specification: 'Φ12mm 定尺9m' },
    { id: uuidv4(), name: '丙纶短纤维', category: '建材', unit: '吨', specification: '6dtex×60mm' },
  ]
  for (const m of materials) {
    insertMaterial.run(m.id, m.name, m.category, m.unit, m.specification)
  }

  const insertPriceHistory = db.prepare(
    `INSERT INTO price_history (id, material_id, price, source, recorded_at) VALUES (?, ?, ?, ?, ?)`
  )

  const basePrices: Record<number, number> = {
    0: 4200, 1: 16500, 2: 280, 3: 680, 4: 12, 5: 35, 6: 8.5, 7: 480, 8: 4100, 9: 6200
  }

  for (let mi = 0; mi < materials.length; mi++) {
    const base = basePrices[mi]
    for (let month = 5; month >= 0; month--) {
      const date = new Date(2026, 5 - month, 1)
      const fluctuation = 1 + (Math.random() - 0.5) * 0.1
      const price = Math.round(base * fluctuation * 100) / 100
      insertPriceHistory.run(
        uuidv4(),
        materials[mi].id,
        price,
        month === 0 ? 'market' : 'historical',
        date.toISOString()
      )
    }
  }

  const insertOrder = db.prepare(
    `INSERT INTO purchase_orders (id, order_no, supplier_id, created_by, budget_amount, total_amount, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  const insertOrderItem = db.prepare(
    `INSERT INTO order_items (id, order_id, material_id, quantity, unit, suggested_price, quoted_price, historical_avg_price, market_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )

  const statuses: Array<string> = [
    'draft', 'pending_quote', 'pending_quote', 'quoted', 'quoted',
    'locked', 'approved', 'contracted', 'shipping', 'inspecting'
  ]

  const orderIds: string[] = []

  for (let i = 0; i < 10; i++) {
    const orderId = uuidv4()
    orderIds.push(orderId)
    const supplierIdx = i % 5
    const creatorIdx = i % 2
    const status = statuses[i]
    const orderNo = `PO202606${String(i + 1).padStart(3, '0')}`

    const item1Idx = (i * 2) % 10
    const item2Idx = (i * 2 + 1) % 10

    const ph1 = db.prepare(
      `SELECT AVG(price) as avgPrice FROM price_history WHERE material_id = ?`
    ).get(materials[item1Idx].id) as { avgPrice: number }
    const ph2 = db.prepare(
      `SELECT AVG(price) as avgPrice FROM price_history WHERE material_id = ?`
    ).get(materials[item2Idx].id) as { avgPrice: number }

    const mp1 = db.prepare(
      `SELECT price FROM price_history WHERE material_id = ? ORDER BY recorded_at DESC LIMIT 1`
    ).get(materials[item1Idx].id) as { price: number }
    const mp2 = db.prepare(
      `SELECT price FROM price_history WHERE material_id = ? ORDER BY recorded_at DESC LIMIT 1`
    ).get(materials[item2Idx].id) as { price: number }

    const histAvg1 = Math.round(ph1.avgPrice * 100) / 100
    const histAvg2 = Math.round(ph2.avgPrice * 100) / 100
    const marketP1 = mp1.price
    const marketP2 = mp2.price
    const suggested1 = Math.round((histAvg1 * 0.7 + marketP1 * 0.3) * 100) / 100
    const suggested2 = Math.round((histAvg2 * 0.7 + marketP2 * 0.3) * 100) / 100

    const qty1 = [10, 5, 20, 50, 100, 8, 200, 15, 12, 3][i]
    const qty2 = [5, 20, 8, 100, 30, 15, 50, 25, 6, 10][i]

    const quoted1 = status === 'draft' || status === 'pending_quote' ? 0 : Math.round(suggested1 * (1 + (Math.random() - 0.3) * 0.15) * 100) / 100
    const quoted2 = status === 'draft' || status === 'pending_quote' ? 0 : Math.round(suggested2 * (1 + (Math.random() - 0.3) * 0.15) * 100) / 100

    const itemTotal = suggested1 * qty1 + suggested2 * qty2
    const budgetAmount = Math.round(itemTotal * 1.1 * 100) / 100
    const totalAmount = quoted1 * qty1 + quoted2 * qty2

    const createdDate = new Date(2026, 5, i + 1)
    const updatedDate = new Date(2026, 5, i + 1)

    insertOrder.run(
      orderId, orderNo, suppliers[supplierIdx].id,
      creatorIdx === 0 ? purchaser1Id : purchaser2Id,
      budgetAmount, Math.round(totalAmount * 100) / 100, status,
      createdDate.toISOString(), updatedDate.toISOString()
    )

    insertOrderItem.run(
      uuidv4(), orderId, materials[item1Idx].id, qty1, materials[item1Idx].unit,
      suggested1, quoted1, histAvg1, marketP1
    )
    insertOrderItem.run(
      uuidv4(), orderId, materials[item2Idx].id, qty2, materials[item2Idx].unit,
      suggested2, quoted2, histAvg2, marketP2
    )
  }

  const insertContract = db.prepare(
    `INSERT INTO contracts (id, order_id, buyer_signature, supplier_signature, buyer_signed_at, supplier_signed_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)`
  )

  for (let i = 6; i < 10; i++) {
    const contractStatus = i < 8 ? 'partial_signed' : 'signed'
    const buyerSig = i >= 7 ? 'data:image/png;base64,c2lnbmF0dXJlX2RlbW8=' : null
    const supplierSig = i >= 8 ? 'data:image/png;base64,c2lnbmF0dXJlX2RlbW8=' : null
    const buyerSignedAt = buyerSig ? now : null
    const supplierSignedAt = supplierSig ? now : null

    insertContract.run(
      uuidv4(), orderIds[i], buyerSig, supplierSig, buyerSignedAt, supplierSignedAt, contractStatus
    )
  }

  const insertInspection = db.prepare(
    `INSERT INTO inspection_reports (id, order_id, batch_no, material_id, inspector, result, report_file_path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
  const insertInspectionItem = db.prepare(
    `INSERT INTO inspection_items (id, report_id, name, standard, actual, passed) VALUES (?, ?, ?, ?, ?, ?)`
  )

  const item1Idx8 = (8 * 2) % 10
  const item2Idx8 = (8 * 2 + 1) % 10
  const item1Idx9 = (9 * 2) % 10
  const item2Idx9 = (9 * 2 + 1) % 10

  const report1Id = uuidv4()
  insertInspection.run(
    report1Id, orderIds[8], `BATCH2026060801`, materials[item1Idx8].id,
    inspector1Id, 'pass', `/uploads/report_${report1Id}.pdf`, now
  )
  insertInspectionItem.run(uuidv4(), report1Id, '外观检查', '表面无裂纹、气泡', '表面光滑无缺陷', 1)
  insertInspectionItem.run(uuidv4(), report1Id, '尺寸测量', '6±0.2mm', '6.05mm', 1)
  insertInspectionItem.run(uuidv4(), report1Id, '硬度测试', 'HB120-180', 'HB145', 1)

  const report2Id = uuidv4()
  insertInspection.run(
    report2Id, orderIds[9], `BATCH2026060901`, materials[item1Idx9].id,
    inspector2Id, 'fail', `/uploads/report_${report2Id}.pdf`, now
  )
  insertInspectionItem.run(uuidv4(), report2Id, '外观检查', '表面无裂纹、气泡', '发现2处裂纹', 0)
  insertInspectionItem.run(uuidv4(), report2Id, '尺寸测量', 'Φ12±0.3mm', 'Φ11.5mm', 0)
  insertInspectionItem.run(uuidv4(), report2Id, '抗拉强度', '≥540MPa', '510MPa', 0)

  const insertReturn = db.prepare(
    `INSERT INTO returns (id, order_id, report_id, reason, status, created_at) VALUES (?, ?, ?, ?, ?, ?)`
  )
  insertReturn.run(
    uuidv4(), orderIds[9], report2Id, '质检不合格：外观裂纹、尺寸偏差、抗拉强度不达标', 'pending', now
  )

  const insertInventory = db.prepare(
    `INSERT INTO inventory (id, material_id, warehouse, quantity, last_in_at) VALUES (?, ?, ?, ?, ?)`
  )

  const warehouses = ['A区主仓库', 'B区化工仓', 'C区电子仓']
  for (let i = 0; i < materials.length; i++) {
    const wh = i < 3 ? warehouses[0] : i < 5 ? warehouses[1] : i < 7 ? warehouses[2] : warehouses[0]
    const qty = [50, 20, 15, 30, 200, 500, 1000, 80, 45, 10][i]
    insertInventory.run(uuidv4(), materials[i].id, wh, qty, now)
  }

  const insertMessage = db.prepare(
    `INSERT INTO messages (id, type, title, content, recipient_role, recipient_id, related_order_id, attachment_path, read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )

  insertMessage.run(
    uuidv4(), 'order_change', '新采购订单待报价',
    '采购订单PO202606002已创建，请尽快确认报价',
    'supplier', supplier1UserId, orderIds[1], null, 0, now
  )
  insertMessage.run(
    uuidv4(), 'budget_alert', '订单报价超预算',
    '采购订单PO202606006供应商修改报价后超出预算5%，已自动锁定，请审批',
    'purchaser', purchaser1Id, orderIds[5], null, 0, now
  )
  insertMessage.run(
    uuidv4(), 'quality_result', '质检不合格通知',
    '批次BATCH2026060901质检结果为不合格，已自动发起退货流程',
    'supplier', supplier2UserId, orderIds[9], null, 0, now
  )
  insertMessage.run(
    uuidv4(), 'return_notice', '退货通知',
    '采购订单PO202606010因质检不合格已发起退货，请安排补发',
    'supplier', supplier2UserId, orderIds[9], null, 0, now
  )
  insertMessage.run(
    uuidv4(), 'quality_result', '质检合格通知',
    '批次BATCH2026060801质检结果为合格，可安排入库',
    'warehouse', users[7].id, orderIds[8], null, 0, now
  )

  const insertMonthlyReport = db.prepare(
    `INSERT INTO monthly_reports (id, month, total_purchase, total_return, order_count, return_count, generated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
  )

  for (let m = 0; m < 3; m++) {
    const monthStr = `2026-${String(m + 4).padStart(2, '0')}`
    insertMonthlyReport.run(
      uuidv4(), monthStr,
      Math.round((500000 + m * 100000 + Math.random() * 50000) * 100) / 100,
      Math.round((10000 + m * 5000 + Math.random() * 3000) * 100) / 100,
      8 + m * 2,
      m,
      new Date(2026, m + 4, 1).toISOString()
    )
  }
}

seed()

export default db
