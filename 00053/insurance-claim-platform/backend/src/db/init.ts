import db from './index';

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('headquarters', 'region', 'branch')),
      region TEXT,
      branch TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS policies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      policy_no TEXT UNIQUE NOT NULL,
      holder_name TEXT NOT NULL,
      insurance_type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      premium REAL NOT NULL,
      coverage REAL NOT NULL,
      branch TEXT NOT NULL,
      region TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      claim_no TEXT UNIQUE NOT NULL,
      policy_id INTEGER NOT NULL,
      policy_no TEXT NOT NULL,
      holder_name TEXT NOT NULL,
      insurance_type TEXT NOT NULL,
      accident_type TEXT NOT NULL,
      accident_date TEXT NOT NULL,
      report_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      claim_amount REAL,
      approved_amount REAL,
      assessor TEXT,
      handler TEXT,
      branch TEXT NOT NULL,
      region TEXT NOT NULL,
      close_date TEXT,
      reject_reason TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (policy_id) REFERENCES policies(id)
    );

    CREATE TABLE IF NOT EXISTS assessment_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      claim_id INTEGER NOT NULL,
      claim_no TEXT NOT NULL,
      assessor TEXT NOT NULL,
      assessment_date TEXT NOT NULL,
      total_estimated REAL NOT NULL,
      total_actual REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      deviation_flag INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (claim_id) REFERENCES claims(id)
    );

    CREATE TABLE IF NOT EXISTS assessment_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_id INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      category TEXT NOT NULL,
      estimated_cost REAL NOT NULL,
      actual_cost REAL NOT NULL,
      deviation REAL NOT NULL DEFAULT 0,
      needs_review INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (record_id) REFERENCES assessment_records(id)
    );

    CREATE TABLE IF NOT EXISTS early_warnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branch TEXT NOT NULL,
      region TEXT NOT NULL,
      insurance_type TEXT NOT NULL,
      accident_type TEXT NOT NULL,
      anomaly_days INTEGER NOT NULL,
      avg_anomaly_count REAL NOT NULL,
      historical_avg REAL NOT NULL,
      threshold REAL NOT NULL,
      trigger_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      assignee TEXT,
      level TEXT NOT NULL DEFAULT 'medium',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      warning_id INTEGER,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (warning_id) REFERENCES early_warnings(id)
    );

    CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
    CREATE INDEX IF NOT EXISTS idx_claims_branch ON claims(branch);
    CREATE INDEX IF NOT EXISTS idx_claims_region ON claims(region);
    CREATE INDEX IF NOT EXISTS idx_early_warnings_status ON early_warnings(status);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
  `);

  console.log('Database tables initialized successfully.');
}

if (require.main === module) {
  initDatabase();
}

export default initDatabase;
