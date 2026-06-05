const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../database');

const router = express.Router();

const WASTE_THRESHOLD = 90;

function checkWasteStatus(waste) {
  return waste.level >= WASTE_THRESHOLD ? 'danger' : 'normal';
}

router.get('/', (req, res) => {
  const db = getDB();
  const wasteBins = db.prepare('SELECT * FROM waste_bins ORDER BY id').all();
  res.json(wasteBins);
});

router.get('/transfer/workorders', (req, res) => {
  const db = getDB();
  const workorders = db.prepare('SELECT * FROM transfer_workorders ORDER BY created_at DESC').all();
  res.json(workorders);
});

router.post('/transfer/workorders', (req, res) => {
  const db = getDB();
  const { waste_id } = req.body;

  const waste = db.prepare('SELECT * FROM waste_bins WHERE id = ?').get(waste_id);
  if (!waste) {
    return res.status(404).json({ error: '废液桶不存在' });
  }

  const workorderId = 'WT-' + Date.now().toString().slice(-8);

  db.prepare(`
    INSERT INTO transfer_workorders (id, waste_id, waste_name, level, status)
    VALUES (?, ?, ?, ?, ?)
  `).run(workorderId, waste_id, waste.name, waste.level, 'pending');

  const workorder = db.prepare('SELECT * FROM transfer_workorders WHERE id = ?').get(workorderId);
  
  const alertId = uuidv4();
  db.prepare(`
    INSERT INTO alerts (id, type, title, description, level, related_id, related_type)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    alertId,
    'waste',
    '转运工单已创建',
    `已创建${waste.name}的转运工单`,
    'info',
    workorderId,
    'transfer_workorder'
  );

  res.status(201).json(workorder);
});

router.put('/transfer/workorders/:id', (req, res) => {
  const db = getDB();
  const { id } = req.params;
  const { status } = req.body;

  const existing = db.prepare('SELECT * FROM transfer_workorders WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: '工单不存在' });
  }

  if (status === 'completed') {
    db.prepare(`
      UPDATE transfer_workorders 
      SET status = ?, completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, id);

    db.prepare(`
      UPDATE waste_bins 
      SET level = 0, status = 'normal', last_updated = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(existing.waste_id);

    const alertId = uuidv4();
    db.prepare(`
      INSERT INTO alerts (id, type, title, description, level, related_id, related_type)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      alertId,
      'waste',
      '转运完成',
      `${existing.waste_name}转运完成，废液桶已清空`,
      'info',
      existing.waste_id,
      'waste_bin'
    );
  } else {
    db.prepare('UPDATE transfer_workorders SET status = ? WHERE id = ?').run(status, id);
  }

  const updated = db.prepare('SELECT * FROM transfer_workorders WHERE id = ?').get(id);
  res.json(updated);
});

router.post('/:id/transfer-workorder', (req, res) => {
  const db = getDB();
  const { id } = req.params;

  const waste = db.prepare('SELECT * FROM waste_bins WHERE id = ?').get(id);
  if (!waste) {
    return res.status(404).json({ error: '废液桶不存在' });
  }

  const existingWorkorder = db.prepare(`
    SELECT * FROM transfer_workorders 
    WHERE waste_id = ? AND status = 'pending'
  `).get(id);

  if (existingWorkorder) {
    return res.status(400).json({ error: '该废液桶已有待处理的转运工单', workorder: existingWorkorder });
  }

  const workorderId = 'WT-' + Date.now().toString().slice(-8);

  db.prepare(`
    INSERT INTO transfer_workorders (id, waste_id, waste_name, level, status)
    VALUES (?, ?, ?, ?, ?)
  `).run(workorderId, id, waste.name, waste.level, 'pending');

  const workorder = db.prepare('SELECT * FROM transfer_workorders WHERE id = ?').get(workorderId);
  
  const alertId = uuidv4();
  db.prepare(`
    INSERT INTO alerts (id, type, title, description, level, related_id, related_type)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    alertId,
    'waste',
    '转运工单已创建',
    `已创建${waste.name}的转运工单，请及时处理`,
    'warning',
    workorderId,
    'transfer_workorder'
  );

  res.status(201).json(workorder);
});

router.get('/:id', (req, res) => {
  const db = getDB();
  const waste = db.prepare('SELECT * FROM waste_bins WHERE id = ?').get(req.params.id);
  
  if (!waste) {
    return res.status(404).json({ error: '废液桶不存在' });
  }
  
  res.json(waste);
});

router.put('/:id', (req, res) => {
  const db = getDB();
  const { id } = req.params;
  const { level, name } = req.body;

  const existing = db.prepare('SELECT * FROM waste_bins WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: '废液桶不存在' });
  }

  const newLevel = level !== undefined ? level : existing.level;
  const status = checkWasteStatus({ ...existing, level: newLevel });

  db.prepare(`
    UPDATE waste_bins 
    SET level = ?, name = ?, status = ?, last_updated = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    newLevel,
    name || existing.name,
    status,
    id
  );

  const updated = db.prepare('SELECT * FROM waste_bins WHERE id = ?').get(id);

  if (status === 'danger' && existing.status !== 'danger') {
    const alertId = uuidv4();
    db.prepare(`
      INSERT INTO alerts (id, type, title, description, level, related_id, related_type)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      alertId,
      'waste',
      '废液桶液位过高',
      `${updated.name}液位已达${newLevel}%，超过${WASTE_THRESHOLD}%阈值`,
      'danger',
      id,
      'waste_bin'
    );

    const workorderId = 'WT-' + Date.now().toString().slice(-8);
    db.prepare(`
      INSERT INTO transfer_workorders (id, waste_id, waste_name, level, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(workorderId, id, updated.name, newLevel, 'pending');
  }

  res.json(updated);
});

router.post('/:id/add-waste', (req, res) => {
  const db = getDB();
  const { id } = req.params;
  const { amount = 5 } = req.body;

  const existing = db.prepare('SELECT * FROM waste_bins WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: '废液桶不存在' });
  }

  const newLevel = Math.min(existing.level + amount, existing.capacity);
  const status = checkWasteStatus({ ...existing, level: newLevel });

  db.prepare(`
    UPDATE waste_bins 
    SET level = ?, status = ?, last_updated = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(newLevel, status, id);

  const updated = db.prepare('SELECT * FROM waste_bins WHERE id = ?').get(id);

  if (status === 'danger' && existing.status !== 'danger') {
    const alertId = uuidv4();
    db.prepare(`
      INSERT INTO alerts (id, type, title, description, level, related_id, related_type)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      alertId,
      'waste',
      '废液桶液位过高',
      `${updated.name}液位已达${newLevel}%，超过${WASTE_THRESHOLD}%阈值，请及时处理`,
      'danger',
      id,
      'waste_bin'
    );

    const workorderId = 'WT-' + Date.now().toString().slice(-8);
    db.prepare(`
      INSERT INTO transfer_workorders (id, waste_id, waste_name, level, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(workorderId, id, updated.name, newLevel, 'pending');
  }

  res.json(updated);
});

module.exports = { wasteRouter: router };
