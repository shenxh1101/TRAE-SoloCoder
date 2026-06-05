import { Router, type Request, type Response } from 'express'
import { getDb } from '../database.js'
import { authMiddleware } from './auth.js'
import { notificationService } from '../notification.js'

const router = Router()

const NOW = `datetime('now','localtime')`

function parseJsonFields(task: any) {
  if (task && task.rescue_photos) {
    try { task.rescue_photos = JSON.parse(task.rescue_photos) } catch { task.rescue_photos = [] }
  }
  return task
}

const LIST_SELECT = `
  SELECT rt.id, rt.report_id as reportId, rt.volunteer_id as volunteerId, rt.status,
    rt.description, rt.notes, rt.rescue_photos as rescuePhotos, rt.hospital_id as hospitalId,
    rt.created_at as createdAt, rt.updated_at as updatedAt,
    sr.location as address, sr.latitude as lat, sr.longitude as lng,
    sr.urgency, sr.animal_type as animalType
  FROM rescue_tasks rt
  JOIN stray_reports sr ON rt.report_id = sr.id
`

router.get('/', (req: Request, res: Response): void => {
  const db = getDb()
  const { status, page = '1', limit = '20' } = req.query

  let where = ' WHERE 1=1'
  const params: any[] = []

  if (status) {
    where += ' AND rt.status = ?'
    params.push(status)
  }

  const pageNum = parseInt(page as string)
  const limitNum = parseInt(limit as string)
  const offset = (pageNum - 1) * limitNum

  const countResult = db.prepare(
    `SELECT COUNT(*) as total FROM rescue_tasks rt JOIN stray_reports sr ON rt.report_id = sr.id${where}`
  ).get(...params) as { total: number }

  const sql = `${LIST_SELECT}${where} ORDER BY rt.created_at DESC LIMIT ? OFFSET ?`
  const tasks = db.prepare(sql).all(...params, limitNum, offset).map(parseJsonFields)

  res.json({
    success: true,
    data: {
      items: tasks,
      total: countResult.total,
      page: pageNum,
      limit: limitNum,
    },
  })
})

router.get('/:id', (req: Request, res: Response): void => {
  const db = getDb()
  const task = db.prepare(`
    SELECT rt.id, rt.report_id as reportId, rt.volunteer_id as volunteerId,
      u.username as volunteerName, rt.status, rt.description, rt.notes,
      rt.rescue_photos as rescuePhotos, rt.hospital_id as hospitalId,
      rt.created_at as createdAt, rt.updated_at as updatedAt,
      sr.location as address, sr.latitude as lat, sr.longitude as lng,
      sr.urgency, sr.animal_type as animalType
    FROM rescue_tasks rt
    JOIN stray_reports sr ON rt.report_id = sr.id
    LEFT JOIN users u ON rt.volunteer_id = u.id
    WHERE rt.id = ?
  `).get(req.params.id)

  if (!task) {
    res.status(404).json({ success: false, error: '救援任务不存在' })
    return
  }

  res.json({ success: true, data: parseJsonFields(task) })
})

router.post('/:id/accept', authMiddleware, (req: Request, res: Response): void => {
  const currentUser = (req as any).user
  if (currentUser.role !== 'volunteer' && currentUser.role !== 'admin') {
    res.status(403).json({ success: false, error: '仅志愿者可接受任务' })
    return
  }

  const db = getDb()
  const task = db.prepare('SELECT * FROM rescue_tasks WHERE id = ?').get(req.params.id) as any
  if (!task) {
    res.status(404).json({ success: false, error: '救援任务不存在' })
    return
  }
  if (task.status !== 'pending' && task.status !== 'assigned') {
    res.status(400).json({ success: false, error: '任务状态不允许接受' })
    return
  }

  db.prepare(`UPDATE rescue_tasks SET volunteer_id = ?, status = ?, updated_at = ${NOW} WHERE id = ?`).run(currentUser.id, 'in_progress', req.params.id)

  if (task.report_id) {
    db.prepare(`UPDATE stray_reports SET status = ?, updated_at = ${NOW} WHERE id = ?`).run('rescuing', task.report_id)
  }

  const updated = db.prepare('SELECT * FROM rescue_tasks WHERE id = ?').get(req.params.id)
  res.json({ success: true, data: parseJsonFields(updated) })
})

router.patch('/:id/status', authMiddleware, (req: Request, res: Response): void => {
  const currentUser = (req as any).user
  const { status, notes, rescue_photos } = req.body

  if (!status) {
    res.status(400).json({ success: false, error: '状态不能为空' })
    return
  }

  const validStatuses = ['pending', 'assigned', 'in_progress', 'completed', 'cancelled']
  if (!validStatuses.includes(status)) {
    res.status(400).json({ success: false, error: '无效的状态值' })
    return
  }

  const db = getDb()
  const task = db.prepare('SELECT * FROM rescue_tasks WHERE id = ?').get(req.params.id) as any
  if (!task) {
    res.status(404).json({ success: false, error: '救援任务不存在' })
    return
  }

  const updates: string[] = ['status = ?', `updated_at = ${NOW}`]
  const params: any[] = [status]

  if (notes !== undefined) {
    updates.push('notes = ?')
    params.push(notes)
  }
  if (rescue_photos !== undefined) {
    updates.push('rescue_photos = ?')
    params.push(JSON.stringify(rescue_photos))
  }

  params.push(req.params.id)
  db.prepare(`UPDATE rescue_tasks SET ${updates.join(', ')} WHERE id = ?`).run(...params)

  if (status === 'completed' && task.report_id) {
    db.prepare(`UPDATE stray_reports SET status = ?, updated_at = ${NOW} WHERE id = ?`).run('rescued', task.report_id)

    const existingAnimal = db.prepare('SELECT id FROM animals WHERE rescue_task_id = ?').get(req.params.id)
    if (!existingAnimal) {
      const report = db.prepare('SELECT * FROM stray_reports WHERE id = ?').get(task.report_id) as any
      const animalType = report?.animal_type || 'cat'
      const nameMap: Record<string, string> = { 'cat': '待命名小猫', 'dog': '待命名小狗', 'rabbit': '待命名小兔', 'bird': '待命名小鸟' }
      const animalName = nameMap[animalType] || '待命名小动物'

      const animalResult = db.prepare(`
        INSERT INTO animals (name, type, status, rescue_task_id, hospital_id, personality, photos)
        VALUES (?, ?, 'hospitalized', ?, ?, '[]', '[]')
      `).run(animalName, animalType, task.id, task.hospital_id || null)

      const today = new Date().toISOString().split('T')[0]
      db.prepare(`
        INSERT INTO medical_records (animal_id, hospital_id, diagnosis, treatment, record_date)
        VALUES (?, ?, '待检查', '初步观察中', ?)
      `).run(animalResult.lastInsertRowid, task.hospital_id || null, today)

      if (task.volunteer_id) {
        notificationService.notifyUser(task.volunteer_id, {
          type: 'rescue_completed',
          title: '救援任务已完成',
          message: `${animalName}已成功入院，已自动创建动物档案和医疗记录`,
          data: { task_id: task.id, animal_id: animalResult.lastInsertRowid }
        })
      }
    }
  }

  const updated = db.prepare('SELECT * FROM rescue_tasks WHERE id = ?').get(req.params.id)
  res.json({ success: true, data: parseJsonFields(updated) })
})

export default router
