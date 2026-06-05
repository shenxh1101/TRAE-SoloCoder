import { Router, type Request, type Response } from 'express'
import { db, generateId } from '../database.js'

const router = Router()

router.post('/start', (req: Request, res: Response): void => {
  const { event_id, method, parameters } = req.body

  if (!event_id) {
    res.status(400).json({ success: false, error: 'Event ID is required' })
    return
  }

  const event = db.prepare('SELECT * FROM seismic_events WHERE id = ?').get(event_id) as any
  if (!event) {
    res.status(404).json({ success: false, error: 'Seismic event not found' })
    return
  }

  const id = generateId()
  const convergenceHistory = JSON.stringify([])

  try {
    db.prepare(`
      INSERT INTO inversions (id, event_id, status, method, parameters, convergence_history)
      VALUES (?, ?, 'running', ?, ?, ?)
    `).run(id, event_id, method || 'CMT', parameters ? JSON.stringify(parameters) : null, convergenceHistory)

    simulateInversion(id)

    res.status(201).json({
      success: true,
      data: {
        id,
        event_id,
        status: 'running',
        method: method || 'CMT',
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to start inversion' })
  }
})

function simulateInversion(inversionId: string): void {
  const convergenceData: number[] = []
  let iteration = 0
  const maxIterations = 20

  const interval = setInterval(() => {
    iteration++
    const misfit = 1.0 * Math.exp(-0.15 * iteration) + Math.random() * 0.05
    convergenceData.push(Math.round(misfit * 10000) / 10000)

    db.prepare('UPDATE inversions SET convergence_history = ? WHERE id = ?').run(
      JSON.stringify(convergenceData),
      inversionId,
    )

    if (iteration >= maxIterations) {
      db.prepare(`
        UPDATE inversions SET status = 'completed', completed_at = datetime('now') WHERE id = ?
      `).run(inversionId)

      db.prepare(`
        INSERT INTO inversion_versions (id, inversion_id, version, model_data, source_parameters, misfit, created_by)
        VALUES (?, ?, 1, ?, ?, ?, 'system')
      `).run(
        generateId(),
        inversionId,
        JSON.stringify({ type: 'double_couple', strike: 45 + Math.random() * 90, dip: 30 + Math.random() * 40, rake: -90 + Math.random() * 180 }),
        JSON.stringify({ moment_magnitude: 4.5 + Math.random() * 1.5, depth: 10 + Math.random() * 20, latitude_offset: Math.random() * 0.1, longitude_offset: Math.random() * 0.1 }),
        convergenceData[convergenceData.length - 1],
      )

      clearInterval(interval)
    }
  }, 1500)
}

router.get('/:id/status', (req: Request, res: Response): void => {
  const { id } = req.params
  const inversion = db.prepare(`
    SELECT inv.*, se.event_id as seismic_event_id, se.magnitude, se.location
    FROM inversions inv
    LEFT JOIN seismic_events se ON inv.event_id = se.id
    WHERE inv.id = ?
  `).get(id) as any

  if (!inversion) {
    res.status(404).json({ success: false, error: 'Inversion not found' })
    return
  }

  res.json({
    success: true,
    data: {
      id: inversion.id,
      event_id: inversion.event_id,
      seismic_event_id: inversion.seismic_event_id,
      magnitude: inversion.magnitude,
      location: inversion.location,
      status: inversion.status,
      method: inversion.method,
      parameters: inversion.parameters ? JSON.parse(inversion.parameters) : null,
      convergence_history: inversion.convergence_history ? JSON.parse(inversion.convergence_history) : [],
      created_at: inversion.created_at,
      completed_at: inversion.completed_at,
    },
  })
})

router.post('/:id/manual-correction', (req: Request, res: Response): void => {
  const { id } = req.params
  const { model_data, source_parameters, created_by } = req.body

  const inversion = db.prepare('SELECT * FROM inversions WHERE id = ?').get(id) as any
  if (!inversion) {
    res.status(404).json({ success: false, error: 'Inversion not found' })
    return
  }

  const currentVersions = db.prepare('SELECT COUNT(*) as count FROM inversion_versions WHERE inversion_id = ?').get(id) as { count: number }
  const nextVersion = currentVersions.count + 1
  const versionId = generateId()

  db.prepare(`
    INSERT INTO inversion_versions (id, inversion_id, version, model_data, source_parameters, misfit, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    versionId,
    id,
    nextVersion,
    model_data ? JSON.stringify(model_data) : null,
    source_parameters ? JSON.stringify(source_parameters) : null,
    0.05 + Math.random() * 0.15,
    created_by || 'admin',
  )

  res.status(201).json({
    success: true,
    data: {
      id: versionId,
      inversion_id: id,
      version: nextVersion,
    },
  })
})

router.get('/:id/versions', (req: Request, res: Response): void => {
  const { id } = req.params
  const inversion = db.prepare('SELECT * FROM inversions WHERE id = ?').get(id) as any

  if (!inversion) {
    res.status(404).json({ success: false, error: 'Inversion not found' })
    return
  }

  const versions = db.prepare(`
    SELECT * FROM inversion_versions WHERE inversion_id = ? ORDER BY version ASC
  `).all(id) as any[]

  res.json({
    success: true,
    data: versions.map((v) => ({
      id: v.id,
      inversion_id: v.inversion_id,
      version: v.version,
      model_data: v.model_data ? JSON.parse(v.model_data) : null,
      source_parameters: v.source_parameters ? JSON.parse(v.source_parameters) : null,
      misfit: v.misfit,
      created_by: v.created_by,
      created_at: v.created_at,
    })),
  })
})

export default router
