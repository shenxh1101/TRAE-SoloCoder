const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../database');

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDB();
  const { level, acknowledged, limit = 50 } = req.query;
  
  let query = 'SELECT * FROM alerts WHERE 1=1';
  const params = [];
  
  if (level) {
    query += ' AND level = ?';
    params.push(level);
  }
  
  if (acknowledged !== undefined) {
    query += ' AND acknowledged = ?';
    params.push(acknowledged === 'true' ? 1 : 0);
  }
  
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit));
  
  const alerts = db.prepare(query).all(...params);
  res.json(alerts);
});

router.get('/unacknowledged', (req, res) => {
  const db = getDB();
  const alerts = db.prepare(`
    SELECT * FROM alerts 
    WHERE acknowledged = 0 
    ORDER BY 
      CASE level 
        WHEN 'danger' THEN 1 
        WHEN 'warning' THEN 2 
        ELSE 3 
      END,
      created_at DESC
  `).all();
  res.json(alerts);
});

router.get('/summary/today', (req, res) => {
  const db = getDB();
  const summary = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN level = 'danger' THEN 1 ELSE 0 END) as danger_count,
      SUM(CASE WHEN level = 'warning' THEN 1 ELSE 0 END) as warning_count,
      SUM(CASE WHEN level = 'info' THEN 1 ELSE 0 END) as info_count,
      SUM(CASE WHEN acknowledged = 0 THEN 1 ELSE 0 END) as unacknowledged
    FROM alerts
    WHERE DATE(created_at) = DATE('now')
  `).get();
  
  res.json(summary);
});

router.get('/:id', (req, res) => {
  const db = getDB();
  const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(req.params.id);
  
  if (!alert) {
    return res.status(404).json({ error: '警报不存在' });
  }
  
  res.json(alert);
});

router.post('/', (req, res) => {
  const db = getDB();
  const { type, title, description, level = 'warning', related_id, related_type } = req.body;

  if (!type || !title) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  const id = 'a' + Date.now().toString().slice(-8);
  
  db.prepare(`
    INSERT INTO alerts (id, type, title, description, level, related_id, related_type, acknowledged)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0)
  `).run(id, type, title, description || '', level, related_id || null, related_type || null);

  const created = db.prepare('SELECT * FROM alerts WHERE id = ?').get(id);
  res.status(201).json(created);
});

router.put('/:id/acknowledge', (req, res) => {
  const db = getDB();
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM alerts WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: '警报不存在' });
  }

  db.prepare('UPDATE alerts SET acknowledged = 1 WHERE id = ?').run(id);
  const updated = db.prepare('SELECT * FROM alerts WHERE id = ?').get(id);
  res.json(updated);
});

router.put('/acknowledge-all', (req, res) => {
  const db = getDB();
  db.prepare('UPDATE alerts SET acknowledged = 1 WHERE acknowledged = 0').run();
  res.json({ message: '所有警报已确认' });
});

router.delete('/:id', (req, res) => {
  const db = getDB();
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM alerts WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: '警报不存在' });
  }

  db.prepare('DELETE FROM alerts WHERE id = ?').run(id);
  res.json({ message: '警报已删除' });
});

module.exports = { alertsRouter: router };
