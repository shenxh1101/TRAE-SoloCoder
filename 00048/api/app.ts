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
import reportRoutes from './routes/reports.js'
import rescueRoutes from './routes/rescue.js'
import animalRoutes from './routes/animals.js'
import adoptRoutes from './routes/adopt.js'
import followupRoutes from './routes/followup.js'
import donateRoutes from './routes/donate.js'
import fundraiseRoutes from './routes/fundraise.js'
import adminRoutes from './routes/admin.js'
import notificationRoutes from './routes/notifications.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/rescue', rescueRoutes)
app.use('/api/animals', animalRoutes)
app.use('/api/adopt', adoptRoutes)
app.use('/api/followup', followupRoutes)
app.use('/api/donate', donateRoutes)
app.use('/api/fundraise', fundraiseRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/notifications', notificationRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', error.message)
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
