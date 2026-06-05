import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const { order_id, status } = req.query
  let sql = `
    SELECT c.*, po.order_no, s.name as supplier_name
    FROM contracts c
    JOIN purchase_orders po ON c.order_id = po.id
    JOIN suppliers s ON po.supplier_id = s.id
    WHERE 1=1
  `
  const params: unknown[] = []

  if (order_id) {
    sql += ` AND c.order_id = ?`
    params.push(order_id)
  }
  if (status) {
    sql += ` AND c.status = ?`
    params.push(status)
  }

  sql += ` ORDER BY c.order_id`

  const contracts = db.prepare(sql).all(...params)
  res.json({ success: true, data: contracts })
})

router.get('/:id', (req: Request, res: Response): void => {
  const contract = db.prepare(
    `SELECT c.*, po.order_no, po.budget_amount, po.total_amount, po.status as order_status, s.name as supplier_name FROM contracts c JOIN purchase_orders po ON c.order_id = po.id JOIN suppliers s ON po.supplier_id = s.id WHERE c.id = ?`
  ).get(req.params.id) as Record<string, unknown> | undefined

  if (!contract) {
    res.status(404).json({ success: false, error: '合同不存在' })
    return
  }

  const items = db.prepare(
    `SELECT oi.*, m.name as material_name, m.specification FROM order_items oi JOIN materials m ON oi.material_id = m.id WHERE oi.order_id = ?`
  ).all(contract.order_id)
  contract.items = items

  res.json({ success: true, data: contract })
})

router.post('/generate', (req: Request, res: Response): void => {
  const { orderId } = req.body

  if (!orderId) {
    res.status(400).json({ success: false, error: '缺少订单ID' })
    return
  }

  const order = db.prepare(`SELECT * FROM purchase_orders WHERE id = ?`).get(orderId) as Record<string, unknown> | undefined
  if (!order) {
    res.status(404).json({ success: false, error: '订单不存在' })
    return
  }

  const existing = db.prepare(`SELECT * FROM contracts WHERE order_id = ?`).get(orderId)
  if (existing) {
    res.status(400).json({ success: false, error: '该订单已存在合同' })
    return
  }

  const contractId = uuidv4()
  db.prepare(
    `INSERT INTO contracts (id, order_id, buyer_signature, supplier_signature, buyer_signed_at, supplier_signed_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(contractId, orderId, null, null, null, null, 'pending')

  const contract = db.prepare(`SELECT * FROM contracts WHERE id = ?`).get(contractId)
  res.json({ success: true, data: contract })
})

router.post('/:id/sign', (req: Request, res: Response): void => {
  const { role, signature } = req.body
  const contractId = req.params.id

  if (!role || !signature) {
    res.status(400).json({ success: false, error: '缺少签署角色或签名数据' })
    return
  }

  const contract = db.prepare(`SELECT * FROM contracts WHERE id = ?`).get(contractId) as Record<string, unknown> | undefined
  if (!contract) {
    res.status(404).json({ success: false, error: '合同不存在' })
    return
  }

  const now = new Date().toISOString()

  if (role === 'buyer') {
    db.prepare(
      `UPDATE contracts SET buyer_signature = ?, buyer_signed_at = ?, status = ? WHERE id = ?`
    ).run(signature, now, contract.supplier_signature ? 'signed' : 'partial_signed', contractId)
  } else if (role === 'supplier') {
    db.prepare(
      `UPDATE contracts SET supplier_signature = ?, supplier_signed_at = ?, status = ? WHERE id = ?`
    ).run(signature, now, contract.buyer_signature ? 'signed' : 'partial_signed', contractId)
  } else {
    res.status(400).json({ success: false, error: '无效的签署角色' })
    return
  }

  const updatedContract = db.prepare(`SELECT * FROM contracts WHERE id = ?`).get(contractId) as Record<string, unknown>

  if (updatedContract.status === 'signed') {
    db.prepare(
      `UPDATE purchase_orders SET status = 'contracted', updated_at = ? WHERE id = ?`
    ).run(now, contract.order_id)
  }

  res.json({ success: true, data: updatedContract })
})

export default router
