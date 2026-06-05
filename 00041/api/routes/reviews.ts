import { Router, type Request, type Response } from 'express'
import { getDb } from '../database.js'

const router = Router()

router.post('/', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { orderId, userId, staffId, rating, comment, photos } = req.body

    if (!orderId || !userId || !staffId || rating === undefined) {
      res.status(400).json({ success: false, error: '缺少必要参数' })
      return
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any
    if (!order) {
      res.status(404).json({ success: false, error: '订单不存在' })
      return
    }
    if (order.status !== 'completed') {
      res.status(400).json({ success: false, error: '只能评价已完成的订单' })
      return
    }

    const existing = db.prepare('SELECT * FROM reviews WHERE orderId = ?').get(orderId) as any
    if (existing) {
      res.status(400).json({ success: false, error: '该订单已评价' })
      return
    }

    const id = crypto.randomUUID()
    const photosJson = JSON.stringify(photos || [])
    db.prepare(
      'INSERT INTO reviews (id, orderId, userId, staffId, rating, comment, photos) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, orderId, userId, staffId, rating, comment || '', photosJson)

    const reviewStats = db.prepare('SELECT COUNT(*) as count, AVG(rating) as avgRating FROM reviews WHERE staffId = ?').get(staffId) as any
    const newRating = Math.round(reviewStats.avgRating * 10) / 10
    db.prepare('UPDATE staff SET rating = ? WHERE id = ?').run(newRating, staffId)

    const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(id) as any
    res.status(201).json({ success: true, data: { ...review, photos: JSON.parse(review.photos || '[]') } })
  } catch (error) {
    res.status(500).json({ success: false, error: '创建评价失败' })
  }
})

router.get('/order/:orderId', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { orderId } = req.params

    const review = db.prepare(`
      SELECT r.*, u.name as userName, s.name as staffName
      FROM reviews r
      LEFT JOIN users u ON r.userId = u.id
      LEFT JOIN staff s ON r.staffId = s.id
      WHERE r.orderId = ?
    `).get(orderId)

    if (!review) {
      res.status(404).json({ success: false, error: '该订单暂无评价' })
      return
    }

    res.json({ success: true, data: review })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取评价失败' })
  }
})

export default router
