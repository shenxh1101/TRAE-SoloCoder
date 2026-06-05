import { Router, type Request, type Response } from 'express'
import { getDb } from '../database.js'
import { authMiddleware } from './auth.js'

const router = Router()

router.post('/', authMiddleware, (req: Request, res: Response): void => {
  const currentUser = (req as any).user
  const { amount, type, payment_method, message } = req.body

  if (!amount || amount <= 0) {
    res.status(400).json({ success: false, error: '捐赠金额必须大于0' })
    return
  }

  const db = getDb()
  const result = db.prepare(`
    INSERT INTO donations (user_id, amount, type, status, payment_method, message)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(currentUser.id, amount, type || 'one_time', 'pending', payment_method || 'wechat', message || '')

  const donation = db.prepare('SELECT * FROM donations WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json({ success: true, data: donation })
})

router.post('/callback', (req: Request, res: Response): void => {
  const { donation_id, payment_status, transaction_id } = req.body

  if (!donation_id || !payment_status) {
    res.status(400).json({ success: false, error: 'donation_id和payment_status不能为空' })
    return
  }

  if (!['success', 'failed'].includes(payment_status)) {
    res.status(400).json({ success: false, error: 'payment_status必须为success或failed' })
    return
  }

  const db = getDb()
  const donation = db.prepare('SELECT * FROM donations WHERE id = ?').get(donation_id) as any
  if (!donation) {
    res.status(404).json({ success: false, error: '捐赠记录不存在' })
    return
  }

  const newStatus = payment_status === 'success' ? 'completed' : 'failed'
  db.prepare('UPDATE donations SET status = ? WHERE id = ?').run(newStatus, donation_id)

  const updated = db.prepare('SELECT * FROM donations WHERE id = ?').get(donation_id)
  res.json({ success: true, data: updated })
})

router.get('/history', authMiddleware, (req: Request, res: Response): void => {
  const currentUser = (req as any).user
  const db = getDb()

  const donations = db.prepare('SELECT * FROM donations WHERE user_id = ? ORDER BY created_at DESC').all(currentUser.id)
  const total = db.prepare('SELECT SUM(amount) as total FROM donations WHERE user_id = ? AND status = ?').get(currentUser.id, 'completed') as { total: number | null }

  res.json({
    success: true,
    data: {
      items: donations,
      total_amount: total.total || 0,
    },
  })
})

router.get('/certificate', authMiddleware, (req: Request, res: Response): void => {
  const currentUser = (req as any).user
  const db = getDb()

  const donations = db.prepare('SELECT * FROM donations WHERE user_id = ? AND status = ? ORDER BY created_at DESC').all(currentUser.id, 'completed')
  const total = db.prepare('SELECT SUM(amount) as total FROM donations WHERE user_id = ? AND status = ?').get(currentUser.id, 'completed') as { total: number | null }
  const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(currentUser.id)

  const certificate = {
    certificate_no: `CERT-${Date.now()}-${currentUser.id}`,
    donor_name: (user as any)?.username || '爱心人士',
    total_amount: total.total || 0,
    donation_count: donations.length,
    issued_date: new Date().toISOString().split('T')[0],
    message: '感谢您的慷慨捐赠，您的爱心为流浪动物带来了温暖和希望！',
  }

  res.json({ success: true, data: certificate })
})

export default router
