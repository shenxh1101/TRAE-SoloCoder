import { Router, type Request, type Response } from 'express'
import { getDb } from '../database.js'

const router = Router()

router.get('/orders', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { serviceType, rating, startDate, endDate, page = '1', limit = '10' } = req.query

    let sql = `
      SELECT o.*, st.name as serviceTypeName, s.name as staffName, u.name as userName
      FROM orders o
      LEFT JOIN service_types st ON o.serviceTypeId = st.id
      LEFT JOIN staff s ON o.staffId = s.id
      LEFT JOIN users u ON o.userId = u.id
      WHERE 1=1
    `
    const params: any[] = []

    if (serviceType) {
      sql += ' AND st.name = ?'
      params.push(serviceType)
    }
    if (rating) {
      sql += ' AND o.staffId IN (SELECT id FROM staff WHERE rating >= ?)'
      params.push(parseFloat(rating as string))
    }
    if (startDate) {
      sql += ' AND date(o.createdAt) >= ?'
      params.push(startDate)
    }
    if (endDate) {
      sql += ' AND date(o.createdAt) <= ?'
      params.push(endDate)
    }

    const countSql = sql.replace(
      'SELECT o.*, st.name as serviceTypeName, s.name as staffName, u.name as userName',
      'SELECT COUNT(*) as total'
    )
    const total = (db.prepare(countSql).get(...params) as any).total

    const pageNum = parseInt(page as string, 10)
    const limitNum = parseInt(limit as string, 10)
    const offset = (pageNum - 1) * limitNum

    sql += ' ORDER BY o.createdAt DESC LIMIT ? OFFSET ?'
    params.push(limitNum, offset)

    const orders = db.prepare(sql).all(...params)

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '查询订单失败' })
  }
})

router.put('/staff/:id/schedule', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { id } = req.params
    const { schedules } = req.body

    if (!schedules || !Array.isArray(schedules)) {
      res.status(400).json({ success: false, error: '缺少排班数据' })
      return
    }

    const staff = db.prepare('SELECT * FROM staff WHERE id = ?').get(id) as any
    if (!staff) {
      res.status(404).json({ success: false, error: '员工不存在' })
      return
    }

    const upsert = db.prepare(`
      INSERT INTO schedules (id, staffId, dayOfWeek, startTime, endTime, isAvailable)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET startTime = excluded.startTime, endTime = excluded.endTime, isAvailable = excluded.isAvailable
    `)

    const transaction = db.transaction(() => {
      for (const s of schedules) {
        const schId = s.id || `sch-${id}-${s.dayOfWeek}`
        upsert.run(schId, id, s.dayOfWeek, s.startTime, s.endTime, s.isAvailable ? 1 : 0)
      }
    })
    transaction()

    const updatedSchedules = db.prepare('SELECT * FROM schedules WHERE staffId = ? ORDER BY dayOfWeek').all(id)
    res.json({ success: true, data: updatedSchedules })
  } catch (error) {
    res.status(500).json({ success: false, error: '更新排班失败' })
  }
})

router.get('/reports/monthly', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { year, month } = req.query

    if (!year || !month) {
      res.status(400).json({ success: false, error: '缺少年份或月份参数' })
      return
    }

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const monthInt = parseInt(month as string, 10)
    const yearInt = parseInt(year as string, 10)
    const endDate = new Date(yearInt, monthInt, 0).toISOString().slice(0, 10)

    const orderCounts = db.prepare(`
      SELECT st.name as serviceType, COUNT(*) as count
      FROM orders o
      JOIN service_types st ON o.serviceTypeId = st.id
      WHERE date(o.createdAt) BETWEEN ? AND ?
      GROUP BY st.name
    `).all(startDate, endDate) as any[]

    const avgRatings = db.prepare(`
      SELECT st.name as serviceType, ROUND(AVG(r.rating), 1) as avgRating
      FROM reviews r
      JOIN orders o ON r.orderId = o.id
      JOIN service_types st ON o.serviceTypeId = st.id
      WHERE date(r.createdAt) BETWEEN ? AND ?
      GROUP BY st.name
    `).all(startDate, endDate) as any[]

    const totalOrders = (db.prepare(
      'SELECT COUNT(*) as count FROM orders WHERE date(createdAt) BETWEEN ? AND ?'
    ).get(startDate, endDate) as any).count

    const completedOrders = (db.prepare(
      "SELECT COUNT(*) as count FROM orders WHERE status = 'completed' AND date(createdAt) BETWEEN ? AND ?"
    ).get(startDate, endDate) as any).count

    const completionRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0

    res.json({
      success: true,
      data: {
        period: { year: yearInt, month: monthInt, startDate, endDate },
        orderCountsByType: orderCounts,
        avgRatingsByType: avgRatings,
        totalOrders,
        completedOrders,
        completionRate,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取月度报表失败' })
  }
})

router.get('/reports/staff/:id', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { id } = req.params

    const staff = db.prepare('SELECT * FROM staff WHERE id = ?').get(id) as any
    if (!staff) {
      res.status(404).json({ success: false, error: '员工不存在' })
      return
    }

    const orders = db.prepare(`
      SELECT o.id, o.status, o.createdAt, o.serviceStartTime, o.serviceEndTime, o.price, o.address,
             st.name as serviceTypeName, u.name as userName
      FROM orders o
      LEFT JOIN service_types st ON o.serviceTypeId = st.id
      LEFT JOIN users u ON o.userId = u.id
      WHERE o.staffId = ?
      ORDER BY o.createdAt DESC
    `).all(id)

    const reviews = db.prepare(`
      SELECT r.*, o.id as orderId
      FROM reviews r
      JOIN orders o ON r.orderId = o.id
      WHERE r.staffId = ?
      ORDER BY r.createdAt DESC
    `).all(id)

    res.json({
      success: true,
      data: {
        staff: {
          ...staff,
          skillTags: JSON.parse(staff.skillTags),
          serviceAreas: JSON.parse(staff.serviceAreas),
        },
        orders,
        reviews,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取员工服务记录失败' })
  }
})

router.get('/reports/export', (req: Request, res: Response): void => {
  try {
    const db = getDb()

    const orders = db.prepare(`
      SELECT o.id, o.status, o.address, o.price, o.createdAt, o.checkInTime, o.serviceStartTime, o.serviceEndTime,
             st.name as serviceTypeName, s.name as staffName, s.rating as staffRating,
             u.name as userName, u.phone as userPhone
      FROM orders o
      LEFT JOIN service_types st ON o.serviceTypeId = st.id
      LEFT JOIN staff s ON o.staffId = s.id
      LEFT JOIN users u ON o.userId = u.id
      ORDER BY o.createdAt DESC
    `).all() as any[]

    const headers = ['订单ID', '用户', '用户电话', '服务类型', '服务人员', '人员评分', '状态', '地址', '价格', '创建时间', '签到时间', '开始时间', '结束时间']
    const rows = orders.map((o) => [
      o.id,
      o.userName,
      o.userPhone,
      o.serviceTypeName,
      o.staffName || '',
      o.staffRating || '',
      o.status,
      o.address,
      o.price,
      o.createdAt,
      o.checkInTime || '',
      o.serviceStartTime || '',
      o.serviceEndTime || '',
    ])

    const csvLines = [headers.join(','), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))]
    const csv = csvLines.join('\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename=orders_export.csv')
    res.send('\uFEFF' + csv)
  } catch (error) {
    res.status(500).json({ success: false, error: '导出失败' })
  }
})

export default router
