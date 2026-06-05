import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const { keyword } = req.query
  let sql = `SELECT * FROM suppliers WHERE 1=1`
  const params: unknown[] = []

  if (keyword) {
    sql += ` AND (name LIKE ? OR contact LIKE ?)`
    params.push(`%${keyword}%`, `%${keyword}%`)
  }

  const suppliers = db.prepare(sql).all(...params)
  res.json({ success: true, data: suppliers })
})

router.get('/:id', (req: Request, res: Response): void => {
  const supplier = db.prepare(`SELECT * FROM suppliers WHERE id = ?`).get(req.params.id)
  if (!supplier) {
    res.status(404).json({ success: false, error: '供应商不存在' })
    return
  }
  res.json({ success: true, data: supplier })
})

router.get('/:id/performance', (req: Request, res: Response): void => {
  const supplierId = req.params.id

  const supplier = db.prepare(`SELECT * FROM suppliers WHERE id = ?`).get(supplierId) as Record<string, unknown> | undefined
  if (!supplier) {
    res.status(404).json({ success: false, error: '供应商不存在' })
    return
  }

  const totalOrders = db.prepare(
    `SELECT COUNT(*) as count FROM purchase_orders WHERE supplier_id = ?`
  ).get(supplierId) as { count: number }

  const completedOrders = db.prepare(
    `SELECT COUNT(*) as count FROM purchase_orders WHERE supplier_id = ? AND status IN ('completed', 'contracted', 'shipping', 'inspecting')`
  ).get(supplierId) as { count: number }

  const onTimeOrders = db.prepare(
    `SELECT COUNT(*) as count FROM purchase_orders WHERE supplier_id = ? AND status IN ('completed', 'contracted', 'shipping', 'inspecting', 'approved')`
  ).get(supplierId) as { count: number }

  const inspectionTotal = db.prepare(
    `SELECT COUNT(*) as count FROM inspection_reports ir JOIN purchase_orders po ON ir.order_id = po.id WHERE po.supplier_id = ?`
  ).get(supplierId) as { count: number }

  const passCount = db.prepare(
    `SELECT COUNT(*) as count FROM inspection_reports ir JOIN purchase_orders po ON ir.order_id = po.id WHERE po.supplier_id = ? AND ir.result = 'pass'`
  ).get(supplierId) as { count: number }

  const returnCount = db.prepare(
    `SELECT COUNT(*) as count FROM returns r JOIN purchase_orders po ON r.order_id = po.id WHERE po.supplier_id = ?`
  ).get(supplierId) as { count: number }

  const totalAmount = db.prepare(
    `SELECT COALESCE(SUM(total_amount), 0) as total FROM purchase_orders WHERE supplier_id = ? AND status NOT IN ('draft', 'rejected')`
  ).get(supplierId) as { total: number }

  const onTimeRate = completedOrders.count > 0 ? Math.round((onTimeOrders.count / totalOrders.count) * 10000) / 100 : 0
  const passRate = inspectionTotal.count > 0 ? Math.round((passCount.count / inspectionTotal.count) * 10000) / 100 : 100

  res.json({
    success: true,
    data: {
      supplierId,
      supplierName: supplier.name,
      totalOrders: totalOrders.count,
      completedOrders: completedOrders.count,
      onTimeRate,
      passRate,
      returnOrders: returnCount.count,
      totalAmount: totalAmount.total
    }
  })
})

router.get('/performance/all', (req: Request, res: Response): void => {
  const suppliers = db.prepare(`SELECT * FROM suppliers`).all() as Array<Record<string, unknown>>

  const performanceData = suppliers.map((supplier) => {
    const sid = supplier.id as string

    const totalOrders = db.prepare(
      `SELECT COUNT(*) as count FROM purchase_orders WHERE supplier_id = ?`
    ).get(sid) as { count: number }

    const completedOrders = db.prepare(
      `SELECT COUNT(*) as count FROM purchase_orders WHERE supplier_id = ? AND status IN ('completed', 'contracted', 'shipping', 'inspecting')`
    ).get(sid) as { count: number }

    const onTimeOrders = db.prepare(
      `SELECT COUNT(*) as count FROM purchase_orders WHERE supplier_id = ? AND status IN ('completed', 'contracted', 'shipping', 'inspecting', 'approved')`
    ).get(sid) as { count: number }

    const inspectionTotal = db.prepare(
      `SELECT COUNT(*) as count FROM inspection_reports ir JOIN purchase_orders po ON ir.order_id = po.id WHERE po.supplier_id = ?`
    ).get(sid) as { count: number }

    const passCount = db.prepare(
      `SELECT COUNT(*) as count FROM inspection_reports ir JOIN purchase_orders po ON ir.order_id = po.id WHERE po.supplier_id = ? AND ir.result = 'pass'`
    ).get(sid) as { count: number }

    const returnCount = db.prepare(
      `SELECT COUNT(*) as count FROM returns r JOIN purchase_orders po ON r.order_id = po.id WHERE po.supplier_id = ?`
    ).get(sid) as { count: number }

    const onTimeRate = completedOrders.count > 0 ? Math.round((onTimeOrders.count / totalOrders.count) * 10000) / 100 : 0
    const passRate = inspectionTotal.count > 0 ? Math.round((passCount.count / inspectionTotal.count) * 10000) / 100 : 100

    return {
      supplierId: sid,
      supplierName: supplier.name,
      totalOrders: totalOrders.count,
      onTimeRate,
      passRate,
      returnOrders: returnCount.count
    }
  })

  res.json({ success: true, data: performanceData })
})

export default router
