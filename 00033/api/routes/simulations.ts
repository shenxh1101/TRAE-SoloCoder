import { Router, type Request, type Response } from 'express'
import { db, generateId } from '../database.js'

const router = Router()

router.post('/forward', (req: Request, res: Response): void => {
  const { name, velocity_model_id, event_id, parameters } = req.body

  if (!name) {
    res.status(400).json({ success: false, error: 'Simulation name is required' })
    return
  }

  const id = generateId()

  let validVelocityModelId: string | null = null
  if (velocity_model_id) {
    const vm = db.prepare('SELECT id FROM velocity_models WHERE id = ?').get(velocity_model_id) as any
    validVelocityModelId = vm ? velocity_model_id : null
  }

  let validEventId: string | null = null
  if (event_id) {
    const ev = db.prepare('SELECT id FROM seismic_events WHERE id = ?').get(event_id) as any
    validEventId = ev ? event_id : null
  }

  try {
    db.prepare(`
      INSERT INTO simulations (id, name, type, status, velocity_model_id, event_id, parameters, progress)
      VALUES (?, ?, 'forward', 'running', ?, ?, ?, 0)
    `).run(id, name, validVelocityModelId, validEventId, parameters ? JSON.stringify(parameters) : null)

    simulateProgress(id)

    res.status(201).json({
      success: true,
      data: { id, name, status: 'running', progress: 0 },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create simulation' })
  }
})

function simulateProgress(simulationId: string): void {
  let progress = 0
  const interval = setInterval(() => {
    progress += Math.random() * 15 + 5
    if (progress >= 100) {
      progress = 100
      db.prepare(`
        UPDATE simulations SET progress = ?, status = 'completed', completed_at = datetime('now') WHERE id = ?
      `).run(progress, simulationId)
      clearInterval(interval)
    } else {
      db.prepare('UPDATE simulations SET progress = ? WHERE id = ?').run(progress, simulationId)
    }
  }, 2000)
}

router.get('/:id/status', (req: Request, res: Response): void => {
  const { id } = req.params
  const simulation = db.prepare(`
    SELECT s.*, vm.name as velocity_model_name
    FROM simulations s
    LEFT JOIN velocity_models vm ON s.velocity_model_id = vm.id
    WHERE s.id = ?
  `).get(id) as any

  if (!simulation) {
    res.status(404).json({ success: false, error: 'Simulation not found' })
    return
  }

  res.json({
    success: true,
    data: {
      id: simulation.id,
      name: simulation.name,
      type: simulation.type,
      status: simulation.status,
      progress: Math.round(simulation.progress * 100) / 100,
      velocity_model: simulation.velocity_model_name,
      parameters: simulation.parameters ? JSON.parse(simulation.parameters) : null,
      created_at: simulation.created_at,
      completed_at: simulation.completed_at,
    },
  })
})

router.get('/:id/snapshots', (req: Request, res: Response): void => {
  const { id } = req.params
  const simulation = db.prepare('SELECT * FROM simulations WHERE id = ?').get(id) as any

  if (!simulation) {
    res.status(404).json({ success: false, error: 'Simulation not found' })
    return
  }

  const gridSize = 20
  const snapshots = []
  for (let t = 0; t < 5; t++) {
    const timeStep = t * 2.0
    const grid: number[][] = []
    for (let i = 0; i < gridSize; i++) {
      const row: number[] = []
      for (let j = 0; j < gridSize; j++) {
        const cx = gridSize / 2
        const cy = gridSize / 2
        const dx = i - cx
        const dy = j - cy
        const dist = Math.sqrt(dx * dx + dy * dy)
        const amplitude = Math.sin(2 * Math.PI * (dist - timeStep * 3) / 8) * Math.exp(-dist * 0.1) * (1 - t * 0.15)
        row.push(Math.round(amplitude * 10000) / 10000)
      }
      grid.push(row)
    }
    snapshots.push({ time: timeStep, grid })
  }

  res.json({
    success: true,
    data: {
      simulation_id: id,
      grid_size: gridSize,
      snapshots,
    },
  })
})

export default router
