import { Router } from 'express';
import {
  getRecords,
  getRecordById,
  createRecord,
  updateRecord
} from '../controllers/assessmentController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, getRecords);
router.get('/:id', authenticateToken, getRecordById);
router.post('/', authenticateToken, createRecord);
router.put('/:id', authenticateToken, updateRecord);

export default router;
