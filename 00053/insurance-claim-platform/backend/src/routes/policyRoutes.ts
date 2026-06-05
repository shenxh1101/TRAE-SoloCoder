import { Router } from 'express';
import {
  getPolicies,
  getPolicyById,
  createPolicy,
  updatePolicy,
  deletePolicy
} from '../controllers/policyController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, getPolicies);
router.get('/:id', authenticateToken, getPolicyById);
router.post('/', authenticateToken, createPolicy);
router.put('/:id', authenticateToken, updatePolicy);
router.delete('/:id', authenticateToken, deletePolicy);

export default router;
