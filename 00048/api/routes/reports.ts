import { Router, type Request, type Response } from 'express'
import { getDb } from '../database.js'
import { authMiddleware } from './auth.js'
import { notificationService } from '../notification.js'

const router = Router()

const NOW = `datetime('now','localtime')`

function parseJsonFields(report: any) {
  if (report && report.photos) {
    try { report.photos = JSON.parse(report.photos) } catch { report.photos = [] }
  }
  return report
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2) * Math.sin(dLng/2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

router.post('/', authMiddleware, (req: Request, res: Response): void => {
  const currentUser = (req as any).user
  const { animal_type, animalType, description, location, address, city, district, latitude, longitude, lat, lng, photos, urgency, contact_name, contact_phone, conditionStatus, condition_status } = req.body

  const finalAnimalType = animal_type || animalType || 'cat'
  const finalLocation = location || address || ''
  const finalLat = latitude || lat || null
  const finalLng = longitude || lng || null

  if (!finalAnimalType || !finalLocation) {
    res.status(400).json({ success: false, error: '动物类型和位置不能为空' })
    return
  }

  const db = getDb()
  const result = db.prepare(`
    INSERT INTO stray_reports (user_id, animal_type, description, location, city, district, latitude, longitude, photos, urgency, contact_name, contact_phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(currentUser.id, finalAnimalType, description || '', finalLocation, city || '', district || '', finalLat, finalLng, JSON.stringify(photos || []), urgency || 'medium', contact_name || '', contact_phone || '')

  const report = db.prepare('SELECT * FROM stray_reports WHERE id = ?').get(result.lastInsertRowid) as any

  let notifiedVolunteers: any[] = []

  if (report.latitude && report.longitude) {
    const volunteers = db.prepare("SELECT id, username, phone, latitude, longitude FROM users WHERE role = 'volunteer' AND latitude IS NOT NULL AND longitude IS NOT NULL").all() as any[]

    const nearbyVolunteers = volunteers
      .map(v => ({
        ...v,
        distance: haversineDistance(report.latitude, report.longitude, v.latitude, v.longitude)
      }))
      .filter(v => v.distance <= 50)
      .sort((a, b) => a.distance - b.distance)

    if (nearbyVolunteers.length > 0) {
      const hospital = db.prepare('SELECT * FROM hospitals LIMIT 1').get() as any

      const taskResult = db.prepare(`
        INSERT INTO rescue_tasks (report_id, hospital_id, status, description)
        VALUES (?, ?, 'pending', ?)
      `).run(report.id, hospital?.id || null, `自动分配：${animal_type}救助 - ${location}`)

      const task = db.prepare('SELECT * FROM rescue_tasks WHERE id = ?').get(taskResult.lastInsertRowid)

      db.prepare(`UPDATE stray_reports SET status = ?, updated_at = ${NOW} WHERE id = ?`).run('rescuing', report.id)

      notificationService.notifyVolunteers(
        nearbyVolunteers.map(v => v.id),
        {
          type: 'new_rescue',
          title: '附近发现流浪动物',
          message: `${animal_type} - ${location}，距离您${nearbyVolunteers[0].distance.toFixed(1)}km`,
          data: { report: parseJsonFields(report), task, distance: nearbyVolunteers[0].distance.toFixed(1) }
        }
      )

      const db2 = getDb()
      db2.exec(`CREATE TABLE IF NOT EXISTS notification_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        type TEXT DEFAULT '',
        title TEXT DEFAULT '',
        message TEXT DEFAULT '',
        data TEXT DEFAULT '{}',
        read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
      )`)

      const insertNotif = db2.prepare('INSERT INTO notification_history (user_id, type, title, message, data) VALUES (?, ?, ?, ?, ?)')
      for (const v of nearbyVolunteers) {
        insertNotif.run(v.id, 'new_rescue', '附近发现流浪动物', `${animal_type} - ${location}，距离您${v.distance.toFixed(1)}km`, JSON.stringify({ report_id: report.id, task_id: taskResult.lastInsertRowid, distance: v.distance.toFixed(1) }))
      }

      notifiedVolunteers = nearbyVolunteers.map(v => ({ id: v.id, username: v.username, distance: parseFloat(v.distance.toFixed(1)) }))
    }
  }

  res.status(201).json({ success: true, data: { ...parseJsonFields(report), notified_volunteers: notifiedVolunteers } })
})

router.get('/', (req: Request, res: Response): void => {
  const db = getDb()
  const { status, city, urgency, page = '1', limit = '20' } = req.query

  let sql = 'SELECT * FROM stray_reports WHERE 1=1'
  const params: any[] = []

  if (status) {
    sql += ' AND status = ?'
    params.push(status)
  }
  if (city) {
    sql += ' AND city = ?'
    params.push(city)
  }
  if (urgency) {
    sql += ' AND urgency = ?'
    params.push(urgency)
  }

  const pageNum = parseInt(page as string)
  const limitNum = parseInt(limit as string)
  const offset = (pageNum - 1) * limitNum

  const countResult = db.prepare(sql.replace('SELECT *', 'SELECT COUNT(*) as total')).get(...params) as { total: number }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
  params.push(limitNum, offset)

  const reports = db.prepare(sql).all(...params).map(parseJsonFields)

  res.json({
    success: true,
    data: {
      items: reports,
      total: countResult.total,
      page: pageNum,
      limit: limitNum,
    },
  })
})

router.get('/:id', (req: Request, res: Response): void => {
  const db = getDb()
  const report = db.prepare('SELECT * FROM stray_reports WHERE id = ?').get(req.params.id)
  if (!report) {
    res.status(404).json({ success: false, error: '报告不存在' })
    return
  }
  res.json({ success: true, data: parseJsonFields(report) })
})

export default router
