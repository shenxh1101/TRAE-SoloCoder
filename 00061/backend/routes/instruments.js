const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../database');

const router = express.Router();

function checkInstrumentStatus(instrument) {
  const needsMaintenance = instrument.runtime >= instrument.maintenance_threshold;
  return {
    status: needsMaintenance ? 'warning' : 'normal',
    locked: needsMaintenance ? 1 : instrument.locked
  };
}

router.get('/', (req, res) => {
  const db = getDB();
  const instruments = db.prepare('SELECT * FROM instruments ORDER BY id').all();
  res.json(instruments);
});

router.get('/maintenance/workorders', (req, res) => {
  const db = getDB();
  const workorders = db.prepare('SELECT * FROM maintenance_workorders ORDER BY created_at DESC').all();
  res.json(workorders);
});

router.post('/maintenance/workorders', (req, res) => {
  const db = getDB();
  const { instrument_id, maintenance_type, scheduled_date, description } = req.body;

  const instrument = db.prepare('SELECT * FROM instruments WHERE id = ?').get(instrument_id);
  if (!instrument) {
    return res.status(404).json({ error: '仪器不存在' });
  }

  const workorderId = 'WO-' + Date.now().toString().slice(-8);

  db.prepare(`
    INSERT INTO maintenance_workorders (id, instrument_id, instrument_name, runtime, maintenance_type, scheduled_date, description, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    workorderId,
    instrument_id,
    instrument.name,
    instrument.runtime,
    maintenance_type || '常规保养',
    scheduled_date || new Date(Date.now() + 86400000).toISOString().split('T')[0],
    description || `仪器累计运行时间${instrument.runtime}小时，超过保养阈值，需要进行保养维护`,
    'pending'
  );

  const workorder = db.prepare('SELECT * FROM maintenance_workorders WHERE id = ?').get(workorderId);
  
  const alertId = uuidv4();
  db.prepare(`
    INSERT INTO alerts (id, type, title, description, level, related_id, related_type)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    alertId,
    'maintenance',
    '保养工单已创建',
    `已创建${instrument.name}的保养工单`,
    'info',
    workorderId,
    'maintenance_workorder'
  );

  res.status(201).json(workorder);
});

router.put('/maintenance/workorders/:id', (req, res) => {
  const db = getDB();
  const { id } = req.params;
  const { status } = req.body;

  const existing = db.prepare('SELECT * FROM maintenance_workorders WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: '工单不存在' });
  }

  if (status === 'completed') {
    db.prepare(`
      UPDATE maintenance_workorders 
      SET status = ?, completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, id);

    db.prepare(`
      UPDATE instruments 
      SET runtime = 0, status = 'normal', locked = 0, last_maintenance = CURRENT_TIMESTAMP, last_updated = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(existing.instrument_id);

    const alertId = uuidv4();
    db.prepare(`
      INSERT INTO alerts (id, type, title, description, level, related_id, related_type)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      alertId,
      'maintenance',
      '保养完成',
      `${existing.instrument_name}保养完成，仪器已解锁`,
      'info',
      existing.instrument_id,
      'instrument'
    );
  } else {
    db.prepare('UPDATE maintenance_workorders SET status = ? WHERE id = ?').run(status, id);
  }

  const updated = db.prepare('SELECT * FROM maintenance_workorders WHERE id = ?').get(id);
  res.json(updated);
});

router.post('/:id/maintenance-order', (req, res) => {
  const db = getDB();
  const { id } = req.params;
  const { maintenance_type, scheduled_date, description } = req.body;

  const instrument = db.prepare('SELECT * FROM instruments WHERE id = ?').get(id);
  if (!instrument) {
    return res.status(404).json({ error: '仪器不存在' });
  }

  const existingWorkorder = db.prepare(`
    SELECT * FROM maintenance_workorders 
    WHERE instrument_id = ? AND status = 'pending'
  `).get(id);

  if (existingWorkorder) {
    return res.status(400).json({ error: '该仪器已有待处理的保养工单', workorder: existingWorkorder });
  }

  const workorderId = 'WO-' + Date.now().toString().slice(-8);

  db.prepare(`
    INSERT INTO maintenance_workorders (id, instrument_id, instrument_name, runtime, maintenance_type, scheduled_date, description, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    workorderId,
    id,
    instrument.name,
    instrument.runtime,
    maintenance_type || '常规保养',
    scheduled_date || new Date(Date.now() + 86400000).toISOString().split('T')[0],
    description || `仪器累计运行时间${instrument.runtime}小时，超过保养阈值，需要进行保养维护`,
    'pending'
  );

  db.prepare(`
    UPDATE instruments 
    SET locked = 1, status = 'warning', last_updated = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(id);

  const workorder = db.prepare('SELECT * FROM maintenance_workorders WHERE id = ?').get(workorderId);
  
  const alertId = uuidv4();
  db.prepare(`
    INSERT INTO alerts (id, type, title, description, level, related_id, related_type)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    alertId,
    'maintenance',
    '保养工单已创建',
    `已创建${instrument.name}的保养工单，仪器已锁定`,
    'warning',
    workorderId,
    'maintenance_workorder'
  );

  res.status(201).json(workorder);
});

router.get('/:id', (req, res) => {
  const db = getDB();
  const instrument = db.prepare('SELECT * FROM instruments WHERE id = ?').get(req.params.id);
  
  if (!instrument) {
    return res.status(404).json({ error: '仪器不存在' });
  }
  
  res.json(instrument);
});

router.put('/:id', (req, res) => {
  const db = getDB();
  const { id } = req.params;
  const { runtime, name, maintenance_threshold, locked } = req.body;

  const existing = db.prepare('SELECT * FROM instruments WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: '仪器不存在' });
  }

  const newRuntime = runtime !== undefined ? runtime : existing.runtime;
  const { status, locked: newLocked } = checkInstrumentStatus({ 
    ...existing, 
    runtime: newRuntime,
    locked: locked !== undefined ? locked : existing.locked
  });

  db.prepare(`
    UPDATE instruments 
    SET runtime = ?, name = ?, maintenance_threshold = ?, status = ?, locked = ?, last_updated = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    newRuntime,
    name || existing.name,
    maintenance_threshold || existing.maintenance_threshold,
    status,
    newLocked,
    id
  );

  const updated = db.prepare('SELECT * FROM instruments WHERE id = ?').get(id);

  if (status === 'warning' && existing.status !== 'warning') {
    const alertId = uuidv4();
    db.prepare(`
      INSERT INTO alerts (id, type, title, description, level, related_id, related_type)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      alertId,
      'maintenance',
      '仪器需要保养',
      `${updated.name}累计运行时间${newRuntime}小时，超过保养阈值`,
      'warning',
      id,
      'instrument'
    );
  }

  res.json(updated);
});

router.post('/:id/add-runtime', (req, res) => {
  const db = getDB();
  const { id } = req.params;
  const { hours = 1 } = req.body;

  const existing = db.prepare('SELECT * FROM instruments WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: '仪器不存在' });
  }

  const newRuntime = existing.runtime + hours;
  const { status, locked } = checkInstrumentStatus({ ...existing, runtime: newRuntime });

  db.prepare(`
    UPDATE instruments 
    SET runtime = ?, status = ?, locked = ?, last_updated = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(newRuntime, status, locked, id);

  const updated = db.prepare('SELECT * FROM instruments WHERE id = ?').get(id);

  if (status === 'warning' && existing.status !== 'warning') {
    const alertId = uuidv4();
    db.prepare(`
      INSERT INTO alerts (id, type, title, description, level, related_id, related_type)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      alertId,
      'maintenance',
      '仪器需要保养',
      `${updated.name}累计运行时间${newRuntime}小时，超过保养阈值，仪器已锁定`,
      'warning',
      id,
      'instrument'
    );
  }

  res.json(updated);
});

router.post('/:id/lock', (req, res) => {
  const db = getDB();
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM instruments WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: '仪器不存在' });
  }

  db.prepare('UPDATE instruments SET locked = 1, last_updated = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  const updated = db.prepare('SELECT * FROM instruments WHERE id = ?').get(id);
  res.json(updated);
});

router.post('/:id/unlock', (req, res) => {
  const db = getDB();
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM instruments WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: '仪器不存在' });
  }

  db.prepare('UPDATE instruments SET locked = 0, last_updated = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  const updated = db.prepare('SELECT * FROM instruments WHERE id = ?').get(id);
  res.json(updated);
});

module.exports = { instrumentsRouter: router };
