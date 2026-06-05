import { Router } from 'express';
import { getDb } from '../db.js';
import { broadcastAlert } from '../websocket.js';

const router = Router();

router.get('/alerts', (req, res) => {
  try {
    const db = getDb();
    const { resolved, type, level, departmentId } = req.query;

    let sql = 'SELECT * FROM alerts WHERE 1=1';
    const params = [];

    if (resolved !== undefined) {
      sql += ' AND resolved = ?';
      params.push(resolved === 'true' || resolved === '1' ? 1 : 0);
    }

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    if (level) {
      sql += ' AND level = ?';
      params.push(level);
    }

    if (departmentId) {
      sql += ' AND departmentId = ?';
      params.push(departmentId);
    }

    sql += ' ORDER BY timestamp DESC';

    const alerts = db.prepare(sql).all(...params).map(a => ({
      ...a,
      resolved: !!a.resolved,
      notifiedTo: JSON.parse(a.notifiedTo || '[]'),
    }));

    res.json({ code: 200, message: 'success', data: alerts });
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message, data: null });
  }
});

router.post('/alerts', (req, res) => {
  try {
    const db = getDb();
    const { type, level, departmentId, departmentName, doctorId, doctorName, message, notifiedTo } = req.body;

    const id = `alert-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = new Date().toISOString();
    const notifiedToStr = JSON.stringify(notifiedTo || []);

    db.prepare(`
      INSERT INTO alerts (id, type, level, departmentId, departmentName, doctorId, doctorName, message, timestamp, resolved, notifiedTo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(id, type, level, departmentId, departmentName, doctorId || null, doctorName || null, message, timestamp, notifiedToStr);

    const alert = {
      id, type, level, departmentId, departmentName,
      doctorId: doctorId || undefined,
      doctorName: doctorName || undefined,
      message, timestamp, resolved: false,
      notifiedTo: notifiedTo || [],
    };

    broadcastAlert(alert);

    res.json({ code: 200, message: 'success', data: alert });
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message, data: null });
  }
});

router.put('/alerts/:id/resolve', (req, res) => {
  try {
    const db = getDb();
    const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(req.params.id);
    if (!alert) {
      return res.status(404).json({ code: 404, message: 'Alert not found', data: null });
    }

    db.prepare('UPDATE alerts SET resolved = 1 WHERE id = ?').run(req.params.id);

    const updated = {
      ...alert,
      resolved: true,
      notifiedTo: JSON.parse(alert.notifiedTo || '[]'),
    };

    broadcastAlert(updated);

    res.json({ code: 200, message: 'success', data: updated });
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message, data: null });
  }
});

router.get('/alerts/unresolved-count', (req, res) => {
  try {
    const db = getDb();
    const { cnt } = db.prepare('SELECT COUNT(*) as cnt FROM alerts WHERE resolved = 0').get();
    res.json({ code: 200, message: 'success', data: cnt });
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message, data: null });
  }
});

export default router;
