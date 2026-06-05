import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const { month } = req.query
  let sql = `SELECT * FROM monthly_reports WHERE 1=1`
  const params: unknown[] = []

  if (month) {
    sql += ` AND month = ?`
    params.push(month)
  }

  sql += ` ORDER BY month DESC`

  const reports = db.prepare(sql).all(...params)
  res.json({ success: true, data: reports })
})

router.get('/latest', (req: Request, res: Response): void => {
  const report = db.prepare(
    `SELECT * FROM monthly_reports ORDER BY month DESC LIMIT 1`
  ).get()

  if (!report) {
    res.status(404).json({ success: false, error: '暂无报表数据' })
    return
  }

  res.json({ success: true, data: report })
})

router.post('/generate', (req: Request, res: Response): void => {
  const { month } = req.body

  if (!month) {
    res.status(400).json({ success: false, error: '请指定月份，格式: 2026-06' })
    return
  }

  const startDate = `${month}-01T00:00:00.000Z`
  const monthNum = parseInt(month.split('-')[1])
  const yearNum = parseInt(month.split('-')[0])
  const endDate = new Date(yearNum, monthNum, 1).toISOString()

  const purchaseStats = db.prepare(`
    SELECT COALESCE(SUM(total_amount), 0) as total_purchase,
           COUNT(*) as order_count
    FROM purchase_orders
    WHERE created_at >= ? AND created_at < ? AND status NOT IN ('draft', 'rejected')
  `).get(startDate, endDate) as { total_purchase: number; order_count: number }

  const returnStats = db.prepare(`
    SELECT COALESCE(SUM(po.total_amount), 0) as total_return,
           COUNT(*) as return_count
    FROM returns r
    JOIN purchase_orders po ON r.order_id = po.id
    WHERE r.created_at >= ? AND r.created_at < ?
  `).get(startDate, endDate) as { total_return: number; return_count: number }

  const existing = db.prepare(`SELECT * FROM monthly_reports WHERE month = ?`).get(month) as Record<string, unknown> | undefined

  const now = new Date().toISOString()

  if (existing) {
    db.prepare(
      `UPDATE monthly_reports SET total_purchase = ?, total_return = ?, order_count = ?, return_count = ?, generated_at = ? WHERE month = ?`
    ).run(
      Math.round(purchaseStats.total_purchase * 100) / 100,
      Math.round(returnStats.total_return * 100) / 100,
      purchaseStats.order_count,
      returnStats.return_count,
      now,
      month
    )

    const updated = db.prepare(`SELECT * FROM monthly_reports WHERE month = ?`).get(month)
    res.json({ success: true, data: updated })
  } else {
    const reportId = uuidv4()
    db.prepare(
      `INSERT INTO monthly_reports (id, month, total_purchase, total_return, order_count, return_count, generated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      reportId, month,
      Math.round(purchaseStats.total_purchase * 100) / 100,
      Math.round(returnStats.total_return * 100) / 100,
      purchaseStats.order_count,
      returnStats.return_count,
      now
    )

    const created = db.prepare(`SELECT * FROM monthly_reports WHERE id = ?`).get(reportId)
    res.json({ success: true, data: created })
  }
})

router.get('/trend', (req: Request, res: Response): void => {
  const { months = 6 } = req.query
  const reports = db.prepare(
    `SELECT * FROM monthly_reports ORDER BY month DESC LIMIT ?`
  ).all(months)

  const sortedReports = [...reports].sort((a, b) => (a as Record<string, string>).month.localeCompare((b as Record<string, string>).month))

  const trend = sortedReports.map((r) => {
    const row = r as Record<string, unknown>
    const totalPurchase = row.total_purchase as number
    const totalReturn = row.total_return as number
    return {
      month: row.month,
      totalPurchase,
      totalReturn,
      orderCount: row.order_count,
      returnCount: row.return_count,
      returnRate: totalPurchase > 0 ? Math.round((totalReturn / totalPurchase) * 10000) / 100 : 0
    }
  })

  res.json({ success: true, data: trend })
})

export default router
