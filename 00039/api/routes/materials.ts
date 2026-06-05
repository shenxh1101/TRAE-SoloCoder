import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const { keyword, category } = req.query
  let sql = `
    SELECT m.*,
      COALESCE(h.avg_price, 0) as historical_avg_price,
      COALESCE(mp.latest_price, 0) as market_price
    FROM materials m
    LEFT JOIN (
      SELECT material_id, ROUND(AVG(price), 2) as avg_price 
      FROM price_history 
      GROUP BY material_id
    ) h ON m.id = h.material_id
    LEFT JOIN (
      SELECT material_id, price as latest_price 
      FROM price_history 
      WHERE id IN (
        SELECT MAX(id) FROM price_history GROUP BY material_id
      )
    ) mp ON m.id = mp.material_id
    WHERE 1=1`
  const params: unknown[] = []

  if (keyword) {
    sql += ` AND (m.name LIKE ? OR m.specification LIKE ?)`
    params.push(`%${keyword}%`, `%${keyword}%`)
  }
  if (category) {
    sql += ` AND m.category = ?`
    params.push(category)
  }

  sql += ` ORDER BY m.category, m.name`

  const materials = db.prepare(sql).all(...params) as Array<Record<string, unknown>>
  
  const withSuggested = materials.map((m) => {
    const historicalAvg = m.historical_avg_price as number
    const marketPrice = m.market_price as number
    const suggestedPrice = Math.round((historicalAvg * 0.7 + marketPrice * 0.3) * 100) / 100
    return { ...m, suggested_price: suggestedPrice }
  })
  
  res.json({ success: true, data: withSuggested })
})

router.get('/:id', (req: Request, res: Response): void => {
  const material = db.prepare(
    `SELECT m.*,
      COALESCE(h.avg_price, 0) as historical_avg_price,
      COALESCE(mp.latest_price, 0) as market_price
    FROM materials m
    LEFT JOIN (SELECT material_id, ROUND(AVG(price), 2) as avg_price FROM price_history GROUP BY material_id) h ON m.id = h.material_id
    LEFT JOIN (SELECT material_id, price as latest_price FROM price_history WHERE id IN (SELECT MAX(id) FROM price_history GROUP BY material_id)) mp ON m.id = mp.material_id
    WHERE m.id = ?`
  ).get(req.params.id) as Record<string, unknown> | undefined

  if (!material) {
    res.status(404).json({ success: false, error: '物料不存在' })
    return
  }

  const priceHistory = db.prepare(
    `SELECT * FROM price_history WHERE material_id = ? ORDER BY recorded_at DESC LIMIT 12`
  ).all(req.params.id)

  res.json({ success: true, data: { ...material, priceHistory } })
})

router.get('/categories/list', (req: Request, res: Response): void => {
  const categories = db.prepare(
    `SELECT DISTINCT category FROM materials WHERE category IS NOT NULL ORDER BY category`
  ).all()
  res.json({ success: true, data: categories })
})

export default router
