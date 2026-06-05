import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../database.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const initTables = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone TEXT,
      role TEXT DEFAULT 'user',
      avatar TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pets (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      name TEXT NOT NULL,
      breed TEXT NOT NULL,
      age INTEGER NOT NULL,
      weight REAL NOT NULL,
      gender TEXT NOT NULL,
      avatar TEXT,
      allergies TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS vaccines (
      id TEXT PRIMARY KEY,
      petId TEXT NOT NULL,
      name TEXT NOT NULL,
      date DATETIME NOT NULL,
      status TEXT DEFAULT 'completed',
      nextDate DATETIME,
      FOREIGN KEY (petId) REFERENCES pets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS packages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      pricePerDay REAL NOT NULL,
      features TEXT,
      roomIds TEXT,
      minAge INTEGER,
      maxAge INTEGER,
      minWeight REAL,
      maxWeight REAL,
      requiresAllergyFriendly INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'available',
      capacity INTEGER DEFAULT 1,
      features TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS caregivers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar TEXT,
      specialties TEXT,
      experienceYears INTEGER DEFAULT 0,
      rating REAL DEFAULT 5,
      reviewCount INTEGER DEFAULT 0,
      recommendationWeight REAL DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      petId TEXT NOT NULL,
      packageId TEXT NOT NULL,
      roomId TEXT NOT NULL,
      caregiverId TEXT,
      startDate DATETIME NOT NULL,
      endDate DATETIME NOT NULL,
      totalPrice REAL NOT NULL,
      deposit REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      specialRequests TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (petId) REFERENCES pets(id) ON DELETE CASCADE,
      FOREIGN KEY (packageId) REFERENCES packages(id) ON DELETE CASCADE,
      FOREIGN KEY (roomId) REFERENCES rooms(id) ON DELETE CASCADE,
      FOREIGN KEY (caregiverId) REFERENCES caregivers(id)
    );

    CREATE TABLE IF NOT EXISTS booking_updates (
      id TEXT PRIMARY KEY,
      bookingId TEXT NOT NULL,
      caregiverId TEXT,
      type TEXT NOT NULL,
      note TEXT,
      mediaUrls TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bookingId) REFERENCES bookings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      bookingId TEXT NOT NULL,
      senderId TEXT NOT NULL,
      senderName TEXT NOT NULL,
      senderRole TEXT NOT NULL,
      content TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bookingId) REFERENCES bookings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      bookingId TEXT NOT NULL,
      caregiverId TEXT NOT NULL,
      rating INTEGER NOT NULL,
      content TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bookingId) REFERENCES bookings(id) ON DELETE CASCADE,
      FOREIGN KEY (caregiverId) REFERENCES caregivers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      caregiverId TEXT NOT NULL,
      date DATETIME NOT NULL,
      shift TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (caregiverId) REFERENCES caregivers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      bookingId TEXT NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      isRead INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bookingId) REFERENCES bookings(id) ON DELETE CASCADE
    );
  `);
};

initTables();

export default db;
