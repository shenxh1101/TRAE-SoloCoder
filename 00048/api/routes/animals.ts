import { Router, type Request, type Response } from 'express'
import { getDb } from '../database.js'
import { authMiddleware } from './auth.js'

const router = Router()

const NOW = `datetime('now','localtime')`

function parseJsonFields(animal: any) {
  if (animal) {
    try { animal.personality = JSON.parse(animal.personality) } catch { animal.personality = [] }
    try { animal.photos = JSON.parse(animal.photos) } catch { animal.photos = [] }
  }
  return animal
}

router.get('/', (req: Request, res: Response): void => {
  const db = getDb()
  const { type, status, page = '1', limit = '20' } = req.query

  let sql = 'SELECT * FROM animals WHERE 1=1'
  const params: any[] = []

  if (type) {
    sql += ' AND type = ?'
    params.push(type)
  }
  if (status) {
    sql += ' AND status = ?'
    params.push(status)
  }

  const pageNum = parseInt(page as string)
  const limitNum = parseInt(limit as string)
  const offset = (pageNum - 1) * limitNum

  const countResult = db.prepare(sql.replace('SELECT *', 'SELECT COUNT(*) as total')).get(...params) as { total: number }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
  params.push(limitNum, offset)

  const animals = db.prepare(sql).all(...params).map(parseJsonFields)

  res.json({
    success: true,
    data: {
      items: animals,
      total: countResult.total,
      page: pageNum,
      limit: limitNum,
    },
  })
})

router.get('/:id', (req: Request, res: Response): void => {
  const db = getDb()
  const animal = db.prepare('SELECT * FROM animals WHERE id = ?').get(req.params.id) as any
  if (!animal) {
    res.status(404).json({ success: false, error: '动物不存在' })
    return
  }

  const medicalRecords = db.prepare('SELECT * FROM medical_records WHERE animal_id = ? ORDER BY record_date DESC').all(animal.id)
  const vaccineRecords = db.prepare('SELECT * FROM vaccine_records WHERE animal_id = ? ORDER BY vaccinate_date DESC').all(animal.id)
  const hospital = animal.hospital_id ? db.prepare('SELECT * FROM hospitals WHERE id = ?').get(animal.hospital_id) : null

  res.json({
    success: true,
    data: {
      ...parseJsonFields(animal),
      medical_records: medicalRecords,
      vaccine_records: vaccineRecords,
      hospital,
    },
  })
})

router.post('/:id/medical', authMiddleware, (req: Request, res: Response): void => {
  const currentUser = (req as any).user
  if (currentUser.role !== 'admin' && currentUser.role !== 'volunteer') {
    res.status(403).json({ success: false, error: '无权添加医疗记录' })
    return
  }

  const db = getDb()
  const animal = db.prepare('SELECT * FROM animals WHERE id = ?').get(req.params.id)
  if (!animal) {
    res.status(404).json({ success: false, error: '动物不存在' })
    return
  }

  const { hospital_id, doctor_name, diagnosis, treatment, prescription, cost, notes, record_date } = req.body
  if (!diagnosis || !treatment) {
    res.status(400).json({ success: false, error: '诊断和治疗方案不能为空' })
    return
  }

  const result = db.prepare(`
    INSERT INTO medical_records (animal_id, hospital_id, doctor_name, diagnosis, treatment, prescription, cost, notes, record_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(parseInt(req.params.id), hospital_id || null, doctor_name || '', diagnosis, treatment, prescription || '', cost || 0, notes || '', record_date || new Date().toISOString().split('T')[0])

  const record = db.prepare('SELECT * FROM medical_records WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json({ success: true, data: record })
})

router.patch('/:id', authMiddleware, (req: Request, res: Response): void => {
  const currentUser = (req as any).user
  if (currentUser.role !== 'admin' && currentUser.role !== 'volunteer') {
    res.status(403).json({ success: false, error: '无权修改动物信息' })
    return
  }

  const db = getDb()
  const animal = db.prepare('SELECT * FROM animals WHERE id = ?').get(req.params.id) as any
  if (!animal) {
    res.status(404).json({ success: false, error: '动物不存在' })
    return
  }

  const allowedFields = ['name', 'breed', 'age', 'gender', 'color', 'weight', 'description', 'personality', 'photos', 'status', 'neutered', 'hospital_id']
  const updates: string[] = [`updated_at = ${NOW}`]
  const params: any[] = []

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`)
      if (field === 'personality' || field === 'photos') {
        params.push(JSON.stringify(req.body[field]))
      } else {
        params.push(req.body[field])
      }
    }
  }

  if (updates.length === 1) {
    res.status(400).json({ success: false, error: '没有需要更新的字段' })
    return
  }

  params.push(req.params.id)
  db.prepare(`UPDATE animals SET ${updates.join(', ')} WHERE id = ?`).run(...params)

  const updated = db.prepare('SELECT * FROM animals WHERE id = ?').get(req.params.id)
  res.json({ success: true, data: parseJsonFields(updated) })
})

export default router
