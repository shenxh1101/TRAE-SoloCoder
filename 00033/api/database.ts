import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dataDir = path.resolve(__dirname, '..', 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const dbPath = path.join(dataDir, 'seismo.db')
const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS stations (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    elevation REAL DEFAULT 0,
    network TEXT DEFAULT 'CN',
    installed_at TEXT DEFAULT (datetime('now')),
    status TEXT DEFAULT 'active'
  );

  CREATE TABLE IF NOT EXISTS waveforms (
    id TEXT PRIMARY KEY,
    station_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL,
    format TEXT DEFAULT 'SAC',
    sample_rate REAL DEFAULT 100.0,
    duration REAL DEFAULT 0,
    channels TEXT DEFAULT 'BHZ',
    status TEXT DEFAULT 'uploaded',
    snr REAL,
    uploaded_at TEXT DEFAULT (datetime('now')),
    processed_at TEXT,
    FOREIGN KEY (station_id) REFERENCES stations(id)
  );

  CREATE TABLE IF NOT EXISTS velocity_models (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    layers TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS simulations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'forward',
    status TEXT DEFAULT 'pending',
    velocity_model_id TEXT,
    event_id TEXT,
    parameters TEXT,
    progress REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    FOREIGN KEY (velocity_model_id) REFERENCES velocity_models(id),
    FOREIGN KEY (event_id) REFERENCES seismic_events(id)
  );

  CREATE TABLE IF NOT EXISTS seismic_events (
    id TEXT PRIMARY KEY,
    event_id TEXT UNIQUE NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    depth REAL NOT NULL,
    magnitude REAL NOT NULL,
    magnitude_type TEXT DEFAULT 'ML',
    time TEXT NOT NULL,
    location TEXT,
    region TEXT
  );

  CREATE TABLE IF NOT EXISTS inversions (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    method TEXT DEFAULT 'CMT',
    parameters TEXT,
    convergence_history TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    FOREIGN KEY (event_id) REFERENCES seismic_events(id)
  );

  CREATE TABLE IF NOT EXISTS inversion_versions (
    id TEXT PRIMARY KEY,
    inversion_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    model_data TEXT,
    source_parameters TEXT,
    misfit REAL,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (inversion_id) REFERENCES inversions(id)
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    level TEXT DEFAULT 'info',
    message TEXT NOT NULL,
    event_id TEXT,
    station_id TEXT,
    acknowledged INTEGER DEFAULT 0,
    acknowledged_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (event_id) REFERENCES seismic_events(id),
    FOREIGN KEY (station_id) REFERENCES stations(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT DEFAULT 'event',
    parameters TEXT,
    status TEXT DEFAULT 'pending',
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_stations_code ON stations(code);
  CREATE INDEX IF NOT EXISTS idx_stations_status ON stations(status);
  CREATE INDEX IF NOT EXISTS idx_waveforms_station ON waveforms(station_id);
  CREATE INDEX IF NOT EXISTS idx_waveforms_status ON waveforms(status);
  CREATE INDEX IF NOT EXISTS idx_simulations_status ON simulations(status);
  CREATE INDEX IF NOT EXISTS idx_events_time ON seismic_events(time);
  CREATE INDEX IF NOT EXISTS idx_events_magnitude ON seismic_events(magnitude);
  CREATE INDEX IF NOT EXISTS idx_events_region ON seismic_events(region);
  CREATE INDEX IF NOT EXISTS idx_inversions_event ON inversions(event_id);
  CREATE INDEX IF NOT EXISTS idx_inversions_status ON inversions(status);
  CREATE INDEX IF NOT EXISTS idx_inversion_versions_inv ON inversion_versions(inversion_id);
  CREATE INDEX IF NOT EXISTS idx_alerts_level ON alerts(level);
  CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON alerts(acknowledged);
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
  CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
`)

function generateId(): string {
  return uuidv4()
}

function seedDatabase(): void {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }
  if (userCount.count > 0) return

  const insertUser = db.prepare(`
    INSERT INTO users (id, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)
  `)
  insertUser.run(generateId(), 'admin', 'admin@seismo.org', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36Kz7aKdBdCkqy5uLbTLyqK', 'admin')

  const insertStation = db.prepare(`
    INSERT INTO stations (id, code, name, latitude, longitude, elevation, network, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const stations = [
    [generateId(), 'BJS', 'Beijing Seismic Station', 39.9042, 116.4074, 43.5, 'CN', 'active'],
    [generateId(), 'SHH', 'Shanghai Seismic Station', 31.2304, 121.4737, 4.0, 'CN', 'active'],
    [generateId(), 'GYA', 'Guiyang Seismic Station', 26.6470, 106.6302, 1071.2, 'CN', 'active'],
    [generateId(), 'KMI', 'Kunming Seismic Station', 25.0389, 102.7183, 1891.4, 'CN', 'active'],
    [generateId(), 'WHN', 'Wuhan Seismic Station', 30.5928, 114.3055, 23.3, 'CN', 'active'],
  ]
  const stationInsert = db.transaction((data: any[][]) => {
    for (const s of data) insertStation.run(...s)
  })
  stationInsert(stations)

  const insertModel = db.prepare(`
    INSERT INTO velocity_models (id, name, description, layers) VALUES (?, ?, ?, ?)
  `)
  const models = [
    [generateId(), 'IASP91', 'International Association of Seismology and Physics of the Earth Interior reference model', JSON.stringify([
      { depth: 0, vp: 5.80, vs: 3.20, density: 2.72 },
      { depth: 20, vp: 6.50, vs: 3.65, density: 2.92 },
      { depth: 35, vp: 8.04, vs: 4.48, density: 3.32 },
      { depth: 120, vp: 8.56, vs: 4.64, density: 3.43 },
      { depth: 210, vp: 8.90, vs: 4.77, density: 3.52 },
      { depth: 410, vp: 9.13, vs: 5.08, density: 3.73 },
    ])],
    [generateId(), 'PREM', 'Preliminary Reference Earth Model', JSON.stringify([
      { depth: 0, vp: 5.80, vs: 3.20, density: 2.72 },
      { depth: 15, vp: 6.80, vs: 3.90, density: 2.92 },
      { depth: 35, vp: 8.10, vs: 4.49, density: 3.38 },
      { depth: 210, vp: 8.91, vs: 4.77, density: 3.51 },
      { depth: 410, vp: 9.13, vs: 5.08, density: 3.73 },
      { depth: 670, vp: 10.75, vs: 5.95, density: 4.38 },
    ])],
    [generateId(), 'AK135', 'AK135 velocity model by Kennett et al.', JSON.stringify([
      { depth: 0, vp: 5.80, vs: 3.20, density: 2.72 },
      { depth: 18, vp: 6.50, vs: 3.65, density: 2.92 },
      { depth: 35, vp: 8.04, vs: 4.48, density: 3.32 },
      { depth: 120, vp: 8.49, vs: 4.60, density: 3.41 },
      { depth: 210, vp: 8.78, vs: 4.71, density: 3.49 },
      { depth: 410, vp: 9.13, vs: 5.08, density: 3.73 },
    ])],
  ]
  const modelInsert = db.transaction((data: any[][]) => {
    for (const m of data) insertModel.run(...m)
  })
  modelInsert(models)

  const insertEvent = db.prepare(`
    INSERT INTO seismic_events (id, event_id, latitude, longitude, depth, magnitude, magnitude_type, time, location, region) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const events = [
    [generateId(), 'EV20260101001', 31.02, 103.67, 15.0, 5.2, 'ML', '2026-01-15T08:23:41Z', 'Wenchuan, Sichuan', 'Sichuan Basin'],
    [generateId(), 'EV20260115002', 25.45, 101.88, 10.0, 4.8, 'ML', '2026-01-28T14:12:33Z', 'Chuxiong, Yunnan', 'Yunnan-Guizhou Plateau'],
    [generateId(), 'EV20260201003', 39.92, 118.43, 12.0, 3.5, 'ML', '2026-02-03T22:45:19Z', 'Tangshan, Hebei', 'North China Plain'],
    [generateId(), 'EV20260215004', 36.08, 103.85, 8.0, 4.1, 'ML', '2026-02-17T06:33:27Z', 'Lanzhou, Gansu', 'Qilian orogenic belt'],
    [generateId(), 'EV20260301005', 23.73, 120.89, 20.0, 5.8, 'MW', '2026-03-05T11:08:55Z', 'Nantou, Taiwan', 'Taiwan orogenic belt'],
    [generateId(), 'EV20260315006', 30.27, 102.94, 5.0, 3.2, 'ML', '2026-03-18T03:21:44Z', 'Kangding, Sichuan', 'Longmenshan fault zone'],
    [generateId(), 'EV20260401007', 41.80, 123.43, 15.0, 4.5, 'ML', '2026-04-02T19:55:12Z', 'Shenyang, Liaoning', 'Tan-Lu fault zone'],
    [generateId(), 'EV20260415008', 29.65, 91.13, 25.0, 4.9, 'MW', '2026-04-19T08:42:38Z', 'Lhasa, Tibet', 'Himalayan orogenic belt'],
    [generateId(), 'EV20260501009', 34.26, 108.94, 10.0, 3.8, 'ML', '2026-05-05T15:17:06Z', "Xi'an, Shaanxi", 'Weihe basin'],
    [generateId(), 'EV20260515010', 26.65, 106.63, 7.0, 3.0, 'ML', '2026-05-20T01:29:53Z', 'Guiyang, Guizhou', 'South China block'],
    [generateId(), 'EV20260525011', 43.83, 87.56, 30.0, 5.1, 'MW', '2026-05-28T14:03:29Z', 'Urumqi, Xinjiang', 'Tianshan orogenic belt'],
    [generateId(), 'EV20260530012', 32.31, 104.18, 12.0, 4.3, 'ML', '2026-06-01T07:48:15Z', 'Mianyang, Sichuan', 'Longmenshan fault zone'],
    [generateId(), 'EV20260605013', 27.61, 111.47, 8.0, 3.6, 'ML', '2026-06-08T20:34:07Z', 'Shaoyang, Hunan', 'Jiangnan orogenic belt'],
    [generateId(), 'EV20260610014', 37.87, 112.55, 18.0, 2.8, 'ML', '2026-06-12T12:22:41Z', 'Taiyuan, Shanxi', 'Shanxi graben'],
    [generateId(), 'EV20260615015', 22.54, 108.37, 5.0, 3.4, 'ML', '2026-06-18T09:15:58Z', 'Nanning, Guangxi', 'South China fold belt'],
    [generateId(), 'EV20260620016', 45.75, 126.65, 22.0, 4.7, 'ML', '2026-06-22T16:41:23Z', 'Harbin, Heilongjiang', 'Songliao basin'],
    [generateId(), 'EV20260625017', 24.48, 118.09, 6.0, 3.9, 'ML', '2026-06-27T04:56:37Z', 'Xiamen, Fujian', 'Southeast coastal zone'],
    [generateId(), 'EV20260628018', 35.23, 115.48, 14.0, 2.5, 'ML', '2026-07-01T23:08:44Z', 'Heze, Shandong', 'North China Plain'],
    [generateId(), 'EV20260701019', 28.23, 112.94, 9.0, 3.1, 'ML', '2026-07-03T11:33:16Z', 'Changsha, Hunan', 'Jiangnan orogenic belt'],
    [generateId(), 'EV20260705020', 42.89, 129.46, 35.0, 5.5, 'MW', '2026-07-06T18:27:52Z', 'Yanji, Jilin', 'Pacific subduction zone'],
  ]
  const eventInsert = db.transaction((data: any[][]) => {
    for (const e of data) insertEvent.run(...e)
  })
  eventInsert(events)

  const adminUser = db.prepare('SELECT id FROM users WHERE username = ?').get('admin') as { id: string } | undefined
  const adminId = adminUser?.id || generateId()

  const eventRows = db.prepare('SELECT id, event_id FROM seismic_events').all() as { id: string; event_id: string }[]
  const stationRows = db.prepare('SELECT id FROM stations').all() as { id: string }[]

  const insertAlert = db.prepare(`
    INSERT INTO alerts (id, type, level, message, event_id, station_id, acknowledged) VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const alerts = [
    [generateId(), 'event', 'warning', `M5.2 earthquake detected near Wenchuan, Sichuan at depth 15km`, eventRows[0]?.id, stationRows[0]?.id, 0],
    [generateId(), 'station', 'critical', `Station SHH reporting abnormal signal-to-noise ratio`, null, stationRows[1]?.id, 0],
    [generateId(), 'event', 'info', `M5.8 earthquake detected near Nantou, Taiwan at depth 20km`, eventRows[4]?.id, stationRows[2]?.id, 0],
  ]
  const alertInsert = db.transaction((data: any[][]) => {
    for (const a of data) insertAlert.run(...a)
  })
  alertInsert(alerts)

  const insertNotification = db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, read) VALUES (?, ?, ?, ?, ?)
  `)
  const notifications = [
    [generateId(), adminId, 'System Initialized', 'Seismic wave simulation platform has been initialized successfully.', 0],
    [generateId(), adminId, 'Alert: M5.2 Earthquake', 'A magnitude 5.2 earthquake was detected near Wenchuan, Sichuan.', 0],
    [generateId(), adminId, 'Station Alert', 'Station SHH is reporting abnormal SNR values. Please investigate.', 0],
  ]
  const notifInsert = db.transaction((data: any[][]) => {
    for (const n of data) insertNotification.run(...n)
  })
  notifInsert(notifications)
}

seedDatabase()

function getAllStations() {
  return db.prepare('SELECT * FROM stations WHERE status = ?').all('active')
}

function getRecentEvents(limit: number = 10) {
  return db.prepare('SELECT * FROM seismic_events ORDER BY time DESC LIMIT ?').all(limit)
}

function getActiveAlerts() {
  return db.prepare('SELECT * FROM alerts WHERE acknowledged = 0 ORDER BY created_at DESC').all()
}

export { db, generateId, getAllStations, getRecentEvents, getActiveAlerts }
