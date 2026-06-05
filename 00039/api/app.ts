import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import multer from 'multer'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import orderRoutes from './routes/orders.js'
import supplierRoutes from './routes/suppliers.js'
import qualityRoutes from './routes/quality.js'
import warehouseRoutes from './routes/warehouse.js'
import contractRoutes from './routes/contracts.js'
import reportRoutes from './routes/reports.js'
import messageRoutes from './routes/messages.js'
import materialRoutes from './routes/materials.js'
import './db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'))
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, uniqueSuffix + '-' + file.originalname)
  },
})

const upload = multer({ storage })

app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.post('/api/upload', upload.single('file'), (req: Request, res: Response): void => {
  if (!req.file) {
    res.status(400).json({ success: false, error: '请选择文件' })
    return
  }
  res.json({
    success: true,
    data: {
      filename: req.file.filename,
      path: `/uploads/${req.file.filename}`,
      size: req.file.size,
      mimetype: req.file.mimetype,
    },
  })
})

app.post('/api/upload/multiple', upload.array('files', 10), (req: Request, res: Response): void => {
  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    res.status(400).json({ success: false, error: '请选择文件' })
    return
  }
  const files = req.files.map((f) => ({
    filename: f.filename,
    path: `/uploads/${f.filename}`,
    size: f.size,
    mimetype: f.mimetype,
  }))
  res.json({ success: true, data: files })
})

app.use('/api/auth', authRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/suppliers', supplierRoutes)
app.use('/api/quality', qualityRoutes)
app.use('/api/warehouse', warehouseRoutes)
app.use('/api/contracts', contractRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/materials', materialRoutes)

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
  console.error('Server error:', error.message)
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
