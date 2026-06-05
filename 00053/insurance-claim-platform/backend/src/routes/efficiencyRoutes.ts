import { Router } from 'express';
import {
  getHandlerEfficiency,
  getRejectReasons
} from '../controllers/efficiencyController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/handlers', authenticateToken, getHandlerEfficiency);
router.get('/reject-reasons', authenticateToken, getRejectReasons);

export default router;
