import multer from 'multer'
import path from 'path'
import fs from 'fs'
import config from '../config/index'

const uploadDir = config.upload.destination

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir)
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`
    const ext = path.extname(file.originalname)
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`)
  },
})

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase()
  
  if (config.upload.allowedExtensions.includes(ext)) {
    cb(null, true)
  } else {
    cb(new Error(`File type ${ext} not allowed. Allowed types: ${config.upload.allowedExtensions.join(', ')}`))
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxSize,
  },
})

export default upload
