/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import dashboardRoutes from './routes/dashboard.js'
import orderRoutes from './routes/orders.js'
import staffRoutes from './routes/staff.js'
import reviewRoutes from './routes/reviews.js'
import adminRoutes from './routes/admin.js'
import uploadRoutes from './routes/upload.js'
import { getDb } from './database.js'
import { startOvertimeChecker } from './services/overtimeChecker.js'

// for esm mode
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// load env
dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

getDb()

startOvertimeChecker()

/**
 * API Routes
 */
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/staff', staffRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/uploads', express.static(path.join(__dirname, '..', 'data', 'uploads')))

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
