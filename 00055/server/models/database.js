const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'optics.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    progress REAL DEFAULT 0,
    lens_data TEXT,
    original_lens_data TEXT,
    analysis_results TEXT,
    iterations INTEGER DEFAULT 0,
    max_iterations INTEGER DEFAULT 20,
    consecutive_non_converging INTEGER DEFAULT 0,
    quality_score INTEGER DEFAULT 0,
    meets_requirements INTEGER DEFAULT 0,
    rms_threshold REAL DEFAULT 0.07,
    mtf_threshold REAL DEFAULT 50,
    admin_email TEXT DEFAULT 'admin@optical.com',
    created_at TEXT DEFAULT (datetime('now')),
    started_at TEXT,
    completed_at TEXT,
    error_message TEXT
  );

  CREATE TABLE IF NOT EXISTS optimization_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL,
    iteration INTEGER NOT NULL,
    rms REAL,
    mtf REAL,
    adjustment_type TEXT,
    adjustment_detail TEXT,
    improved INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS task_warnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'warning',
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS daily_stats (
    date TEXT PRIMARY KEY,
    tasks_created INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    tasks_errored INTEGER DEFAULT 0,
    warnings_sent INTEGER DEFAULT 0,
    quality_passed INTEGER DEFAULT 0,
    total_iterations INTEGER DEFAULT 0,
    aberration_spherical INTEGER DEFAULT 0,
    aberration_coma INTEGER DEFAULT 0,
    aberration_astigmatism INTEGER DEFAULT 0,
    aberration_field_curvature INTEGER DEFAULT 0,
    aberration_distortion INTEGER DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  CREATE INDEX IF NOT EXISTS idx_optimization_logs_task ON optimization_logs(task_id);
  CREATE INDEX IF NOT EXISTS idx_task_warnings_task ON task_warnings(task_id);
`);

const TaskModel = {
  create(task) {
    const stmt = db.prepare(`
      INSERT INTO tasks (id, name, status, lens_data, original_lens_data, rms_threshold, mtf_threshold, admin_email)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      task.id, task.name, task.status,
      JSON.stringify(task.lens_data), JSON.stringify(task.original_lens_data || task.lens_data),
      task.rmsThreshold || 0.07, task.mtfThreshold || 50, task.adminEmail || 'admin@optical.com'
    );
    return this.getById(task.id);
  },

  getById(id) {
    const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (row) return this._hydrate(row);
    return null;
  },

  getAll() {
    return db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all().map(this._hydrate);
  },

  getByStatus(status) {
    return db.prepare('SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC').all(status).map(this._hydrate);
  },

  updateStatus(id, status, progress = null) {
    const fields = ['status = ?'];
    const values = [status];
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
    
    if (progress !== null) {
      fields.push('progress = ?');
      values.push(progress);
    }
    
    if (status === 'parsing' || status === 'tracing') {
      fields.push('started_at = COALESCE(started_at, ?)');
      values.push(now);
    }
    
    if (status === 'completed' || status === 'error' || status === 'paused') {
      fields.push('completed_at = ?');
      values.push(now);
    }
    
    values.push(id);
    db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.getById(id);
  },

  updateAnalysis(id, analysisResults, qualityScore, meetsRequirements) {
    db.prepare(`
      UPDATE tasks SET analysis_results = ?, quality_score = ?, meets_requirements = ? WHERE id = ?
    `).run(JSON.stringify(analysisResults), qualityScore, meetsRequirements ? 1 : 0, id);
    return this.getById(id);
  },

  updateLensData(id, lensData) {
    db.prepare('UPDATE tasks SET lens_data = ? WHERE id = ?').run(JSON.stringify(lensData), id);
  },

  incrementIterations(id) {
    db.prepare('UPDATE tasks SET iterations = iterations + 1 WHERE id = ?').run(id);
  },

  updateConsecutiveNonConverging(id, value) {
    db.prepare('UPDATE tasks SET consecutive_non_converging = ? WHERE id = ?').run(value, id);
  },

  deleteById(id) {
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  },

  _hydrate(row) {
    return {
      ...row,
      lens_data: typeof row.lens_data === 'string' ? JSON.parse(row.lens_data) : row.lens_data,
      original_lens_data: typeof row.original_lens_data === 'string' ? JSON.parse(row.original_lens_data) : row.original_lens_data,
      analysis_results: typeof row.analysis_results === 'string' ? JSON.parse(row.analysis_results) : row.analysis_results,
      meets_requirements: !!row.meets_requirements,
      progress: row.progress || 0
    };
  }
};

const OptimizationLogModel = {
  create(log) {
    const stmt = db.prepare(`
      INSERT INTO optimization_logs (task_id, iteration, rms, mtf, adjustment_type, adjustment_detail, improved)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      log.taskId, log.iteration, log.rms, log.mtf,
      log.adjustmentType, log.adjustmentDetail, log.improved ? 1 : 0
    );
    return result.lastInsertRowid;
  },

  getByTaskId(taskId) {
    return db.prepare('SELECT * FROM optimization_logs WHERE task_id = ? ORDER BY iteration ASC').all(taskId);
  },

  deleteByTaskId(taskId) {
    db.prepare('DELETE FROM optimization_logs WHERE task_id = ?').run(taskId);
  }
};

const WarningModel = {
  create(warning) {
    const stmt = db.prepare(`
      INSERT INTO task_warnings (task_id, message, type) VALUES (?, ?, ?)
    `);
    const result = stmt.run(warning.taskId, warning.message, warning.type || 'warning');
    return result.lastInsertRowid;
  },

  getByTaskId(taskId) {
    return db.prepare('SELECT * FROM task_warnings WHERE task_id = ? ORDER BY created_at DESC').all(taskId);
  },

  getUnread() {
    return db.prepare('SELECT * FROM task_warnings WHERE is_read = 0 ORDER BY created_at DESC').all();
  },

  markRead(id) {
    db.prepare('UPDATE task_warnings SET is_read = 1 WHERE id = ?').run(id);
  },

  getCount() {
    return db.prepare('SELECT COUNT(*) as count FROM task_warnings').get().count;
  }
};

const DailyStatsModel = {
  _getToday() {
    return new Date().toISOString().slice(0, 10);
  },

  _ensureToday() {
    const today = this._getToday();
    db.prepare(`
      INSERT OR IGNORE INTO daily_stats (date) VALUES (?)
    `).run(today);
    return today;
  },

  increment(field, value = 1) {
    const today = this._ensureToday();
    db.prepare(`UPDATE daily_stats SET ${field} = ${field} + ? WHERE date = ?`).run(value, today);
  },

  getToday() {
    const today = this._ensureToday();
    return db.prepare('SELECT * FROM daily_stats WHERE date = ?').get(today);
  },

  getRange(days = 7) {
    return db.prepare(`
      SELECT * FROM daily_stats 
      WHERE date >= date('now', '-${days} days') 
      ORDER BY date ASC
    `).all();
  },

  getAggregatedMetrics() {
    const today = this._ensureToday();
    const todayStats = db.prepare('SELECT * FROM daily_stats WHERE date = ?').get(today);
    
    const totalTasks = db.prepare('SELECT COUNT(*) as count FROM tasks').get().count;
    const completedTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'completed'").get().count;
    const qualityTasks = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE meets_requirements = 1').get().count;
    const avgIter = db.prepare('SELECT AVG(iterations) as avg FROM tasks WHERE status = \'completed\'').get();
    
    return {
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      avgIterations: avgIter && avgIter.avg ? Math.round(avgIter.avg * 10) / 10 : 0,
      qualityRate: completedTasks > 0 ? Math.round((qualityTasks / completedTasks) * 100) : 0,
      warningCount: WarningModel.getCount(),
      daily: todayStats || {
        date: today,
        tasks_created: 0, tasks_completed: 0, tasks_errored: 0,
        warnings_sent: 0, quality_passed: 0, total_iterations: 0,
        aberration_spherical: 0, aberration_coma: 0, aberration_astigmatism: 0,
        aberration_field_curvature: 0, aberration_distortion: 0
      },
      range: this.getRange(7)
    };
  }
};

module.exports = { db, TaskModel, OptimizationLogModel, WarningModel, DailyStatsModel };
