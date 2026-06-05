import { Router, type Request, type Response } from 'express'
import { authenticate } from '../middleware/auth'
import upload from '../middleware/upload'
import uploadService from '../services/uploadService'
import { successResponse, errorResponse } from '../utils/response'

const router = Router()

router.use(authenticate)

router.post('/', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'No file uploaded', 400)
    }

    const result = await uploadService.handleUpload(req.file)
    successResponse(res, result, 'File uploaded successfully', 201)
  } catch (error) {
    errorResponse(res, 'Failed to upload file', 500)
  }
})

router.post('/multiple', upload.array('files', 10), async (req: Request, res: Response) => {
  try {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      return errorResponse(res, 'No files uploaded', 400)
    }

    const results = await Promise.all(
      (req.files as Express.Multer.File[]).map(file => uploadService.handleUpload(file))
    )
    
    successResponse(res, results, 'Files uploaded successfully', 201)
  } catch (error) {
    errorResponse(res, 'Failed to upload files', 500)
  }
})

router.get('/metadata/:fileId', async (req: Request, res: Response) => {
  try {
    const metadata = await uploadService.getFileMetadata(req.params.fileId)
    if (!metadata) {
      return errorResponse(res, 'File not found', 404)
    }
    successResponse(res, metadata)
  } catch (error) {
    errorResponse(res, 'Failed to get file metadata', 500)
  }
})

router.delete('/:fileId', async (req: Request, res: Response) => {
  try {
    const deleted = await uploadService.deleteFile(req.params.fileId)
    if (!deleted) {
      return errorResponse(res, 'File not found', 404)
    }
    successResponse(res, null, 'File deleted successfully')
  } catch (error) {
    errorResponse(res, 'Failed to delete file', 500)
  }
})

export default router
