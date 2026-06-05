import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'

const router = Router()

function calcSuggestedPrice(materialId: string): {
  historicalAvg: number
  marketPrice: number
  suggestedPrice: number
  reason: string
} {
  const histRow = db.prepare(
    `SELECT AVG(price) as avgPrice FROM price_history WHERE material_id = ?`
  ).get(materialId) as { avgPrice: number | null }

  const marketRow = db.prepare(
    `SELECT price FROM price_history WHERE material_id = ? ORDER BY recorded_at DESC LIMIT 1`
  ).get(materialId) as { price: number } | undefined

  const historicalAvg = histRow?.avgPrice ? Math.round(histRow.avgPrice * 100) / 100 : 0
  const marketPrice = marketRow?.price ?? 0

  if (historicalAvg === 0 && marketPrice === 0) {
    return { historicalAvg: 0, marketPrice: 0, suggestedPrice: 0, reason: '暂无历史价格数据' }
  }

  const suggestedPrice = Math.round((historicalAvg * 0.7 + marketPrice * 0.3) * 100) / 100
  const reason = `历史均价${historicalAvg}元(权重70%) + 最新市场价${marketPrice}元(权重30%)`

  return { historicalAvg, marketPrice, suggestedPrice, reason }
}

function createNotification(type: string, title: string, content: string, recipientRole: string, recipientId: string | null, relatedOrderId: string | null) {
  db.prepare(
    `INSERT INTO messages (id, type, title, content, recipient_role, recipient_id, related_order_id, attachment_path, read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(uuidv4(), type, title, content, recipientRole, recipientId, relatedOrderId, null, 0, new Date().toISOString())
}

router.get('/', (req: Request, res: Response): void => {
  const { status, supplier_id, keyword } = req.query
  let sql = `
    SELECT po.*, s.name as supplier_name, u.name as creator_name
    FROM purchase_orders po
    JOIN suppliers s ON po.supplier_id = s.id
    JOIN users u ON po.created_by = u.id
    WHERE 1=1
  `
  const params: unknown[] = []

  if (status) {
    sql += ` AND po.status = ?`
    params.push(status)
  }
  if (supplier_id) {
    sql += ` AND po.supplier_id = ?`
    params.push(supplier_id)
  }
  if (keyword) {
    sql += ` AND (po.order_no LIKE ? OR s.name LIKE ?)`
    params.push(`%${keyword}%`, `%${keyword}%`)
  }

  sql += ` ORDER BY po.created_at DESC`

  const orders = db.prepare(sql).all(...params) as Array<Record<string, unknown>>

  for (const order of orders) {
    const items = db.prepare(
      `SELECT oi.*, m.name as material_name, m.specification FROM order_items oi JOIN materials m ON oi.material_id = m.id WHERE oi.order_id = ?`
    ).all(order.id)
    ;(order as Record<string, unknown>).items = items
  }

  res.json({ success: true, data: orders })
})

router.get('/:id', (req: Request, res: Response): void => {
  const order = db.prepare(
    `SELECT po.*, s.name as supplier_name, u.name as creator_name FROM purchase_orders po JOIN suppliers s ON po.supplier_id = s.id JOIN users u ON po.created_by = u.id WHERE po.id = ?`
  ).get(req.params.id) as Record<string, unknown> | undefined

  if (!order) {
    res.status(404).json({ success: false, error: '订单不存在' })
    return
  }

  const items = db.prepare(
    `SELECT oi.*, m.name as material_name, m.specification FROM order_items oi JOIN materials m ON oi.material_id = m.id WHERE oi.order_id = ?`
  ).all(order.id)
  order.items = items

  const suggestedPrices = (items as Array<Record<string, unknown>>).map((item) => {
    const calc = calcSuggestedPrice(item.material_id as string)
    return {
      materialId: item.material_id,
      materialName: item.material_name,
      ...calc
    }
  })
  order.suggestedPrices = suggestedPrices

  res.json({ success: true, data: order })
})

router.post('/', (req: Request, res: Response): void => {
  const { supplierId, createdBy, budgetAmount, items } = req.body

  if (!supplierId || !createdBy || !budgetAmount || !items?.length) {
    res.status(400).json({ success: false, error: '缺少必要参数' })
    return
  }

  const orderId = uuidv4()
  const now = new Date().toISOString()
  const orderNo = `PO${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`

  let totalAmount = 0
  const orderItems = []
  for (const item of items) {
    const calc = calcSuggestedPrice(item.materialId)
    const itemTotal = calc.suggestedPrice * item.quantity
    totalAmount += itemTotal
    orderItems.push({
      ...item,
      calc
    })
  }

  db.prepare(
    `INSERT INTO purchase_orders (id, order_no, supplier_id, created_by, budget_amount, total_amount, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(orderId, orderNo, supplierId, createdBy, budgetAmount, Math.round(totalAmount * 100) / 100, 'pending_quote', now, now)

  const insertItem = db.prepare(
    `INSERT INTO order_items (id, order_id, material_id, quantity, unit, suggested_price, quoted_price, historical_avg_price, market_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )

  const resultItems = []
  for (const item of orderItems) {
    const itemId = uuidv4()
    insertItem.run(
      itemId, orderId, item.materialId, item.quantity, item.unit,
      item.calc.suggestedPrice, 0, item.calc.historicalAvg, item.calc.marketPrice
    )
    resultItems.push({
      id: itemId,
      materialId: item.materialId,
      suggestedPrice: item.calc.suggestedPrice,
      historicalAvg: item.calc.historicalAvg,
      marketPrice: item.calc.marketPrice
    })
  }

  createNotification(
    'order_change', '新采购订单待报价',
    `采购订单${orderNo}已创建，请尽快确认报价`,
    'supplier', null, orderId
  )

  res.json({
    success: true,
    data: {
      id: orderId, orderNo, supplierId, createdBy,
      budgetAmount, totalAmount: Math.round(totalAmount * 100) / 100,
      status: 'pending_quote', items: resultItems, createdAt: now
    }
  })
})

router.put('/:id/status', (req: Request, res: Response): void => {
  const { status } = req.body
  const orderId = req.params.id

  const order = db.prepare(`SELECT * FROM purchase_orders WHERE id = ?`).get(orderId) as Record<string, unknown> | undefined
  if (!order) {
    res.status(404).json({ success: false, error: '订单不存在' })
    return
  }

  const now = new Date().toISOString()
  db.prepare(`UPDATE purchase_orders SET status = ?, updated_at = ? WHERE id = ?`).run(status, now, orderId)

  createNotification(
    'order_change', '订单状态变更',
    `采购订单${order.order_no}状态已变更为${status}`,
    'purchaser', order.created_by as string, orderId
  )

  res.json({ success: true, data: { id: orderId, status, updatedAt: now } })
})

router.put('/:id/quote', (req: Request, res: Response): void => {
  const { items, supplierId } = req.body
  const orderId = req.params.id

  const order = db.prepare(`SELECT * FROM purchase_orders WHERE id = ?`).get(orderId) as Record<string, unknown> | undefined
  if (!order) {
    res.status(404).json({ success: false, error: '订单不存在' })
    return
  }

  let totalAmount = 0
  const now = new Date().toISOString()

  for (const item of items) {
    db.prepare(
      `UPDATE order_items SET quoted_price = ? WHERE order_id = ? AND material_id = ?`
    ).run(item.quotedPrice, orderId, item.materialId)
    totalAmount += item.quotedPrice * item.quantity
  }

  totalAmount = Math.round(totalAmount * 100) / 100

  const budgetAmount = order.budget_amount as number
  const overBudget = totalAmount > budgetAmount * 1.05
  const newStatus = overBudget ? 'locked' : 'quoted'

  db.prepare(
    `UPDATE purchase_orders SET total_amount = ?, status = ?, updated_at = ? WHERE id = ?`
  ).run(totalAmount, newStatus, now, orderId)

  if (overBudget) {
    createNotification(
      'budget_alert', '订单报价超预算',
      `采购订单${order.order_no}供应商修改报价后金额${totalAmount}元，超出预算5%（预算${budgetAmount}元），已自动锁定，请审批`,
      'purchaser', order.created_by as string, orderId
    )
  } else {
    createNotification(
      'order_change', '供应商已报价',
      `采购订单${order.order_no}供应商已完成报价，总金额${totalAmount}元`,
      'purchaser', order.created_by as string, orderId
    )
  }

  res.json({
    success: true,
    data: {
      id: orderId, totalAmount, status: newStatus, overBudget,
      overBudgetPercent: budgetAmount > 0 ? Math.round(((totalAmount - budgetAmount) / budgetAmount) * 10000) / 100 : 0
    }
  })
})

router.put('/:id/approve', (req: Request, res: Response): void => {
  const orderId = req.params.id
  const { approved } = req.body

  const order = db.prepare(`SELECT * FROM purchase_orders WHERE id = ?`).get(orderId) as Record<string, unknown> | undefined
  if (!order) {
    res.status(404).json({ success: false, error: '订单不存在' })
    return
  }

  const now = new Date().toISOString()
  const newStatus = approved ? 'approved' : 'pending_quote'

  db.prepare(`UPDATE purchase_orders SET status = ?, updated_at = ? WHERE id = ?`).run(newStatus, now, orderId)

  if (approved) {
    createNotification(
      'order_change', '订单审批通过',
      `采购订单${order.order_no}已审批通过，可进行合同签署`,
      'supplier', null, orderId
    )
  } else {
    createNotification(
      'order_change', '订单审批驳回',
      `采购订单${order.order_no}已被驳回，请重新报价`,
      'supplier', null, orderId
    )
  }

  res.json({ success: true, data: { id: orderId, status: newStatus } })
})

router.get('/suggested-prices/:materialId', (req: Request, res: Response): void => {
  const calc = calcSuggestedPrice(req.params.materialId)
  const material = db.prepare(`SELECT * FROM materials WHERE id = ?`).get(req.params.materialId) as Record<string, unknown> | undefined

  if (!material) {
    res.status(404).json({ success: false, error: '物料不存在' })
    return
  }

  res.json({
    success: true,
    data: {
      materialId: req.params.materialId,
      materialName: material.name,
      ...calc
    }
  })
})

router.get('/:id/logs', (req: Request, res: Response): void => {
  const orderId = req.params.id
  const order = db.prepare(`SELECT * FROM purchase_orders WHERE id = ?`).get(orderId)

  if (!order) {
    res.status(404).json({ success: false, error: '订单不存在' })
    return
  }

  const logs = [
    { id: '1', action: '创建订单', operator: '系统', time: (order as Record<string, unknown>).created_at, remark: '订单已创建' },
    { id: '2', action: '状态更新', operator: '系统', time: (order as Record<string, unknown>).updated_at, remark: `当前状态：${(order as Record<string, unknown>).status}` },
  ]

  res.json({ success: true, data: logs })
})

export default router
