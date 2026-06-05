const express = require('express');
const XLSX = require('xlsx');
const { getDB } = require('../database');

const router = express.Router();

router.get('/excel', (req, res) => {
  const db = getDB();
  const { start_date, end_date } = req.query;

  const wb = XLSX.utils.book_new();

  const instruments = db.prepare(`
    SELECT 
      name as 设备名称,
      runtime as 运行时间_h,
      maintenance_threshold as 保养阈值_h,
      ROUND((runtime * 100.0 / maintenance_threshold), 1) as 使用率_百分比,
      CASE WHEN locked = 1 THEN '已锁定' ELSE '运行中' END as 状态,
      last_updated as 最后更新
    FROM instruments
    ORDER BY id
  `).all();
  
  const ws1 = XLSX.utils.json_to_sheet(instruments);
  XLSX.utils.book_append_sheet(wb, ws1, '设备使用率');

  const reagents = db.prepare(`
    SELECT 
      name as 试剂名称,
      remaining as 当前剩余_百分比,
      capacity as 总量_百分比,
      (capacity - remaining) as 消耗量_百分比,
      expiry as 有效期,
      CASE WHEN status = 'warning' THEN '库存不足' ELSE '正常' END as 状态
    FROM reagents
    ORDER BY id
  `).all();
  
  const ws2 = XLSX.utils.json_to_sheet(reagents);
  XLSX.utils.book_append_sheet(wb, ws2, '试剂消耗');

  let alertsQuery = `
    SELECT 
      type as 事件类型,
      title as 事件标题,
      description as 事件描述,
      level as 警报级别,
      created_at as 发生时间,
      CASE WHEN acknowledged = 1 THEN '已确认' ELSE '待处理' END as 处理状态
    FROM alerts
  `;
  
  if (start_date && end_date) {
    alertsQuery += ` WHERE DATE(created_at) BETWEEN DATE('${start_date}') AND DATE('${end_date}')`;
  }
  alertsQuery += ' ORDER BY created_at DESC';
  
  const alerts = db.prepare(alertsQuery).all();
  
  const ws3 = XLSX.utils.json_to_sheet(alerts);
  XLSX.utils.book_append_sheet(wb, ws3, '异常事件');

  const schedules = db.prepare(`
    SELECT 
      resource_name as 资源名称,
      start_time as 开始时间,
      end_time as 结束时间,
      project as 项目名称,
      person as 负责人,
      priority as 优先级,
      CASE WHEN conflict = 1 THEN '有冲突' ELSE '正常' END as 状态,
      conflict_suggestion as 冲突建议
    FROM schedules
    ORDER BY resource_name, start_time
  `).all();
  
  const ws4 = XLSX.utils.json_to_sheet(schedules);
  XLSX.utils.book_append_sheet(wb, ws4, '预约调度');

  const accessLogs = db.prepare(`
    SELECT 
      person_name as 人员姓名,
      employee_id as 工号,
      access_point as 访问地点,
      CASE WHEN authorized = 1 THEN '已授权' ELSE '未授权' END as 授权状态,
      timestamp as 访问时间
    FROM access_logs
    ORDER BY timestamp DESC
    LIMIT 100
  `).all();
  
  const ws5 = XLSX.utils.json_to_sheet(accessLogs);
  XLSX.utils.book_append_sheet(wb, ws5, '门禁记录');

  const filename = `实验室数据统计_${new Date().toISOString().split('T')[0]}.xlsx`;
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
});

router.get('/statistics', (req, res) => {
  const db = getDB();

  const instrumentStats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'warning' THEN 1 ELSE 0 END) as need_maintenance,
      SUM(CASE WHEN locked = 1 THEN 1 ELSE 0 END) as locked,
      ROUND(AVG(runtime * 100.0 / maintenance_threshold), 1) as avg_utilization
    FROM instruments
  `).get();

  const reagentStats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'warning' THEN 1 ELSE 0 END) as low_stock,
      ROUND(AVG(remaining), 1) as avg_remaining
    FROM reagents
  `).get();

  const alertStats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN level = 'danger' THEN 1 ELSE 0 END) as danger_count,
      SUM(CASE WHEN level = 'warning' THEN 1 ELSE 0 END) as warning_count,
      SUM(CASE WHEN acknowledged = 0 THEN 1 ELSE 0 END) as unacknowledged
    FROM alerts
    WHERE DATE(created_at) = DATE('now')
  `).get();

  const scheduleStats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN conflict = 1 THEN 1 ELSE 0 END) as conflicts
    FROM schedules
  `).get();

  const wasteStats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'danger' THEN 1 ELSE 0 END) as need_transfer,
      ROUND(AVG(level), 1) as avg_level
    FROM waste_bins
  `).get();

  res.json({
    instruments: instrumentStats,
    reagents: reagentStats,
    alerts: alertStats,
    schedules: scheduleStats,
    waste: wasteStats
  });
});

module.exports = { exportRouter: router };
