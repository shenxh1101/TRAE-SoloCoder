import { Router, type Request, type Response } from 'express'
import db from '../database.js'

const router = Router()

router.get('/overview', (_req: Request, res: Response): void => {
  try {
    const totalPatients = db.prepare('SELECT COUNT(*) as count FROM patients').get() as any
    const redCount = db.prepare('SELECT COUNT(*) as count FROM patients WHERE triage_level = \'red\'').get() as any
    const yellowCount = db.prepare('SELECT COUNT(*) as count FROM patients WHERE triage_level = \'yellow\'').get() as any
    const greenCount = db.prepare('SELECT COUNT(*) as count FROM patients WHERE triage_level = \'green\'').get() as any
    const waitingCount = db.prepare('SELECT COUNT(*) as count FROM patients WHERE status = \'waiting\'').get() as any
    const treatingCount = db.prepare('SELECT COUNT(*) as count FROM patients WHERE status = \'treating\'').get() as any
    const observingCount = db.prepare('SELECT COUNT(*) as count FROM patients WHERE status = \'observation\'').get() as any
    const dischargedCount = db.prepare('SELECT COUNT(*) as count FROM patients WHERE status = \'discharged\'').get() as any
    const examiningCount = db.prepare('SELECT COUNT(*) as count FROM patients WHERE status = \'examining\'').get() as any

    const totalRevenue = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM billing_items').get() as any
    const settledRevenue = db.prepare('SELECT COALESCE(SUM(total_amount), 0) as total FROM settlements').get() as any

    const unacknowledgedAlerts = db.prepare('SELECT COUNT(*) as count FROM alerts WHERE acknowledged = 0').get() as any

    const avgStayRaw = db.prepare(`
      SELECT AVG(strftime('%s', updated_at) - strftime('%s', created_at)) as avg_seconds
      FROM patients WHERE status = 'discharged'
    `).get() as any
    const avgStayMinutes = avgStayRaw.avg_seconds ? Math.round(avgStayRaw.avg_seconds / 60) : 0

    const criticalRatio = totalPatients.count > 0 ? Math.round((redCount.count / totalPatients.count) * 10000) / 100 : 0
    const mortalityRate = 0

    const dailyCountsRaw = db.prepare(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM patients
      WHERE created_at >= DATE('now', '-7 days')
      GROUP BY DATE(created_at)
      ORDER BY date
    `).all() as any[]
    const dailyCounts = dailyCountsRaw.map(d => ({
      date: d.date,
      count: d.count,
    }))

    res.json({
      success: true,
      data: {
        totalPatients: totalPatients.count,
        avgStayMinutes,
        criticalRatio,
        mortalityRate,
        redCount: redCount.count,
        yellowCount: yellowCount.count,
        greenCount: greenCount.count,
        dailyCounts,
        totalRevenue: totalRevenue.total,
        totalAlerts: unacknowledgedAlerts.count,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取统计概览失败' })
  }
})

router.get('/by-department', (_req: Request, res: Response): void => {
  try {
    const rooms = db.prepare('SELECT * FROM rooms').all() as any[]
    const result = rooms.map(room => {
      const patientCount = db.prepare('SELECT COUNT(*) as count FROM patients WHERE assigned_room_id = ? AND status NOT IN (\'discharged\', \'transfer\')').get(room.id) as any
      const avgStayRaw = db.prepare(`
        SELECT AVG(strftime('%s', updated_at) - strftime('%s', created_at)) as avg_seconds
        FROM patients WHERE assigned_room_id = ? AND status = 'discharged'
      `).get(room.id) as any
      const redCount = db.prepare('SELECT COUNT(*) as count FROM patients WHERE assigned_room_id = ? AND triage_level = \'red\'').get(room.id) as any

      const dischargedCount = db.prepare('SELECT COUNT(*) as count FROM patients WHERE assigned_room_id = ? AND status = \'discharged\'').get(room.id) as any
      const total = patientCount.count + dischargedCount.count
      const avgStay = avgStayRaw.avg_seconds ? Math.round(avgStayRaw.avg_seconds / 60) : 0
      const criticalRatio = total > 0 ? Math.round((redCount.count / total) * 10000) / 100 : 0

      return {
        department: room.name,
        patientCount: patientCount.count,
        avgStay,
        criticalRatio,
        mortalityCount: 0,
      }
    })

    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取科室统计失败' })
  }
})

router.get('/by-diagnosis', (_req: Request, res: Response): void => {
  try {
    const diagnosesRaw = db.prepare(`
      SELECT chief_complaint as diagnosis, COUNT(*) as count
      FROM patients
      GROUP BY chief_complaint
      ORDER BY count DESC
      LIMIT 10
    `).all() as any[]

    const result = diagnosesRaw.map(d => {
      const redCount = db.prepare('SELECT COUNT(*) as count FROM patients WHERE chief_complaint = ? AND triage_level = \'red\'').get(d.diagnosis) as any
      const avgStayRaw = db.prepare(`
        SELECT AVG(strftime('%s', updated_at) - strftime('%s', created_at)) as avg_seconds
        FROM patients WHERE chief_complaint = ? AND status = 'discharged'
      `).get(d.diagnosis) as any

      const criticalRatio = d.count > 0 ? Math.round((redCount.count / d.count) * 10000) / 100 : 0
      const avgStay = avgStayRaw.avg_seconds ? Math.round(avgStayRaw.avg_seconds / 60) : 0

      return {
        diagnosis: d.diagnosis,
        count: d.count,
        criticalRatio,
        avgStay,
      }
    })

    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取诊断统计失败' })
  }
})

router.get('/monthly-report', (req: Request, res: Response): void => {
  try {
    const { month } = req.query
    const targetMonth = month || new Date().toISOString().substring(0, 7)
    const monthStr = `${targetMonth}%`

    const patientCount = db.prepare("SELECT COUNT(*) as count FROM patients WHERE created_at LIKE ?").get(monthStr) as any
    const redCount = db.prepare("SELECT COUNT(*) as count FROM patients WHERE triage_level = 'red' AND created_at LIKE ?").get(monthStr) as any
    const yellowCount = db.prepare("SELECT COUNT(*) as count FROM patients WHERE triage_level = 'yellow' AND created_at LIKE ?").get(monthStr) as any
    const greenCount = db.prepare("SELECT COUNT(*) as count FROM patients WHERE triage_level = 'green' AND created_at LIKE ?").get(monthStr) as any
    const dischargedCount = db.prepare("SELECT COUNT(*) as count FROM patients WHERE status = 'discharged' AND updated_at LIKE ?").get(monthStr) as any

    const avgStayRaw = db.prepare(`
      SELECT AVG(strftime('%s', updated_at) - strftime('%s', created_at)) as avg_seconds
      FROM patients WHERE status = 'discharged' AND updated_at LIKE ?
    `).get(monthStr) as any
    const avgStayMinutes = avgStayRaw.avg_seconds ? Math.round(avgStayRaw.avg_seconds / 60) : 0

    const criticalRatio = patientCount.count > 0 ? Math.round((redCount.count / patientCount.count) * 10000) / 100 : 0
    const mortalityRate = 0

    const rooms = db.prepare('SELECT * FROM rooms').all() as any[]
    const departmentStats = rooms.map(room => {
      const patientCount = db.prepare('SELECT COUNT(*) as count FROM patients WHERE assigned_room_id = ? AND created_at LIKE ?').get(room.id, monthStr) as any
      const avgStayRaw = db.prepare(`
        SELECT AVG(strftime('%s', updated_at) - strftime('%s', created_at)) as avg_seconds
        FROM patients WHERE assigned_room_id = ? AND status = 'discharged' AND updated_at LIKE ?
      `).get(room.id, monthStr) as any
      const redCount = db.prepare('SELECT COUNT(*) as count FROM patients WHERE assigned_room_id = ? AND triage_level = \'red\' AND created_at LIKE ?').get(room.id, monthStr) as any

      const avgStay = avgStayRaw.avg_seconds ? Math.round(avgStayRaw.avg_seconds / 60) : 0
      const criticalRatio = patientCount.count > 0 ? Math.round((redCount.count / patientCount.count) * 10000) / 100 : 0

      return {
        department: room.name,
        patientCount: patientCount.count,
        avgStay,
        criticalRatio,
        mortalityCount: 0,
      }
    })

    const dailyTrendRaw = db.prepare(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM patients
      WHERE created_at LIKE ?
      GROUP BY DATE(created_at)
      ORDER BY date
    `).all(monthStr) as any[]
    const dailyTrend = dailyTrendRaw.map(d => ({
      date: d.date,
      count: d.count,
    }))

    res.json({
      success: true,
      data: {
        month: targetMonth,
        totalPatients: patientCount.count,
        avgStayMinutes,
        criticalRatio,
        mortalityRate,
        departmentStats,
        dailyTrend,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取月度报表失败' })
  }
})

export default router
