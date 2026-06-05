const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../database');

const router = express.Router();

function checkThresholds(table) {
  let status = 'normal';
  let alerts = [];

  if (table.temp > table.temp_threshold) {
    status = 'danger';
    alerts.push({
      type: 'temperature',
      title: '温度超阈值',
      description: `${table.name}温度${table.temp}°C超过阈值${table.temp_threshold}°C`,
      level: 'danger'
    });
  }

  if (table.ph < table.ph_min || table.ph > table.ph_max) {
    status = 'danger';
    alerts.push({
      type: 'ph',
      title: 'pH值异常',
      description: `${table.name} pH值${table.ph}超出正常范围[${table.ph_min}, ${table.ph_max}]`,
      level: 'danger'
    });
  }

  return { status, alerts };
}

router.get('/', (req, res) => {
  const db = getDB();
  const tables = db.prepare('SELECT * FROM experiment_tables ORDER BY id').all();
  res.json(tables);
});

router.get('/:id', (req, res) => {
  const db = getDB();
  const table = db.prepare('SELECT * FROM experiment_tables WHERE id = ?').get(req.params.id);
  
  if (!table) {
    return res.status(404).json({ error: '实验台不存在' });
  }
  
  res.json(table);
});

router.put('/:id', (req, res) => {
  const db = getDB();
  const { id } = req.params;
  const { temp, ph, project, person } = req.body;

  const existingTable = db.prepare('SELECT * FROM experiment_tables WHERE id = ?').get(id);
  if (!existingTable) {
    return res.status(404).json({ error: '实验台不存在' });
  }

  const updatedTable = { ...existingTable, ...req.body };
  const { status, alerts } = checkThresholds(updatedTable);

  const updateStmt = db.prepare(`
    UPDATE experiment_tables 
    SET temp = ?, ph = ?, project = ?, person = ?, status = ?, last_updated = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  
  updateStmt.run(
    temp !== undefined ? temp : existingTable.temp,
    ph !== undefined ? ph : existingTable.ph,
    project || existingTable.project,
    person || existingTable.person,
    status,
    id
  );

  const alertStmt = db.prepare(`
    INSERT INTO alerts (id, type, title, description, level, related_id, related_type)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  alerts.forEach(alert => {
    alertStmt.run(
      uuidv4(),
      alert.type,
      alert.title,
      alert.description,
      alert.level,
      id,
      'experiment_table'
    );
  });

  const updated = db.prepare('SELECT * FROM experiment_tables WHERE id = ?').get(id);
  res.json({ table: updated, alerts, status });
});

router.post('/simulate', (req, res) => {
  const db = getDB();
  const { id, type } = req.body;

  const table = db.prepare('SELECT * FROM experiment_tables WHERE id = ?').get(id);
  if (!table) {
    return res.status(404).json({ error: '实验台不存在' });
  }

  let newTemp = table.temp;
  let newPh = table.ph;

  if (type === 'temperature' || type === 'both') {
    newTemp = table.temp_threshold + Math.random() * 5 + 1;
  }

  if (type === 'ph' || type === 'both') {
    newPh = table.ph_max + Math.random() * 2 + 0.5;
  }

  const { status, alerts } = checkThresholds({ ...table, temp: newTemp, ph: newPh });

  db.prepare(`
    UPDATE experiment_tables 
    SET temp = ?, ph = ?, status = ?, last_updated = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(newTemp, newPh, status, id);

  const alertStmt = db.prepare(`
    INSERT INTO alerts (id, type, title, description, level, related_id, related_type)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  alerts.forEach(alert => {
    alertStmt.run(
      uuidv4(),
      alert.type,
      alert.title,
      alert.description,
      alert.level,
      id,
      'experiment_table'
    );
  });

  const updated = db.prepare('SELECT * FROM experiment_tables WHERE id = ?').get(id);
  res.json({ table: updated, alerts, status });
});

module.exports = { experimentTablesRouter: router };
