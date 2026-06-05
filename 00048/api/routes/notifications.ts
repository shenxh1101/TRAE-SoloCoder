import { Router, type Request, type Response } from 'express'
import { getDb } from '../database.js'
import { authMiddleware } from './auth.js'

const router = Router()

router.get('/', authMiddleware, (req: Request, res: Response): void => {
  const currentUser = (req as any).user
  const db = getDb()

  const notifications = db.prepare(
    'SELECT * FROM notification_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
  ).all(currentUser.id)

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const data = JSON.stringify({ type: 'history', notifications })
  res.write(`data: ${data}\n\n`)

  const keepAlive = setInterval(() => {
    res.write(`:keepalive\n\n`)
  }, 30000)

  req.on('close', () => {
    clearInterval(keepAlive)
  })
})

router.post('/subscribe', authMiddleware, (req: Request, res: Response): void => {
  const currentUser = (req as any).user
  const { endpoint, keys } = req.body

  if (!endpoint) {
    res.status(400).json({ success: false, error: 'Endpoint不能为空' })
    return
  }

  const db = getDb()

  db.exec(`CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    endpoint TEXT NOT NULL,
    keys TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  )`)

  const existing = db.prepare('SELECT id FROM push_subscriptions WHERE user_id = ? AND endpoint = ?').get(currentUser.id, endpoint)
  if (!existing) {
    db.prepare('INSERT INTO push_subscriptions (user_id, endpoint, keys) VALUES (?, ?, ?)').run(currentUser.id, endpoint, JSON.stringify(keys || {}))
  }

  res.json({ success: true, data: { subscribed: true } })
})

router.get('/history', authMiddleware, (req: Request, res: Response): void => {
  const currentUser = (req as any).user
  const db = getDb()

  db.exec(`CREATE TABLE IF NOT EXISTS notification_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    type TEXT DEFAULT '',
    title TEXT DEFAULT '',
    message TEXT DEFAULT '',
    data TEXT DEFAULT '{}',
    read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  )`)

  const { page = '1', limit = '20' } = req.query
  const pageNum = parseInt(page as string)
  const limitNum = parseInt(limit as string)
  const offset = (pageNum - 1) * limitNum

  const countResult = db.prepare('SELECT COUNT(*) as total FROM notification_history WHERE user_id = ?').get(currentUser.id) as { total: number }
  const notifications = db.prepare('SELECT * FROM notification_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').all(currentUser.id, limitNum, offset)

  res.json({
    success: true,
    data: {
      items: notifications,
      total: countResult.total,
      page: pageNum,
      limit: limitNum,
    },
  })
})

export default router
