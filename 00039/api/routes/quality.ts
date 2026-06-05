import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'

const router = Router()

function createNotification(type: string, title: string, content: string, recipientRole: string, recipientId: string | null, relatedOrderId: string | null) {
  db.prepare(
    `INSERT INTO messages (id, type, title, content, recipient_role, recipient_id, related_order_id, attachment_path, read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(uuidv4(), type, title, content, recipientRole, recipientId, relatedOrderId, null, 0, new Date().toISOString())
}

router.get('/', (req: Request, res: Response): void => {
  const { order_id, result } = req.query
  let sql = `
    SELECT ir.*, m.name as material_name, u.name as inspector_name, po.order_no
    FROM inspection_reports ir
    JOIN materials m ON ir.material_id = m.id
    JOIN users u ON ir.inspector = u.id
    JOIN purchase_orders po ON ir.order_id = po.id
    WHERE 1=1
  `
  const params: unknown[] = []

  if (order_id) {
    sql += ` AND ir.order_id = ?`
    params.push(order_id)
  }
  if (result) {
    sql += ` AND ir.result = ?`
    params.push(result)
  }

  sql += ` ORDER BY ir.created_at DESC`

  const reports = db.prepare(sql).all(...params) as Array<Record<string, unknown>>

  for (const report of reports) {
    const items = db.prepare(
      `SELECT * FROM inspection_items WHERE report_id = ?`
    ).all(report.id)
    report.items = items
  }

  res.json({ success: true, data: reports })
})

router.get('/:id', (req: Request, res: Response): void => {
  const report = db.prepare(
    `SELECT ir.*, m.name as material_name, u.name as inspector_name, po.order_no FROM inspection_reports ir JOIN materials m ON ir.material_id = m.id JOIN users u ON ir.inspector = u.id JOIN purchase_orders po ON ir.order_id = po.id WHERE ir.id = ?`
  ).get(req.params.id) as Record<string, unknown> | undefined

  if (!report) {
    res.status(404).json({ success: false, error: '质检报告不存在' })
    return
  }

  const items = db.prepare(`SELECT * FROM inspection_items WHERE report_id = ?`).all(report.id)
  report.items = items

  res.json({ success: true, data: report })
})

router.post('/', (req: Request, res: Response): void => {
  const { orderId, batchNo, materialId, inspector, items, reportFilePath } = req.body

  if (!orderId || !batchNo || !materialId || !inspector || !items?.length) {
    res.status(400).json({ success: false, error: '缺少必要参数' })
    return
  }

  const allPassed = items.every((item: { passed: boolean }) => item.passed === true)
  const result = allPassed ? 'pass' : 'fail'

  const reportId = uuidv4()
  const now = new Date().toISOString()

  db.prepare(
    `INSERT INTO inspection_reports (id, order_id, batch_no, material_id, inspector, result, report_file_path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(reportId, orderId, batchNo, materialId, inspector, result, reportFilePath || null, now)

  const insertItem = db.prepare(
    `INSERT INTO inspection_items (id, report_id, name, standard, actual, passed) VALUES (?, ?, ?, ?, ?, ?)`
  )

  for (const item of items) {
    insertItem.run(uuidv4(), reportId, item.name, item.standard, item.actual, item.passed ? 1 : 0)
  }

  const order = db.prepare(`SELECT * FROM purchase_orders WHERE id = ?`).get(orderId) as Record<string, unknown> | undefined

  if (result === 'fail') {
    db.prepare(
      `INSERT INTO returns (id, order_id, report_id, reason, status, created_at) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(uuidv4(), orderId, reportId, `质检不合格：批次${batchNo}检测不通过`, 'pending', now)

    db.prepare(
      `UPDATE purchase_orders SET status = 'partial_return', updated_at = ? WHERE id = ?`
    ).run(now, orderId)

    createNotification(
      'quality_result', '质检不合格通知',
      `批次${batchNo}质检结果为不合格，已自动发起退货流程`,
      'supplier', null, orderId
    )
    createNotification(
      'return_notice', '退货通知',
      `采购订单${order?.order_no}因质检不合格已发起退货，请安排补发`,
      'supplier', null, orderId
    )
  } else {
    createNotification(
      'quality_result', '质检合格通知',
      `批次${batchNo}质检结果为合格，可安排入库`,
      'warehouse', null, orderId
    )
  }

  const createdReport = db.prepare(
    `SELECT ir.*, m.name as material_name, u.name as inspector_name FROM inspection_reports ir JOIN materials m ON ir.material_id = m.id JOIN users u ON ir.inspector = u.id WHERE ir.id = ?`
  ).get(reportId) as Record<string, unknown>

  const createdItems = db.prepare(`SELECT * FROM inspection_items WHERE report_id = ?`).all(reportId)

  res.json({
    success: true,
    data: { ...createdReport, items: createdItems }
  })
})

export default router
