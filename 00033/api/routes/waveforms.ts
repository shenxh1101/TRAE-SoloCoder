import { Router, type Request, type Response } from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { db, generateId } from '../database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const uploadDir = path.resolve(__dirname, '..', '..', 'data', 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${generateId()}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.sac', '.mseed', '.segy', '.wav', '.dat']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext) || file.mimetype) {
      cb(null, true)
    } else {
      cb(new Error('Unsupported file format'))
    }
  },
})

const router = Router()

router.post('/upload', upload.single('waveform'), (req: Request, res: Response): void => {
  if (!req.file) {
    res.status(400).json({ success: false, error: 'No file uploaded' })
    return
  }

  const { station_id, sample_rate, duration, channels, format } = req.body
  const id = generateId()

  try {
    db.prepare(`
      INSERT INTO waveforms (id, station_id, filename, filepath, format, sample_rate, duration, channels, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      station_id || null,
      req.file.originalname,
      req.file.path,
      format || 'SAC',
      sample_rate ? parseFloat(sample_rate) : 100.0,
      duration ? parseFloat(duration) : 0,
      channels || 'BHZ',
      'uploaded',
    )

    res.status(201).json({
      success: true,
      data: {
        id,
        filename: req.file.originalname,
        filepath: req.file.path,
        size: req.file.size,
        status: 'uploaded',
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to save waveform record' })
  }
})

router.post('/:id/preprocess', (req: Request, res: Response): void => {
  const { id } = req.params
  const waveform = db.prepare('SELECT * FROM waveforms WHERE id = ?').get(id) as any

  if (!waveform) {
    res.status(404).json({ success: false, error: 'Waveform not found' })
    return
  }

  const snr = 10 + Math.random() * 40
  const duration = 60 + Math.random() * 540

  db.prepare(`
    UPDATE waveforms SET status = ?, snr = ?, duration = ?, processed_at = datetime('now') WHERE id = ?
  `).run('processed', snr, duration, id)

  res.json({
    success: true,
    data: {
      id,
      status: 'processed',
      snr: Math.round(snr * 100) / 100,
      duration: Math.round(duration * 100) / 100,
      sample_rate: waveform.sample_rate,
      channels: waveform.channels,
    },
  })
})

router.get('/:id/data', (req: Request, res: Response): void => {
  const { id } = req.params
  const waveform = db.prepare('SELECT * FROM waveforms WHERE id = ?').get(id) as any

  if (!waveform) {
    res.status(404).json({ success: false, error: 'Waveform not found' })
    return
  }

  const sampleRate = waveform.sample_rate || 100
  const duration = waveform.duration || 60
  const numPoints = Math.min(Math.floor(sampleRate * duration), 10000)
  const frequency = 1 + Math.random() * 4
  const amplitude = 0.5 + Math.random() * 2.0
  const noiseLevel = 0.05 + Math.random() * 0.15

  const samples: number[] = []
  for (let i = 0; i < numPoints; i++) {
    const t = i / sampleRate
    const signal = amplitude * Math.sin(2 * Math.PI * frequency * t) * Math.exp(-0.1 * t)
    const noise = noiseLevel * (2 * Math.random() - 1)
    samples.push(Math.round((signal + noise) * 10000) / 10000)
  }

  const pArrival = Math.round(5 * sampleRate)
  const sArrival = Math.round(12 * sampleRate)

  res.json({
    success: true,
    data: {
      id,
      sample_rate: sampleRate,
      duration,
      num_points: numPoints,
      channels: waveform.channels,
      samples,
      markers: {
        p_arrival: { index: pArrival, time: 5.0 },
        s_arrival: { index: sArrival, time: 12.0 },
      },
    },
  })
})

export default router
