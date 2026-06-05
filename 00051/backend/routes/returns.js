const express = require('express');
const { getOne, getAll, runQuery } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const generateId = () => Math.random().toString(36).substring(2, 11);

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.query;
    let sql = 'SELECT * FROM return_records';
    let params = [];
    
    if (userId) {
      sql += ' WHERE application_id IN (SELECT id FROM applications WHERE user_id = ?)';
      params.push(userId);
    }
    
    sql += ' ORDER BY returned_at DESC';
    
    const records = await getAll(sql, params);
    const formatted = records.map(r => ({
      ...r,
      applicationId: r.application_id,
      actualMileage: r.actual_mileage,
      fuelLevel: r.fuel_level,
      inspectionPhotos: r.inspection_photos ? JSON.parse(r.inspection_photos) : [],
      hasDamage: r.has_damage === 1,
      damageDescription: r.damage_description,
      returnedAt: r.returned_at
    }));
    
    res.json(formatted);
  } catch (error) {
    console.error('获取还车记录错误:', error);
    res.status(500).json({ error: '获取还车记录失败' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { applicationId, actualMileage, fuelLevel, inspectionPhotos, hasDamage, damageDescription } = req.body;

    if (!applicationId || !actualMileage || fuelLevel === undefined) {
      return res.status(400).json({ error: '请填写完整信息' });
    }

    const application = await getOne('SELECT * FROM applications WHERE id = ?', [applicationId]);
    if (!application) {
      return res.status(404).json({ error: '申请不存在' });
    }

    if (!['approved', 'in_progress'].includes(application.status)) {
      return res.status(400).json({ error: '该申请无法还车' });
    }

    const id = 'r' + generateId();
    await runQuery(
      `INSERT INTO return_records 
       (id, application_id, actual_mileage, fuel_level, inspection_photos, has_damage, damage_description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, applicationId, actualMileage, fuelLevel, 
       JSON.stringify(inspectionPhotos || []), 
       hasDamage ? 1 : 0, 
       damageDescription || null]
    );

    await runQuery(
      'UPDATE applications SET status = ?, actual_cost = ? WHERE id = ?',
      ['completed', application.estimated_cost, applicationId]
    );

    await runQuery(
      'UPDATE vehicles SET status = ?, current_mileage = ?, fuel_level = ? WHERE id = ?',
      ['idle', actualMileage, fuelLevel, application.vehicle_id]
    );

    const record = await getOne('SELECT * FROM return_records WHERE id = ?', [id]);
    const formatted = {
      ...record,
      applicationId: record.application_id,
      actualMileage: record.actual_mileage,
      fuelLevel: record.fuel_level,
      inspectionPhotos: record.inspection_photos ? JSON.parse(record.inspection_photos) : [],
      hasDamage: record.has_damage === 1,
      damageDescription: record.damage_description,
      returnedAt: record.returned_at
    };
    
    res.status(201).json(formatted);
  } catch (error) {
    console.error('创建还车记录错误:', error);
    res.status(500).json({ error: '还车登记失败' });
  }
});

module.exports = router;
