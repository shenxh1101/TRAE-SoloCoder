const express = require('express');
const { getAll } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const vehicleStats = await getAll(`
      SELECT 
        status,
        COUNT(*) as count
      FROM vehicles 
      GROUP BY status
    `);

    const todayUsage = await getAll(`
      SELECT COUNT(*) as count
      FROM applications 
      WHERE DATE(start_time) = DATE('now')
    `);

    const violationCount = await getAll(`
      SELECT COUNT(*) as count
      FROM violation_records
    `);

    const totalVehicles = await getAll(`
      SELECT COUNT(*) as count
      FROM vehicles 
      WHERE status != 'disabled'
    `);

    const statsMap = {};
    vehicleStats.forEach(s => statsMap[s.status] = s.count);

    res.json({
      idleCount: statsMap['idle'] || 0,
      inUseCount: statsMap['in_use'] || 0,
      maintenanceCount: statsMap['maintenance'] || 0,
      todayUsage: todayUsage[0]?.count || 0,
      violationCount: violationCount[0]?.count || 0,
      totalVehicles: totalVehicles[0]?.count || 0
    });
  } catch (error) {
    console.error('获取看板统计错误:', error);
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

router.get('/violations', authenticateToken, async (req, res) => {
  try {
    const violations = await getAll(`
      SELECT * FROM violation_records
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    res.json(violations);
  } catch (error) {
    console.error('获取违规记录错误:', error);
    res.status(500).json({ error: '获取违规记录失败' });
  }
});

router.get('/monthly-cost', authenticateToken, async (req, res) => {
  try {
    const data = await getAll(`
      SELECT 
        strftime('%m月', created_at) as month,
        COUNT(*) as count,
        COALESCE(SUM(actual_cost), 0) as cost
      FROM applications
      WHERE status IN ('completed', 'approved', 'in_progress')
        AND created_at >= date('now', '-6 months')
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY strftime('%Y-%m', created_at)
    `);
    
    res.json(data);
  } catch (error) {
    console.error('获取月度费用错误:', error);
    res.status(500).json({ error: '获取月度费用失败' });
  }
});

router.get('/department-usage', authenticateToken, async (req, res) => {
  try {
    const data = await getAll(`
      SELECT 
        user_department as department,
        COUNT(*) as count,
        COALESCE(SUM(actual_cost), 0) as cost,
        COALESCE(SUM(actual_cost / 1.2), 0) as mileage
      FROM applications
      WHERE status IN ('completed', 'approved', 'in_progress')
      GROUP BY user_department
      ORDER BY count DESC
    `);
    
    res.json(data);
  } catch (error) {
    console.error('获取部门使用数据错误:', error);
    res.status(500).json({ error: '获取部门使用数据失败' });
  }
});

module.exports = router;
