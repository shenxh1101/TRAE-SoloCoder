import { Router } from 'express';
import {
  getClaims,
  getClaimById,
  createClaim,
  updateClaim,
  getStatistics,
  getAccidentDistribution,
  getBranchPerformance
} from '../controllers/claimController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, getClaims);
router.get('/statistics', authenticateToken, getStatistics);
router.get('/accident-distribution', authenticateToken, getAccidentDistribution);
router.get('/branch-performance', authenticateToken, getBranchPerformance);
router.get('/:id', authenticateToken, getClaimById);
router.post('/', authenticateToken, createClaim);
router.put('/:id', authenticateToken, updateClaim);

export default router;
