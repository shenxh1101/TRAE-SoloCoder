import { Router } from 'express';
import {
  getWarnings,
  getWarningById,
  acknowledgeWarning,
  resolveWarning,
  detectAnomalies,
  pushNotification
} from '../controllers/warningController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, getWarnings);
router.get('/:id', authenticateToken, getWarningById);
router.put('/:id/acknowledge', authenticateToken, acknowledgeWarning);
router.put('/:id/resolve', authenticateToken, resolveWarning);
router.post('/detect', authenticateToken, detectAnomalies);
router.post('/:id/push', authenticateToken, pushNotification);

export default router;
