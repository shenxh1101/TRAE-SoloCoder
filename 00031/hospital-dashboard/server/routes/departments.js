import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

router.get('/departments', (req, res) => {
  try {
    const db = getDb();
    const departments = db.prepare('SELECT * FROM departments').all();
    res.json({ code: 200, message: 'success', data: departments });
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message, data: null });
  }
});

router.get('/departments/:id', (req, res) => {
  try {
    const db = getDb();
    const dept = db.prepare('SELECT * FROM departments WHERE id = ?').get(req.params.id);
    if (!dept) {
      return res.status(404).json({ code: 404, message: 'Department not found', data: null });
    }
    res.json({ code: 200, message: 'success', data: dept });
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message, data: null });
  }
});

router.get('/department-stats', (req, res) => {
  try {
    const db = getDb();
    const { departmentId, timeRange, startDate, endDate } = req.query;

    let sql = 'SELECT * FROM department_stats WHERE 1=1';
    const params = [];

    if (departmentId) {
      sql += ' AND departmentId = ?';
      params.push(departmentId);
    }

    if (startDate) {
      sql += ' AND date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND date <= ?';
      params.push(endDate);
    }

    if (!startDate && !endDate && timeRange) {
      const today = new Date().toISOString().split('T')[0];
      const daysMap = { day: 1, week: 7, month: 30 };
      const days = daysMap[timeRange] || 7;
      const start = new Date();
      start.setDate(start.getDate() - days);
      const startStr = start.toISOString().split('T')[0];
      sql += ' AND date >= ? AND date <= ?';
      params.push(startStr, today);
    }

    if (!startDate && !endDate && !timeRange) {
      const start = new Date();
      start.setDate(start.getDate() - 30);
      const startStr = start.toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      sql += ' AND date >= ? AND date <= ?';
      params.push(startStr, today);
    }

    sql += ' ORDER BY date DESC, departmentId';
    const stats = db.prepare(sql).all(...params);
    res.json({ code: 200, message: 'success', data: stats });
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message, data: null });
  }
});

router.get('/waiting-records', (req, res) => {
  try {
    const db = getDb();
    const { departmentId, hours } = req.query;

    let sql = 'SELECT * FROM waiting_records WHERE 1=1';
    const params = [];

    if (departmentId) {
      sql += ' AND departmentId = ?';
      params.push(departmentId);
    }

    if (hours) {
      const since = new Date();
      since.setHours(since.getHours() - parseInt(hours));
      sql += ' AND timestamp >= ?';
      params.push(since.toISOString());
    } else {
      const today = new Date().toISOString().split('T')[0];
      sql += ' AND DATE(timestamp) = ?';
      params.push(today);
    }

    sql += ' ORDER BY timestamp DESC';
    const records = db.prepare(sql).all(...params);
    res.json({ code: 200, message: 'success', data: records });
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message, data: null });
  }
});

export default router;
