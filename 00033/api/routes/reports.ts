import { Router, type Request, type Response } from 'express'
import { db, generateId } from '../database.js'

const router = Router()

router.post('/generate', (req: Request, res: Response): void => {
  const { title, type, parameters, created_by } = req.body

  if (!title) {
    res.status(400).json({ success: false, error: 'Report title is required' })
    return
  }

  const id = generateId()

  let resolvedCreatedBy: string | null = null
  if (created_by) {
    const user = db.prepare('SELECT id FROM users WHERE id = ? OR username = ?').get(created_by, created_by) as any
    resolvedCreatedBy = user ? user.id : null
  } else {
    const admin = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get() as any
    resolvedCreatedBy = admin ? admin.id : null
  }

  try {
    db.prepare(`
      INSERT INTO reports (id, title, type, parameters, status, created_by)
      VALUES (?, ?, ?, ?, 'generating', ?)
    `).run(id, title, type || 'event', parameters ? JSON.stringify(parameters) : null, resolvedCreatedBy)

    setTimeout(() => {
      db.prepare("UPDATE reports SET status = 'completed', completed_at = datetime('now') WHERE id = ?").run(id)
    }, 3000)

    res.status(201).json({
      success: true,
      data: {
        id,
        title,
        type: type || 'event',
        status: 'generating',
        created_by: created_by || 'admin',
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create report' })
  }
})

router.get('/:id/download', (req: Request, res: Response): void => {
  const { id } = req.params
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(id) as any

  if (!report) {
    res.status(404).json({ success: false, error: 'Report not found' })
    return
  }

  if (report.status !== 'completed') {
    res.status(400).json({ success: false, error: 'Report is not yet completed' })
    return
  }

  res.json({
    success: true,
    data: {
      id: report.id,
      title: report.title,
      type: report.type,
      status: report.status,
      filename: `${report.title.replace(/\s+/g, '_')}.pdf`,
      size: Math.floor(50000 + Math.random() * 200000),
      pages: Math.floor(3 + Math.random() * 15),
      created_at: report.created_at,
      completed_at: report.completed_at,
      download_url: `/api/reports/${id}/file`,
    },
  })
})

export default router
