import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import patientRoutes from './routes/patients.js'
import resourceRoutes from './routes/resources.js'
import examinationRoutes from './routes/examinations.js'
import observationRoutes from './routes/observations.js'
import statisticsRoutes from './routes/statistics.js'
import alertRoutes from './routes/alerts.js'
import { checkTimeoutPatients, checkObservationBilling } from './background-jobs.js'
import db from './database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/patients', patientRoutes)
app.use('/api/resources', resourceRoutes)
app.use('/api/examinations', examinationRoutes)
app.use('/api/observations', observationRoutes)
app.use('/api/statistics', statisticsRoutes)
app.use('/api/alerts', alertRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

app.post('/api/jobs/trigger', (req: Request, res: Response): void => {
  const { job } = req.body
  if (job === 'timeout') {
    checkTimeoutPatients()
    res.json({ success: true, message: '超时检查已触发' })
  } else if (job === 'billing') {
    checkObservationBilling()
    res.json({ success: true, message: '留观计费检查已触发' })
  } else if (job === 'all') {
    checkTimeoutPatients()
    checkObservationBilling()
    res.json({ success: true, message: '所有后台任务已触发' })
  } else {
    res.status(400).json({ success: false, error: '无效的任务类型' })
  }
})

app.post('/api/test/simulate-observation-overtime', (req: Request, res: Response): void => {
  try {
    const { observation_id, hours_ago } = req.body
    if (!observation_id || !hours_ago) {
      res.status(400).json({ success: false, error: 'observation_id和hours_ago为必填项' })
      return
    }
    const newStartAt = new Date(Date.now() - hours_ago * 60 * 60 * 1000).toISOString()
    db.prepare('UPDATE observations SET started_at = ? WHERE id = ?').run(newStartAt, observation_id)
    res.json({ success: true, message: `留观记录已修改为${hours_ago}小时前开始`, data: { observation_id, newStartAt } })
  } catch (error) {
    res.status(500).json({ success: false, error: '模拟留观超时失败' })
  }
})

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
