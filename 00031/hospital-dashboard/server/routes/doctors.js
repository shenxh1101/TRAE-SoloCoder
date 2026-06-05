import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

router.get('/doctors', (req, res) => {
  try {
    const db = getDb();
    const { departmentId } = req.query;

    let sql = 'SELECT * FROM doctors WHERE 1=1';
    const params = [];

    if (departmentId) {
      sql += ' AND departmentId = ?';
      params.push(departmentId);
    }

    const doctors = db.prepare(sql).all(...params);
    res.json({ code: 200, message: 'success', data: doctors });
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message, data: null });
  }
});

router.get('/doctors/:id', (req, res) => {
  try {
    const db = getDb();
    const doctor = db.prepare('SELECT * FROM doctors WHERE id = ?').get(req.params.id);
    if (!doctor) {
      return res.status(404).json({ code: 404, message: 'Doctor not found', data: null });
    }
    res.json({ code: 200, message: 'success', data: doctor });
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message, data: null });
  }
});

router.get('/doctor-stats', (req, res) => {
  try {
    const db = getDb();
    const { doctorId, departmentId, startDate, endDate } = req.query;

    let sql = 'SELECT * FROM doctor_stats WHERE 1=1';
    const params = [];

    if (doctorId) {
      sql += ' AND doctorId = ?';
      params.push(doctorId);
    }

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

    if (!startDate && !endDate) {
      const start = new Date();
      start.setDate(start.getDate() - 7);
      const startStr = start.toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      sql += ' AND date >= ? AND date <= ?';
      params.push(startStr, today);
    }

    sql += ' ORDER BY date DESC, doctorId';
    const stats = db.prepare(sql).all(...params);
    res.json({ code: 200, message: 'success', data: stats });
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message, data: null });
  }
});

export default router;
