import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import config from './config/index'
import { limiter } from './middleware/rateLimiter'
import errorHandler from './middleware/errorHandler'

import authRoutes from './routes/auth'
import taskRoutes from './routes/taskRoutes'
import uploadRoutes from './routes/uploadRoutes'
import monitoringRoutes from './routes/monitoringRoutes'
import alertRoutes from './routes/alertRoutes'
import reportRoutes from './routes/reportRoutes'
import recommendationRoutes from './routes/recommendationRoutes'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}))

app.use(cors(config.cors))

app.use(morgan('dev'))

app.use(express.json({ limit: config.security.maxRequestBodySize as string }))
app.use(express.urlencoded({ extended: true, limit: config.security.maxRequestBodySize as string }))

app.use('/api/', limiter)

app.use(
  '/api/health',
  (req: Request, res: Response): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
      timestamp: new Date().toISOString(),
    })
  },
)

app.use('/api/auth', authRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/monitoring', monitoringRoutes)
app.use('/api/alerts', alertRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/recommendations', recommendationRoutes)

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  errorHandler(error, req, res, next)
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `API endpoint not found: ${req.method} ${req.path}`,
  })
})

export default app
