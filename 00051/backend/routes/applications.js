const express = require('express');
const { getOne, getAll, runQuery } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

const generateId = () => Math.random().toString(36).substring(2, 11);

const formatApplication = (app) => ({
  id: app.id,
  userId: app.user_id,
  userName: app.user_name,
  userDepartment: app.user_department,
  vehicleId: app.vehicle_id,
  vehiclePlate: app.vehicle_plate,
  vehicleModel: app.vehicle_model,
  purpose: app.purpose,
  peopleCount: app.people_count,
  startTime: app.start_time,
  endTime: app.end_time,
  status: app.status,
  approverId: app.approver_id,
  approvalLevel: app.approval_level,
  approvalComment: app.approval_comment,
  escalated: app.escalated === 1,
  estimatedCost: app.estimated_cost,
  actualCost: app.actual_cost,
  createdAt: app.created_at,
  approvedAt: app.approved_at
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, vehicleId, department, startDate, endDate, userId } = req.query;
    
    let sql = 'SELECT * FROM applications WHERE 1=1';
    let params = [];
    
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (vehicleId) { sql += ' AND vehicle_id = ?'; params.push(vehicleId); }
    if (department) { sql += ' AND user_department = ?'; params.push(department); }
    if (startDate) { sql += ' AND start_time >= ?'; params.push(startDate); }
    if (endDate) { sql += ' AND end_time <= ?'; params.push(endDate); }
    if (userId) { sql += ' AND user_id = ?'; params.push(userId); }
    
    sql += ' ORDER BY created_at DESC';
    
    const applications = await getAll(sql, params);
    const formatted = applications.map(formatApplication);
    
    res.json(formatted);
  } catch (error) {
    console.error('获取申请列表错误:', error);
    res.status(500).json({ error: '获取申请列表失败' });
  }
});

router.get('/pending-approvals', authenticateToken, async (req, res) => {
  try {
    const { role, department } = req.user;
    
    let sql = 'SELECT * FROM applications WHERE status = ?';
    let params = ['pending'];
    
    if (role === 'manager') {
      sql += ' AND user_department = ? AND approval_level = ? AND escalated = 0';
      params.push(department, 'department');
    } else if (role === 'admin') {
      sql += ' AND (approval_level = ? OR escalated = 1)';
      params.push('admin');
    } else {
      return res.json([]);
    }
    
    sql += ' ORDER BY created_at ASC';
    
    const applications = await getAll(sql, params);
    const formatted = applications.map(formatApplication);
    
    res.json(formatted);
  } catch (error) {
    console.error('获取待审批列表错误:', error);
    res.status(500).json({ error: '获取待审批列表失败' });
  }
});

router.get('/calendar-events', authenticateToken, async (req, res) => {
  try {
    const applications = await getAll(`
      SELECT id, user_name as userName, vehicle_plate as title, start_time as start, end_time as end, status
      FROM applications 
      WHERE status IN ('approved', 'in_progress')
    `);
    
    const maintenance = await getAll(`
      SELECT m.id, v.plate_number as title, m.created_at as start, 
             COALESCE(m.completed_at, DATETIME(m.created_at, '+3 days')) as end, m.status
      FROM maintenance_records m
      JOIN vehicles v ON m.vehicle_id = v.id
      WHERE m.status != 'completed'
    `);
    
    const events = [
      ...applications.map(a => ({ ...a, title: `${a.userName} - ${a.title}`, type: 'booking' })),
      ...maintenance.map(m => ({ ...m, title: `维修 - ${m.title}`, type: 'maintenance' }))
    ];
    
    res.json(events);
  } catch (error) {
    console.error('获取日历事件错误:', error);
    res.status(500).json({ error: '获取日历事件失败' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const app = await getOne('SELECT * FROM applications WHERE id = ?', [req.params.id]);
    
    if (!app) {
      return res.status(404).json({ error: '申请不存在' });
    }
    
    res.json(formatApplication(app));
  } catch (error) {
    console.error('获取申请详情错误:', error);
    res.status(500).json({ error: '获取申请详情失败' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { vehicleId, vehiclePlate, vehicleModel, purpose, peopleCount, startTime, endTime, estimatedCost, approvalLevel = 'department' } = req.body;
    const { id: userId, name: userName, department: userDepartment } = req.user;

    if (!vehicleId || !purpose || !peopleCount || !startTime || !endTime) {
      return res.status(400).json({ error: '请填写完整信息' });
    }

    const id = 'a' + generateId();
    
    await runQuery(
      `INSERT INTO applications 
       (id, user_id, user_name, user_department, vehicle_id, vehicle_plate, vehicle_model, 
        purpose, people_count, start_time, end_time, estimated_cost, approval_level, status, escalated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0)`,
      [id, userId, userName, userDepartment, vehicleId, vehiclePlate, vehicleModel, 
       purpose, peopleCount, startTime, endTime, estimatedCost || 0, approvalLevel]
    );

    const application = await getOne('SELECT * FROM applications WHERE id = ?', [id]);
    res.status(201).json(formatApplication(application));
  } catch (error) {
    console.error('创建申请错误:', error);
    res.status(500).json({ error: '创建申请失败' });
  }
});

router.put('/:id/approve', authenticateToken, requireRole(['manager', 'admin']), async (req, res) => {
  try {
    const { comment } = req.body;
    const { id: approverId } = req.user;
    const applicationId = req.params.id;

    const application = await getOne('SELECT * FROM applications WHERE id = ?', [applicationId]);
    if (!application) {
      return res.status(404).json({ error: '申请不存在' });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({ error: '该申请已被处理' });
    }

    await runQuery(
      'UPDATE applications SET status = ?, approver_id = ?, approval_comment = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['approved', approverId, comment || null, applicationId]
    );

    await runQuery('UPDATE vehicles SET status = ? WHERE id = ?', ['in_use', application.vehicle_id]);

    const updated = await getOne('SELECT * FROM applications WHERE id = ?', [applicationId]);
    res.json(formatApplication(updated));
  } catch (error) {
    console.error('审批申请错误:', error);
    res.status(500).json({ error: '审批申请失败' });
  }
});

router.put('/:id/reject', authenticateToken, requireRole(['manager', 'admin']), async (req, res) => {
  try {
    const { comment } = req.body;
    const { id: approverId } = req.user;
    const applicationId = req.params.id;

    const application = await getOne('SELECT * FROM applications WHERE id = ?', [applicationId]);
    if (!application) {
      return res.status(404).json({ error: '申请不存在' });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({ error: '该申请已被处理' });
    }

    await runQuery(
      'UPDATE applications SET status = ?, approver_id = ?, approval_comment = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['rejected', approverId, comment || null, applicationId]
    );

    const updated = await getOne('SELECT * FROM applications WHERE id = ?', [applicationId]);
    res.json(formatApplication(updated));
  } catch (error) {
    console.error('拒绝申请错误:', error);
    res.status(500).json({ error: '拒绝申请失败' });
  }
});

router.put('/:id/complete', authenticateToken, async (req, res) => {
  try {
    const { actualCost } = req.body;
    const applicationId = req.params.id;

    const application = await getOne('SELECT * FROM applications WHERE id = ?', [applicationId]);
    if (!application) {
      return res.status(404).json({ error: '申请不存在' });
    }

    if (!['approved', 'in_progress'].includes(application.status)) {
      return res.status(400).json({ error: '该申请无法完成' });
    }

    await runQuery(
      'UPDATE applications SET status = ?, actual_cost = ? WHERE id = ?',
      ['completed', actualCost || application.estimated_cost, applicationId]
    );

    await runQuery('UPDATE vehicles SET status = ? WHERE id = ?', ['idle', application.vehicle_id]);

    const updated = await getOne('SELECT * FROM applications WHERE id = ?', [applicationId]);
    res.json(formatApplication(updated));
  } catch (error) {
    console.error('完成申请错误:', error);
    res.status(500).json({ error: '完成申请失败' });
  }
});

module.exports = router;
