const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '../database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = process.env.DB_PATH || './database/fleet.db';
const db = new Database(path.resolve(dbPath));

db.pragma('foreign_keys = ON');

const runQuery = (sql, params = []) => {
  try {
    const stmt = db.prepare(sql);
    const result = stmt.run(...params);
    return { lastID: result.lastInsertRowid, changes: result.changes };
  } catch (err) {
    throw err;
  }
};

const getOne = (sql, params = []) => {
  try {
    const stmt = db.prepare(sql);
    return stmt.get(...params);
  } catch (err) {
    throw err;
  }
};

const getAll = (sql, params = []) => {
  try {
    const stmt = db.prepare(sql);
    return stmt.all(...params);
  } catch (err) {
    throw err;
  }
};

const exec = (sql) => {
  try {
    db.exec(sql);
  } catch (err) {
    throw err;
  }
};

module.exports = { db, runQuery, getOne, getAll, exec };
