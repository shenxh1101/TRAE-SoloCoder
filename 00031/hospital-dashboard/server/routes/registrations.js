import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

router.get('/registrations', (req, res) => {
  try {
    const db = getDb();
    const {
      departmentId, doctorId, date, startDate, endDate,
      status, page = '1', pageSize = '20',
    } = req.query;

    let countSql = 'SELECT COUNT(*) as total FROM registrations WHERE 1=1';
    let dataSql = 'SELECT * FROM registrations WHERE 1=1';
    const params = [];

    if (departmentId) {
      const clause = ' AND departmentId = ?';
      countSql += clause;
      dataSql += clause;
      params.push(departmentId);
    }

    if (doctorId) {
      const clause = ' AND doctorId = ?';
      countSql += clause;
      dataSql += clause;
      params.push(doctorId);
    }

    if (date) {
      const clause = ' AND DATE(registerTime) = ?';
      countSql += clause;
      dataSql += clause;
      params.push(date);
    }

    if (startDate) {
      const clause = ' AND DATE(registerTime) >= ?';
      countSql += clause;
      dataSql += clause;
      params.push(startDate);
    }

    if (endDate) {
      const clause = ' AND DATE(registerTime) <= ?';
      countSql += clause;
      dataSql += clause;
      params.push(endDate);
    }

    if (status) {
      const clause = ' AND status = ?';
      countSql += clause;
      dataSql += clause;
      params.push(status);
    }

    const countParams = [...params];
    const { total } = db.prepare(countSql).get(...countParams);

    const p = parseInt(page);
    const ps = parseInt(pageSize);
    const offset = (p - 1) * ps;
    dataSql += ' ORDER BY registerTime DESC LIMIT ? OFFSET ?';

    const data = db.prepare(dataSql).all(...params, ps, offset);

    res.json({
      code: 200,
      message: 'success',
      data: { data, total, page: p, pageSize: ps },
    });
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message, data: null });
  }
});

router.get('/registrations/daily-stats', (req, res) => {
  try {
    const db = getDb();
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const stats = db.prepare(`
      SELECT
        COUNT(*) as totalRegistrations,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedVisits,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelledVisits,
        COALESCE(AVG(CASE WHEN status = 'completed' AND actualStartTime IS NOT NULL AND estimatedTime IS NOT NULL
          THEN (julianday(actualStartTime) - julianday(estimatedTime)) * 24 * 60
        END), 0) as averageWaitingTime,
        COALESCE(MAX(CASE WHEN status = 'completed' AND actualStartTime IS NOT NULL AND estimatedTime IS NOT NULL
          THEN ABS((julianday(actualStartTime) - julianday(estimatedTime)) * 24 * 60)
        END), 0) as maxWaitingTime,
        COALESCE(AVG(CASE WHEN status = 'completed' AND actualStartTime IS NOT NULL AND actualEndTime IS NOT NULL
          THEN (julianday(actualEndTime) - julianday(actualStartTime)) * 24 * 60
        END), 0) as averageVisitDuration
      FROM registrations
      WHERE DATE(registerTime) = ?
    `).get(targetDate);

    res.json({ code: 200, message: 'success', data: stats });
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message, data: null });
  }
});

router.get('/registrations/:id', (req, res) => {
  try {
    const db = getDb();
    const reg = db.prepare('SELECT * FROM registrations WHERE id = ?').get(req.params.id);
    if (!reg) {
      return res.status(404).json({ code: 404, message: 'Registration not found', data: null });
    }
    res.json({ code: 200, message: 'success', data: reg });
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message, data: null });
  }
});

export default router;
