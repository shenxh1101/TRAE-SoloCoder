import { Router, type Request, type Response } from 'express'
import { getDb } from '../database.js'
import { authMiddleware } from './auth.js'

const router = Router()

const NOW = `datetime('now','localtime')`

function parseJsonFields(fu: any) {
  if (fu && fu.photos) {
    try { fu.photos = JSON.parse(fu.photos) } catch { fu.photos = [] }
  }
  return fu
}

router.get('/', authMiddleware, (req: Request, res: Response): void => {
  const currentUser = (req as any).user
  const db = getDb()

  let sql = 'SELECT * FROM follow_ups WHERE 1=1'
  const params: any[] = []

  if (currentUser.role !== 'admin') {
    sql += ' AND user_id = ?'
    params.push(currentUser.id)
  }

  const { status } = req.query
  if (status) {
    sql += ' AND status = ?'
    params.push(status)
  }

  sql += ' ORDER BY scheduled_date ASC'

  const followUps = db.prepare(sql).all(...params).map((fu: any) => {
    const animal = db.prepare('SELECT id, name, type, photos FROM animals WHERE id = ?').get(fu.animal_id)
    const agreement = db.prepare('SELECT * FROM adoption_agreements WHERE id = ?').get(fu.agreement_id)
    return {
      ...parseJsonFields(fu),
      animal: animal ? parseJsonFields(animal) : null,
      agreement,
    }
  })

  res.json({ success: true, data: followUps })
})

router.post('/:id', authMiddleware, (req: Request, res: Response): void => {
  const currentUser = (req as any).user
  const db = getDb()

  const followUp = db.prepare('SELECT * FROM follow_ups WHERE id = ?').get(req.params.id) as any
  if (!followUp) {
    res.status(404).json({ success: false, error: '回访记录不存在' })
    return
  }

  if (currentUser.role !== 'admin' && followUp.user_id !== currentUser.id) {
    res.status(403).json({ success: false, error: '无权操作此回访记录' })
    return
  }

  const { status, notes, photos } = req.body
  if (!status) {
    res.status(400).json({ success: false, error: '状态不能为空' })
    return
  }

  const updates: string[] = ['status = ?', `updated_at = ${NOW}`]
  const params: any[] = [status]

  if (notes !== undefined) {
    updates.push('notes = ?')
    params.push(notes)
  }
  if (photos !== undefined) {
    updates.push('photos = ?')
    params.push(JSON.stringify(photos))
  }

  params.push(req.params.id)
  db.prepare(`UPDATE follow_ups SET ${updates.join(', ')} WHERE id = ?`).run(...params)

  const updated = db.prepare('SELECT * FROM follow_ups WHERE id = ?').get(req.params.id)
  res.json({ success: true, data: parseJsonFields(updated) })
})

export default router
