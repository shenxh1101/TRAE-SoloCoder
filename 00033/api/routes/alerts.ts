import { Router, type Request, type Response } from 'express'
import { db } from '../database.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const { level, acknowledged } = req.query

  let sql = 'SELECT a.*, se.event_id as seismic_event_id, se.magnitude, se.location, st.code as station_code, st.name as station_name FROM alerts a LEFT JOIN seismic_events se ON a.event_id = se.id LEFT JOIN stations st ON a.station_id = st.id WHERE 1=1'
  const params: any[] = []

  if (level) {
    sql += ' AND a.level = ?'
    params.push(level as string)
  }
  if (acknowledged !== undefined) {
    sql += ' AND a.acknowledged = ?'
    params.push(parseInt(acknowledged as string, 10))
  }

  sql += ' ORDER BY a.created_at DESC'

  const alerts = db.prepare(sql).all(...params)

  res.json({
    success: true,
    data: alerts,
  })
})

router.post('/:id/acknowledge', (req: Request, res: Response): void => {
  const { id } = req.params
  const { acknowledged_by } = req.body

  const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(id) as any

  if (!alert) {
    res.status(404).json({ success: false, error: 'Alert not found' })
    return
  }

  db.prepare('UPDATE alerts SET acknowledged = 1, acknowledged_by = ? WHERE id = ?').run(
    acknowledged_by || 'admin',
    id,
  )

  res.json({
    success: true,
    data: {
      id,
      acknowledged: true,
      acknowledged_by: acknowledged_by || 'admin',
    },
  })
})

router.get('/notifications', (req: Request, res: Response): void => {
  const { user_id, read } = req.query

  let sql = 'SELECT * FROM notifications WHERE 1=1'
  const params: any[] = []

  if (user_id) {
    sql += ' AND user_id = ?'
    params.push(user_id as string)
  }
  if (read !== undefined) {
    sql += ' AND read = ?'
    params.push(parseInt(read as string, 10))
  }

  sql += ' ORDER BY created_at DESC'

  const notifications = db.prepare(sql).all(...params)

  res.json({
    success: true,
    data: notifications,
  })
})

export default router
