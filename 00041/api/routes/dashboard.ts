import { Router, type Request, type Response } from 'express'
import { getDb } from '../database.js'

const router = Router()

router.get('/stats', (req: Request, res: Response): void => {
  try {
    const db = getDb()

    const pendingCount = (db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'").get() as any).count
    const activeCount = (db.prepare("SELECT COUNT(*) as count FROM orders WHERE status IN ('assigned', 'checked_in', 'in_service')").get() as any).count

    const today = new Date().toISOString().slice(0, 10)
    const completedToday = (db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'completed' AND date(serviceEndTime) = ?").get(today) as any).count

    const avgResult = db.prepare('SELECT AVG(rating) as avgRating FROM reviews').get() as any
    const avgRating = avgResult.avgRating ? Math.round(avgResult.avgRating * 10) / 10 : 0

    res.json({
      success: true,
      data: { pendingCount, activeCount, completedToday, avgRating },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取统计数据失败' })
  }
})

router.get('/active-orders', (req: Request, res: Response): void => {
  try {
    const db = getDb()

    const orders = db.prepare(`
      SELECT o.*, s.name as staffName, s.phone as staffPhone, s.avatar as staffAvatar, s.lat as staffLat, s.lng as staffLng,
             st.name as serviceTypeName, u.name as userName
      FROM orders o
      LEFT JOIN staff s ON o.staffId = s.id
      LEFT JOIN service_types st ON o.serviceTypeId = st.id
      LEFT JOIN users u ON o.userId = u.id
      WHERE o.status IN ('in_service', 'checked_in')
      ORDER BY o.serviceStartTime DESC
    `).all()

    res.json({ success: true, data: orders })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取活跃订单失败' })
  }
})

export default router
