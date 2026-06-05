import { Router } from 'express';
import { upload, uploadAssessment } from '../controllers/uploadController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/assessment', authenticateToken, upload.single('image'), uploadAssessment);

export default router;
