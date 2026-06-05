const express = require('express');
const { getAll } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/monthly-cost', authenticateToken, async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 6;
    
    const data = getAll(`
      SELECT 
        strftime('%Y-%m', created_at) as monthKey,
        strftime('%m月', created_at) as month,
        COUNT(*) as count,
        COALESCE(SUM(CASE WHEN actual_cost THEN actual_cost ELSE estimated_cost END), 0) as cost
      FROM applications
      WHERE status IN ('completed', 'approved', 'in_progress')
        AND created_at >= date('now', '-${months} months')
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY strftime('%Y-%m', created_at)
    `);
    
    res.json(data);
  } catch (error) {
    console.error('获取月度费用报表错误:', error);
    res.status(500).json({ error: '获取月度费用报表失败' });
  }
});

router.get('/department-ranking', authenticateToken, async (req, res) => {
  try {
    const data = getAll(`
      SELECT 
        a.user_department as department,
        COUNT(*) as count,
        COALESCE(SUM(CASE WHEN a.actual_cost THEN a.actual_cost ELSE a.estimated_cost END), 0) as cost,
        COALESCE(SUM(r.actual_mileage), 0) as mileage
      FROM applications a
      LEFT JOIN return_records r ON r.application_id = a.id
      WHERE a.status IN ('completed', 'approved', 'in_progress')
      GROUP BY a.user_department
      ORDER BY count DESC
    `);
    
    res.json(data);
  } catch (error) {
    console.error('获取部门排行报表错误:', error);
    res.status(500).json({ error: '获取部门排行报表失败' });
  }
});

router.get('/vehicle-usage', authenticateToken, async (req, res) => {
  try {
    const data = getAll(`
      SELECT 
        v.id as vehicleId,
        v.plate_number as plateNumber,
        v.model,
        COUNT(a.id) as usageCount,
        COALESCE(SUM(CASE WHEN a.actual_cost THEN a.actual_cost ELSE a.estimated_cost END), 0) as totalCost,
        COALESCE(SUM(r.actual_mileage), 0) as totalMileage
      FROM vehicles v
      LEFT JOIN applications a ON a.vehicle_id = v.id AND a.status IN ('completed', 'approved', 'in_progress')
      LEFT JOIN return_records r ON r.application_id = a.id
      GROUP BY v.id
      ORDER BY usageCount DESC
    `);
    
    res.json(data);
  } catch (error) {
    console.error('获取车辆使用报表错误:', error);
    res.status(500).json({ error: '获取车辆使用报表失败' });
  }
});

router.get('/applications-export', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, department, vehicleId } = req.query;
    
    let sql = `
      SELECT 
        a.id,
        a.user_name as userName,
        a.user_department as userDepartment,
        a.vehicle_plate as vehiclePlate,
        a.vehicle_model as vehicleModel,
        a.purpose,
        a.people_count as peopleCount,
        a.start_time as startTime,
        a.end_time as endTime,
        a.status,
        a.estimated_cost as estimatedCost,
        a.actual_cost as actualCost,
        a.created_at as createdAt,
        a.approved_at as approvedAt,
        a.approval_comment as approvalComment,
        a.escalated,
        r.actual_mileage as actualMileage,
        r.fuel_level as fuelLevel,
        r.has_damage as hasDamage
      FROM applications a
      LEFT JOIN return_records r ON r.application_id = a.id
      WHERE 1=1
    `;
    let params = [];
    
    if (startDate) { sql += ' AND a.start_time >= ?'; params.push(startDate); }
    if (endDate) { sql += ' AND a.end_time <= ?'; params.push(endDate); }
    if (department) { sql += ' AND a.user_department = ?'; params.push(department); }
    if (vehicleId) { sql += ' AND a.vehicle_id = ?'; params.push(vehicleId); }
    
    sql += ' ORDER BY a.created_at DESC';
    
    const data = getAll(sql, params);
    
    res.json(data);
  } catch (error) {
    console.error('导出申请数据错误:', error);
    res.status(500).json({ error: '导出申请数据失败' });
  }
});

module.exports = router;
