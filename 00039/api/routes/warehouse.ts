import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'

const router = Router()

router.post('/scan-in', (req: Request, res: Response): void => {
  const { materialId, orderId, warehouse, quantity } = req.body

  if (!materialId || !warehouse || !quantity) {
    res.status(400).json({ success: false, error: '缺少必要参数' })
    return
  }

  const material = db.prepare(`SELECT * FROM materials WHERE id = ?`).get(materialId) as Record<string, unknown> | undefined
  if (!material) {
    res.status(404).json({ success: false, error: '物料不存在' })
    return
  }

  const now = new Date().toISOString()

  const existing = db.prepare(
    `SELECT * FROM inventory WHERE material_id = ? AND warehouse = ?`
  ).get(materialId, warehouse) as Record<string, unknown> | undefined

  if (existing) {
    const newQty = (existing.quantity as number) + quantity
    db.prepare(
      `UPDATE inventory SET quantity = ?, last_in_at = ? WHERE id = ?`
    ).run(newQty, now, existing.id)

    res.json({
      success: true,
      data: {
        id: existing.id,
        materialId,
        materialName: material.name,
        warehouse,
        quantity: newQty,
        lastInAt: now,
        added: quantity
      }
    })
  } else {
    const invId = uuidv4()
    db.prepare(
      `INSERT INTO inventory (id, material_id, warehouse, quantity, last_in_at) VALUES (?, ?, ?, ?, ?)`
    ).run(invId, materialId, warehouse, quantity, now)

    res.json({
      success: true,
      data: {
        id: invId,
        materialId,
        materialName: material.name,
        warehouse,
        quantity,
        lastInAt: now,
        added: quantity
      }
    })
  }
})

router.get('/stock', (req: Request, res: Response): void => {
  const { material_id, warehouse, keyword } = req.query
  let sql = `
    SELECT i.*, m.name as material_name, m.category, m.unit, m.specification
    FROM inventory i
    JOIN materials m ON i.material_id = m.id
    WHERE 1=1
  `
  const params: unknown[] = []

  if (material_id) {
    sql += ` AND i.material_id = ?`
    params.push(material_id)
  }
  if (warehouse) {
    sql += ` AND i.warehouse = ?`
    params.push(warehouse)
  }
  if (keyword) {
    sql += ` AND m.name LIKE ?`
    params.push(`%${keyword}%`)
  }

  sql += ` ORDER BY m.name`

  const stock = db.prepare(sql).all(...params)
  res.json({ success: true, data: stock })
})

router.get('/stock/summary', (req: Request, res: Response): void => {
  const summary = db.prepare(`
    SELECT m.id as material_id, m.name as material_name, m.unit, m.category,
           SUM(i.quantity) as total_quantity,
           GROUP_CONCAT(i.warehouse || ':' || i.quantity) as warehouse_details
    FROM materials m
    LEFT JOIN inventory i ON m.id = i.material_id
    GROUP BY m.id
    ORDER BY m.category, m.name
  `).all()

  res.json({ success: true, data: summary })
})

router.get('/warehouses', (req: Request, res: Response): void => {
  const warehouses = db.prepare(`SELECT DISTINCT warehouse FROM inventory`).all()
  res.json({ success: true, data: warehouses })
})

export default router
