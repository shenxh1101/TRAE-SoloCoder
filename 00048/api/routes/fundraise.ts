import { Router, type Request, type Response } from 'express'
import { getDb } from '../database.js'
import { authMiddleware } from './auth.js'
import { notificationService } from '../notification.js'

const router = Router()

const NOW = `datetime('now','localtime')`

router.get('/', (req: Request, res: Response): void => {
  const db = getDb()
  const { status, page = '1', limit = '20' } = req.query

  let sql = 'SELECT * FROM fundraises WHERE 1=1'
  const params: any[] = []

  if (status) {
    sql += ' AND status = ?'
    params.push(status)
  }

  const pageNum = parseInt(page as string)
  const limitNum = parseInt(limit as string)
  const offset = (pageNum - 1) * limitNum

  const countResult = db.prepare(sql.replace('SELECT *', 'SELECT COUNT(*) as total')).get(...params) as { total: number }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
  params.push(limitNum, offset)

  const fundraises = db.prepare(sql).all(...params).map((fr: any) => ({
    ...fr,
    progress: fr.target_amount > 0 ? Math.round((fr.current_amount / fr.target_amount) * 100) : 0,
  }))

  res.json({
    success: true,
    data: {
      items: fundraises,
      total: countResult.total,
      page: pageNum,
      limit: limitNum,
    },
  })
})

router.post('/', authMiddleware, (req: Request, res: Response): void => {
  const currentUser = (req as any).user
  const { title, description, target_amount, cover_image, start_date, end_date } = req.body

  if (!title || !target_amount || target_amount <= 0) {
    res.status(400).json({ success: false, error: '标题和目标金额不能为空' })
    return
  }

  const db = getDb()
  const result = db.prepare(`
    INSERT INTO fundraises (title, description, target_amount, current_amount, cover_image, status, start_date, end_date, creator_id)
    VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?)
  `).run(title, description || '', target_amount, cover_image || '', 'active', start_date || new Date().toISOString().split('T')[0], end_date || '', currentUser.id)

  const fundraise = db.prepare('SELECT * FROM fundraises WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json({ success: true, data: fundraise })
})

router.get('/:id', (req: Request, res: Response): void => {
  const db = getDb()
  const fundraise = db.prepare('SELECT * FROM fundraises WHERE id = ?').get(req.params.id) as any
  if (!fundraise) {
    res.status(404).json({ success: false, error: '筹款项目不存在' })
    return
  }

  const creator = db.prepare('SELECT id, username, avatar FROM users WHERE id = ?').get(fundraise.creator_id)

  res.json({
    success: true,
    data: {
      ...fundraise,
      progress: fundraise.target_amount > 0 ? Math.round((fundraise.current_amount / fundraise.target_amount) * 100) : 0,
      creator,
    },
  })
})

router.post('/:id/donate', authMiddleware, (req: Request, res: Response): void => {
  const currentUser = (req as any).user
  const { amount, payment_method, message } = req.body

  if (!amount || amount <= 0) {
    res.status(400).json({ success: false, error: '捐赠金额必须大于0' })
    return
  }

  const db = getDb()
  const fundraise = db.prepare('SELECT * FROM fundraises WHERE id = ?').get(req.params.id) as any
  if (!fundraise) {
    res.status(404).json({ success: false, error: '筹款项目不存在' })
    return
  }
  if (fundraise.status !== 'active') {
    res.status(400).json({ success: false, error: '筹款项目已结束' })
    return
  }

  const donationResult = db.prepare(`
    INSERT INTO donations (user_id, amount, type, status, payment_method, message)
    VALUES (?, ?, 'one_time', 'pending', ?, ?)
  `).run(currentUser.id, amount, payment_method || 'wechat', message || '')

  const donationId = donationResult.lastInsertRowid

  db.prepare('UPDATE donations SET status = ? WHERE id = ?').run('completed', donationId)

  const donation = db.prepare('SELECT * FROM donations WHERE id = ?').get(donationId)

  const newAmount = fundraise.current_amount + amount
  let newStatus = 'active'

  if (newAmount >= fundraise.target_amount) {
    newStatus = 'funded'
  }

  db.prepare(`UPDATE fundraises SET current_amount = ?, status = ?, updated_at = ${NOW} WHERE id = ?`).run(newAmount, newStatus, req.params.id)

  if (newStatus === 'funded') {
    db.exec(`CREATE TABLE IF NOT EXISTS disbursements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fundraise_id INTEGER REFERENCES fundraises(id),
      amount REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      disbursed_at TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )`)

    db.prepare('INSERT INTO disbursements (fundraise_id, amount, status, disbursed_at) VALUES (?, ?, ?, ?)').run(
      parseInt(req.params.id), newAmount, 'pending', new Date().toISOString().split('T')[0]
    )

    db.prepare(`UPDATE fundraises SET status = ?, updated_at = ${NOW} WHERE id = ?`).run('completed', req.params.id)

    notificationService.notifyUser(fundraise.creator_id, {
      type: 'fundraise_completed',
      title: '筹款目标已达成',
      message: `您的筹款项目"${fundraise.title}"已达成目标金额，款项将自动拨付`,
      data: { fundraise_id: parseInt(req.params.id), amount: newAmount }
    })
  }

  const updatedFundraise = db.prepare('SELECT * FROM fundraises WHERE id = ?').get(req.params.id) as any

  res.status(201).json({
    success: true,
    data: {
      donation,
      fundraise: {
        ...updatedFundraise,
        progress: updatedFundraise.target_amount > 0 ? Math.round((updatedFundraise.current_amount / updatedFundraise.target_amount) * 100) : 0,
      },
    },
  })
})

export default router
