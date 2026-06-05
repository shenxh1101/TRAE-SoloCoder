import { Router, type Request, type Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'data', 'uploads')

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg'
    const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`
    cb(null, name)
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('仅支持 JPG、PNG、GIF、WebP 格式的图片'))
    }
  },
})

const router = Router()

router.post('/photos', upload.array('photos', 4), (req: Request, res: Response): void => {
  try {
    const files = req.files as Express.Multer.File[]
    if (!files || files.length === 0) {
      res.status(400).json({ success: false, error: '请选择要上传的图片' })
      return
    }

    const urls = files.map((f) => `/api/uploads/${f.filename}`)
    res.status(201).json({ success: true, data: { urls } })
  } catch (error) {
    res.status(500).json({ success: false, error: '上传失败' })
  }
})

router.post('/photo', upload.single('photo'), (req: Request, res: Response): void => {
  try {
    const file = req.file
    if (!file) {
      res.status(400).json({ success: false, error: '请选择要上传的图片' })
      return
    }

    const url = `/api/uploads/${file.filename}`
    res.status(201).json({ success: true, data: { url } })
  } catch (error) {
    res.status(500).json({ success: false, error: '上传失败' })
  }
})

export default router
