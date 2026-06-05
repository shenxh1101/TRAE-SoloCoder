import { Router, type Request, type Response } from 'express'
import db from '../database.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  try {
    const { type, level, acknowledged } = req.query
    let sql = 'SELECT a.*, p.name as patient_name FROM alerts a LEFT JOIN patients p ON a.patient_id = p.id WHERE 1=1'
    const params: any[] = []

    if (type) {
      sql += ' AND a.type = ?'
      params.push(type)
    }
    if (level) {
      sql += ' AND a.level = ?'
      params.push(level)
    }
    if (acknowledged !== undefined) {
      sql += ' AND a.acknowledged = ?'
      params.push(acknowledged === 'true' ? 1 : 0)
    }

    sql += ' ORDER BY a.created_at DESC'
    const alertsRaw = db.prepare(sql).all(...params) as any[]
    const alerts = alertsRaw.map(a => ({
      id: a.id,
      type: a.type,
      level: a.level,
      message: a.message,
      patientId: a.patient_id,
      patientName: a.patient_name,
      acknowledged: a.acknowledged === 1,
      createdAt: a.created_at,
    }))
    res.json({ success: true, data: alerts })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取告警列表失败' })
  }
})

router.put('/:id/acknowledge', (req: Request, res: Response): void => {
  try {
    const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(req.params.id) as any
    if (!alert) {
      res.status(404).json({ success: false, error: '告警不存在' })
      return
    }

    db.prepare('UPDATE alerts SET acknowledged = 1 WHERE id = ?').run(req.params.id)
    const updatedRaw = db.prepare('SELECT a.*, p.name as patient_name FROM alerts a LEFT JOIN patients p ON a.patient_id = p.id WHERE a.id = ?').get(req.params.id) as any
    const updated = {
      id: updatedRaw.id,
      type: updatedRaw.type,
      level: updatedRaw.level,
      message: updatedRaw.message,
      patientId: updatedRaw.patient_id,
      patientName: updatedRaw.patient_name,
      acknowledged: updatedRaw.acknowledged === 1,
      createdAt: updatedRaw.created_at,
    }
    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, error: '确认告警失败' })
  }
})

export default router
