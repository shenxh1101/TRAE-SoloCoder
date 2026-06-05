import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'
import { generateVoucherPDF } from '../services/voucherGenerator.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const { type, recipient_id, read, limit = 50 } = req.query
  let sql = `SELECT * FROM messages WHERE 1=1`
  const params: unknown[] = []

  if (type) {
    sql += ` AND type = ?`
    params.push(type)
  }
  if (recipient_id) {
    sql += ` AND recipient_id = ?`
    params.push(recipient_id)
  }
  if (read !== undefined) {
    sql += ` AND read = ?`
    params.push(read === 'true' || read === '1' ? 1 : 0)
  }

  sql += ` ORDER BY created_at DESC LIMIT ?`
  params.push(Number(limit))

  const messages = db.prepare(sql).all(...params)
  res.json({ success: true, data: messages })
})

router.get('/unread-count', (req: Request, res: Response): void => {
  const { recipient_id } = req.query

  if (!recipient_id) {
    res.status(400).json({ success: false, error: '缺少recipient_id参数' })
    return
  }

  const total = db.prepare(
    `SELECT COUNT(*) as count FROM messages WHERE recipient_id = ? AND read = 0`
  ).get(recipient_id) as { count: number }

  const byType = db.prepare(
    `SELECT type, COUNT(*) as count FROM messages WHERE recipient_id = ? AND read = 0 GROUP BY type`
  ).all(recipient_id)

  res.json({
    success: true,
    data: {
      total: total.count,
      byType
    }
  })
})

router.get('/:id', (req: Request, res: Response): void => {
  const message = db.prepare(`SELECT * FROM messages WHERE id = ?`).get(req.params.id)
  if (!message) {
    res.status(404).json({ success: false, error: '消息不存在' })
    return
  }
  res.json({ success: true, data: message })
})

router.put('/:id/read', (req: Request, res: Response): void => {
  db.prepare(`UPDATE messages SET read = 1 WHERE id = ?`).run(req.params.id)
  res.json({ success: true, data: { id: req.params.id, read: true } })
})

router.put('/read-all', (req: Request, res: Response): void => {
  const { recipient_id } = req.body
  if (!recipient_id) {
    res.status(400).json({ success: false, error: '缺少recipient_id' })
    return
  }
  db.prepare(`UPDATE messages SET read = 1 WHERE recipient_id = ? AND read = 0`).run(recipient_id)
  res.json({ success: true, data: { recipient_id, allRead: true } })
})

router.post('/', (req: Request, res: Response): void => {
  const { type, title, content, recipientRole, recipientId, relatedOrderId, attachmentPath } = req.body

  if (!type || !title || !content || !recipientRole) {
    res.status(400).json({ success: false, error: '缺少必要参数' })
    return
  }

  const id = uuidv4()
  const now = new Date().toISOString()

  db.prepare(
    `INSERT INTO messages (id, type, title, content, recipient_role, recipient_id, related_order_id, attachment_path, read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, type, title, content, recipientRole, recipientId || null, relatedOrderId || null, attachmentPath || null, 0, now)

  const message = db.prepare(`SELECT * FROM messages WHERE id = ?`).get(id)
  res.json({ success: true, data: message })
})

router.delete('/:id', (req: Request, res: Response): void => {
  const message = db.prepare(`SELECT * FROM messages WHERE id = ?`).get(req.params.id)
  if (!message) {
    res.status(404).json({ success: false, error: '消息不存在' })
    return
  }
  db.prepare(`DELETE FROM messages WHERE id = ?`).run(req.params.id)
  res.json({ success: true, data: { id: req.params.id, deleted: true } })
})

router.get('/:id/attachment', (req: Request, res: Response): void => {
  const messageId = req.params.id
  const message = db.prepare(`SELECT * FROM messages WHERE id = ?`).get(messageId) as Record<string, unknown> | undefined

  if (!message) {
    res.status(404).json({ success: false, error: '消息不存在' })
    return
  }

  const voucher = generateVoucherPDF(messageId)
  const content = Buffer.from(voucher, 'utf-8')
  const filename = `voucher_${messageId.slice(0, 8)}.txt`

  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.setHeader('Content-Length', content.length)

  res.send(content)
})

export default router
