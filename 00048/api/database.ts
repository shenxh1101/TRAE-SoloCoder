import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_PATH = path.join(__dirname, 'data.db')

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
  }
  return db
}

export function initDatabase(): void {
  const database = getDb()

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      avatar TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS stray_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      animal_type TEXT DEFAULT '',
      description TEXT DEFAULT '',
      location TEXT DEFAULT '',
      city TEXT DEFAULT '',
      district TEXT DEFAULT '',
      latitude REAL,
      longitude REAL,
      photos TEXT DEFAULT '[]',
      status TEXT DEFAULT 'pending',
      urgency TEXT DEFAULT 'medium',
      contact_name TEXT DEFAULT '',
      contact_phone TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS hospitals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT DEFAULT '',
      city TEXT DEFAULT '',
      district TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      latitude REAL,
      longitude REAL,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS rescue_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER REFERENCES stray_reports(id),
      volunteer_id INTEGER REFERENCES users(id),
      hospital_id INTEGER REFERENCES hospitals(id),
      status TEXT DEFAULT 'pending',
      description TEXT DEFAULT '',
      rescue_photos TEXT DEFAULT '[]',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS animals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT DEFAULT '',
      type TEXT DEFAULT '',
      breed TEXT DEFAULT '',
      age TEXT DEFAULT '',
      gender TEXT DEFAULT '',
      color TEXT DEFAULT '',
      weight REAL DEFAULT 0,
      description TEXT DEFAULT '',
      personality TEXT DEFAULT '[]',
      photos TEXT DEFAULT '[]',
      status TEXT DEFAULT 'available',
      rescue_task_id INTEGER REFERENCES rescue_tasks(id),
      hospital_id INTEGER REFERENCES hospitals(id),
      neutered INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS medical_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      animal_id INTEGER REFERENCES animals(id),
      hospital_id INTEGER REFERENCES hospitals(id),
      doctor_name TEXT DEFAULT '',
      diagnosis TEXT DEFAULT '',
      treatment TEXT DEFAULT '',
      prescription TEXT DEFAULT '',
      cost REAL DEFAULT 0,
      notes TEXT DEFAULT '',
      record_date TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS vaccine_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      animal_id INTEGER REFERENCES animals(id),
      vaccine_name TEXT DEFAULT '',
      vaccine_type TEXT DEFAULT '',
      batch_number TEXT DEFAULT '',
      hospital_id INTEGER REFERENCES hospitals(id),
      vaccinate_date TEXT DEFAULT '',
      next_date TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS adoption_questionnaires (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      animal_id INTEGER REFERENCES animals(id),
      housing_type TEXT DEFAULT '',
      housing_size TEXT DEFAULT '',
      has_yard INTEGER DEFAULT 0,
      has_other_pets INTEGER DEFAULT 0,
      other_pets_description TEXT DEFAULT '',
      experience TEXT DEFAULT '',
      daily_hours_home TEXT DEFAULT '',
      activity_level TEXT DEFAULT '',
      reason TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS adoption_agreements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      questionnaire_id INTEGER REFERENCES adoption_questionnaires(id),
      user_id INTEGER REFERENCES users(id),
      animal_id INTEGER REFERENCES animals(id),
      agreement_date TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      terms TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS follow_ups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agreement_id INTEGER REFERENCES adoption_agreements(id),
      animal_id INTEGER REFERENCES animals(id),
      user_id INTEGER REFERENCES users(id),
      scheduled_date TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      notes TEXT DEFAULT '',
      photos TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS donations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      amount REAL DEFAULT 0,
      type TEXT DEFAULT 'one_time',
      status TEXT DEFAULT 'completed',
      payment_method TEXT DEFAULT '',
      message TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS fundraises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT DEFAULT '',
      description TEXT DEFAULT '',
      target_amount REAL DEFAULT 0,
      current_amount REAL DEFAULT 0,
      cover_image TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      start_date TEXT DEFAULT '',
      end_date TEXT DEFAULT '',
      creator_id INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );
  `)

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_stray_reports_user ON stray_reports(user_id);
    CREATE INDEX IF NOT EXISTS idx_stray_reports_status ON stray_reports(status);
    CREATE INDEX IF NOT EXISTS idx_stray_reports_city ON stray_reports(city);
    CREATE INDEX IF NOT EXISTS idx_rescue_tasks_volunteer ON rescue_tasks(volunteer_id);
    CREATE INDEX IF NOT EXISTS idx_rescue_tasks_status ON rescue_tasks(status);
    CREATE INDEX IF NOT EXISTS idx_animals_type ON animals(type);
    CREATE INDEX IF NOT EXISTS idx_animals_status ON animals(status);
    CREATE INDEX IF NOT EXISTS idx_medical_records_animal ON medical_records(animal_id);
    CREATE INDEX IF NOT EXISTS idx_vaccine_records_animal ON vaccine_records(animal_id);
    CREATE INDEX IF NOT EXISTS idx_adoption_questionnaires_user ON adoption_questionnaires(user_id);
    CREATE INDEX IF NOT EXISTS idx_adoption_agreements_user ON adoption_agreements(user_id);
    CREATE INDEX IF NOT EXISTS idx_follow_ups_agreement ON follow_ups(agreement_id);
    CREATE INDEX IF NOT EXISTS idx_donations_user ON donations(user_id);
    CREATE INDEX IF NOT EXISTS idx_fundraises_status ON fundraises(status);
  `)

  console.log('Database initialized successfully')
}
