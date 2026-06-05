import { Router, type Request, type Response } from 'express'
import { getDb } from '../database.js'

const router = Router()

router.post('/', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { userId, serviceTypeId, address, lat, lng, price, notes } = req.body

    if (!userId || !serviceTypeId) {
      res.status(400).json({ success: false, error: '缺少必要参数' })
      return
    }

    const id = crypto.randomUUID()
    const qrCode = crypto.randomUUID()

    db.prepare(
      `INSERT INTO orders (id, userId, serviceTypeId, status, address, lat, lng, qrCode, price, notes) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)`
    ).run(id, userId, serviceTypeId, address || '', lat || null, lng || null, qrCode, price || 0, notes || '')

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id)
    res.status(201).json({ success: true, data: order })
  } catch (error) {
    res.status(500).json({ success: false, error: '创建订单失败' })
  }
})

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { id } = req.params

    const order = db.prepare(`
      SELECT o.*, s.name as staffName, s.phone as staffPhone, s.avatar as staffAvatar,
             s.rating as staffRating, s.lat as staffLat, s.lng as staffLng,
             st.name as serviceTypeName, st.icon as serviceTypeIcon, st.duration as serviceDuration,
             u.name as userName, u.phone as userPhone
      FROM orders o
      LEFT JOIN staff s ON o.staffId = s.id
      LEFT JOIN service_types st ON o.serviceTypeId = st.id
      LEFT JOIN users u ON o.userId = u.id
      WHERE o.id = ?
    `).get(id)

    if (!order) {
      res.status(404).json({ success: false, error: '订单不存在' })
      return
    }

    res.json({ success: true, data: order })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取订单详情失败' })
  }
})

router.put('/:id/checkin', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { id } = req.params

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any
    if (!order) {
      res.status(404).json({ success: false, error: '订单不存在' })
      return
    }
    if (order.status !== 'assigned' && order.status !== 'pending') {
      res.status(400).json({ success: false, error: '当前订单状态无法签到' })
      return
    }

    const checkInTime = new Date().toISOString()
    db.prepare('UPDATE orders SET status = ?, checkInTime = ? WHERE id = ?').run('checked_in', checkInTime, id)

    db.prepare(
      `INSERT INTO messages (id, orderId, senderType, content) VALUES (?, ?, 'system', ?)`
    ).run(crypto.randomUUID(), id, '服务人员已签到')

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(id)
    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, error: '签到失败' })
  }
})

router.put('/:id/start', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { id } = req.params

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any
    if (!order) {
      res.status(404).json({ success: false, error: '订单不存在' })
      return
    }
    if (order.status !== 'checked_in') {
      res.status(400).json({ success: false, error: '当前订单状态无法开始服务' })
      return
    }

    const serviceStartTime = new Date().toISOString()
    db.prepare('UPDATE orders SET status = ?, serviceStartTime = ? WHERE id = ?').run('in_service', serviceStartTime, id)

    if (order.staffId) {
      db.prepare("UPDATE staff SET status = 'busy' WHERE id = ?").run(order.staffId)
    }

    db.prepare(
      `INSERT INTO messages (id, orderId, senderType, content) VALUES (?, ?, 'system', ?)`
    ).run(crypto.randomUUID(), id, '服务已开始')

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(id)
    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, error: '开始服务失败' })
  }
})

router.put('/:id/complete', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { id } = req.params

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any
    if (!order) {
      res.status(404).json({ success: false, error: '订单不存在' })
      return
    }
    if (order.status !== 'in_service') {
      res.status(400).json({ success: false, error: '当前订单状态无法完成' })
      return
    }

    const serviceEndTime = new Date().toISOString()
    db.prepare('UPDATE orders SET status = ?, serviceEndTime = ? WHERE id = ?').run('completed', serviceEndTime, id)

    if (order.staffId) {
      db.prepare("UPDATE staff SET status = 'idle', totalOrders = totalOrders + 1 WHERE id = ?").run(order.staffId)
    }

    db.prepare(
      `INSERT INTO messages (id, orderId, senderType, content) VALUES (?, ?, 'system', ?)`
    ).run(crypto.randomUUID(), id, '服务已完成')

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(id)
    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, error: '完成订单失败' })
  }
})

router.get('/:id/location', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { id } = req.params

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any
    if (!order) {
      res.status(404).json({ success: false, error: '订单不存在' })
      return
    }
    if (!order.staffId) {
      res.status(400).json({ success: false, error: '该订单尚未分配服务人员' })
      return
    }

    const staff = db.prepare('SELECT id, name, lat, lng, phone FROM staff WHERE id = ?').get(order.staffId)
    res.json({ success: true, data: staff })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取位置信息失败' })
  }
})

router.post('/:id/messages', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { id } = req.params
    const { senderId, senderType, content } = req.body

    if (!content) {
      res.status(400).json({ success: false, error: '消息内容不能为空' })
      return
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any
    if (!order) {
      res.status(404).json({ success: false, error: '订单不存在' })
      return
    }

    const msgId = crypto.randomUUID()
    db.prepare(
      'INSERT INTO messages (id, orderId, senderId, senderType, content) VALUES (?, ?, ?, ?, ?)'
    ).run(msgId, id, senderId || null, senderType || 'system', content)

    const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(msgId)
    res.status(201).json({ success: true, data: message })
  } catch (error) {
    res.status(500).json({ success: false, error: '发送消息失败' })
  }
})

router.get('/:id/messages', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { id } = req.params

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id)
    if (!order) {
      res.status(404).json({ success: false, error: '订单不存在' })
      return
    }

    const messages = db.prepare('SELECT * FROM messages WHERE orderId = ? ORDER BY createdAt ASC').all(id)
    res.json({ success: true, data: messages })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取消息失败' })
  }
})

router.get('/:id/notifications', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { id } = req.params

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any
    if (!order) {
      res.status(404).json({ success: false, error: '订单不存在' })
      return
    }

    const notifications = db.prepare(
      'SELECT * FROM notifications WHERE userId = ? AND relatedId = ? ORDER BY createdAt DESC'
    ).all(order.userId, id)

    const coupons = db.prepare(
      'SELECT * FROM user_coupons WHERE userId = ? AND orderId = ? ORDER BY createdAt DESC'
    ).all(order.userId, id)

    res.json({ success: true, data: { notifications, coupons } })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取通知失败' })
  }
})

router.get('/user/:userId/coupons', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { userId } = req.params

    const coupons = db.prepare(
      'SELECT * FROM user_coupons WHERE userId = ? ORDER BY createdAt DESC'
    ).all(userId)

    res.json({ success: true, data: coupons })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取优惠券失败' })
  }
})

export default router
