const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../database');

const router = express.Router();

router.get('/authorized-persons', (req, res) => {
  const db = getDB();
  const persons = db.prepare('SELECT * FROM authorized_persons WHERE is_active = 1').all();
  res.json(persons);
});

router.get('/access-logs', (req, res) => {
  const db = getDB();
  const logs = db.prepare(`
    SELECT * FROM access_logs 
    ORDER BY timestamp DESC 
    LIMIT 50
  `).all();
  res.json(logs);
});

router.post('/face-scan', async (req, res) => {
  const db = getDB();
  const { person_name, employee_id, access_point = 'P3实验室' } = req.body;

  if (!person_name) {
    return res.status(400).json({ error: '缺少人员信息' });
  }

  let authorized = false;
  let person = null;

  if (employee_id) {
    person = db.prepare(`
      SELECT * FROM authorized_persons 
      WHERE employee_id = ? AND is_active = 1 AND access_level >= 3
    `).get(employee_id);
  } else {
    person = db.prepare(`
      SELECT * FROM authorized_persons 
      WHERE name = ? AND is_active = 1 AND access_level >= 3
    `).get(person_name);
  }

  authorized = !!person;

  const logId = uuidv4();
  db.prepare(`
    INSERT INTO access_logs (id, person_name, employee_id, access_point, authorized)
    VALUES (?, ?, ?, ?, ?)
  `).run(logId, person_name, person?.employee_id || employee_id || null, access_point, authorized ? 1 : 0);

  if (!authorized) {
    const alertId = uuidv4();
    db.prepare(`
      INSERT INTO alerts (id, type, title, description, level, related_id, related_type)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      alertId,
      'access',
      '非授权进入警报',
      `${person_name}尝试进入${access_point}，已拒绝`,
      'danger',
      logId,
      'access_log'
    );

    return res.json({
      success: false,
      authorized: false,
      message: '识别失败！未授权人员',
      person: null
    });
  }

  res.json({
    success: true,
    authorized: true,
    message: `识别成功！欢迎 ${person.name}`,
    person: {
      id: person.id,
      name: person.name,
      employee_id: person.employee_id,
      department: person.department,
      access_level: person.access_level
    }
  });
});

router.post('/verify-authorized', (req, res) => {
  const db = getDB();
  const { name } = req.body;

  const person = db.prepare(`
    SELECT * FROM authorized_persons 
    WHERE name = ? AND is_active = 1
  `).get(name);

  if (!person) {
    return res.json({ authorized: false, message: '未找到该人员' });
  }

  const hasP3Access = person.access_level >= 3;
  
  res.json({
    authorized: hasP3Access,
    person: {
      name: person.name,
      employee_id: person.employee_id,
      department: person.department,
      access_level: person.access_level
    }
  });
});

router.post('/add-authorized', (req, res) => {
  const db = getDB();
  const { name, employee_id, department, access_level = 1 } = req.body;

  if (!name || !employee_id) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  const existing = db.prepare('SELECT * FROM authorized_persons WHERE employee_id = ?').get(employee_id);
  if (existing) {
    return res.status(400).json({ error: '该工号已存在' });
  }

  const id = 'p' + Date.now().toString().slice(-6);
  
  db.prepare(`
    INSERT INTO authorized_persons (id, name, employee_id, department, access_level, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run(id, name, employee_id, department || '', access_level);

  const person = db.prepare('SELECT * FROM authorized_persons WHERE id = ?').get(id);
  res.status(201).json(person);
});

module.exports = { accessRouter: router };
