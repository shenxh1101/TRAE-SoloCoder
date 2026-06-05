const express = require('express');
const { getOne, getAll, runQuery } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

const generateId = () => Math.random().toString(36).substring(2, 11);

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT * FROM maintenance_records';
    let params = [];
    
    if (status) { sql += ' WHERE status = ?'; params.push(status); }
    
    sql += ' ORDER BY created_at DESC';
    
    const records = await getAll(sql, params);
    const formatted = records.map(r => ({
      ...r,
      vehicleId: r.vehicle_id,
      applicationId: r.application_id,
      estimatedCost: r.estimated_cost,
      actualCost: r.actual_cost,
      createdAt: r.created_at,
      completedAt: r.completed_at
    }));
    
    res.json(formatted);
  } catch (error) {
    console.error('获取维修记录错误:', error);
    res.status(500).json({ error: '获取维修记录失败' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { vehicleId, applicationId, description, estimatedCost } = req.body;

    if (!vehicleId || !description) {
      return res.status(400).json({ error: '请填写完整信息' });
    }

    const id = 'm' + generateId();
    await runQuery(
      `INSERT INTO maintenance_records 
       (id, vehicle_id, application_id, description, estimated_cost, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [id, vehicleId, applicationId || null, description, estimatedCost || 0]
    );

    await runQuery('UPDATE vehicles SET status = ? WHERE id = ?', ['maintenance', vehicleId]);

    const record = await getOne('SELECT * FROM maintenance_records WHERE id = ?', [id]);
    const formatted = {
      ...record,
      vehicleId: record.vehicle_id,
      applicationId: record.application_id,
      estimatedCost: record.estimated_cost,
      actualCost: record.actual_cost,
      createdAt: record.created_at,
      completedAt: record.completed_at
    };
    
    res.status(201).json(formatted);
  } catch (error) {
    console.error('创建维修记录错误:', error);
    res.status(500).json({ error: '创建维修记录失败' });
  }
});

router.put('/:id/status', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { status, actualCost } = req.body;
    const maintenanceId = req.params.id;

    const record = await getOne('SELECT * FROM maintenance_records WHERE id = ?', [maintenanceId]);
    if (!record) {
      return res.status(404).json({ error: '维修记录不存在' });
    }

    if (status === 'completed') {
      await runQuery(
        'UPDATE maintenance_records SET status = ?, actual_cost = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['completed', actualCost || record.estimated_cost, maintenanceId]
      );
      await runQuery('UPDATE vehicles SET status = ? WHERE id = ?', ['idle', record.vehicle_id]);
    } else {
      await runQuery(
        'UPDATE maintenance_records SET status = ? WHERE id = ?',
        [status, maintenanceId]
      );
    }

    const updated = await getOne('SELECT * FROM maintenance_records WHERE id = ?', [maintenanceId]);
    const formatted = {
      ...updated,
      vehicleId: updated.vehicle_id,
      applicationId: updated.application_id,
      estimatedCost: updated.estimated_cost,
      actualCost: updated.actual_cost,
      createdAt: updated.created_at,
      completedAt: updated.completed_at
    };
    
    res.json(formatted);
  } catch (error) {
    console.error('更新维修状态错误:', error);
    res.status(500).json({ error: '更新维修状态失败' });
  }
});

module.exports = router;
