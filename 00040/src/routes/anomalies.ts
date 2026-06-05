import { Router } from 'express';
import { body, param } from 'express-validator';
import * as anomalyController from '../controllers/anomalyController';
import { authenticateToken, requireRoles } from '../middleware/auth';
import { UserRole, AnomalyStatus } from '@prisma/client';

const router = Router();

router.get(
  '/',
  authenticateToken,
  requireRoles(UserRole.ADMIN),
  anomalyController.getAnomalies
);

router.put(
  '/:anomalyId/review',
  authenticateToken,
  requireRoles(UserRole.ADMIN),
  [
    param('anomalyId').notEmpty().withMessage('Anomaly ID is required'),
    body('status').isIn([AnomalyStatus.CONFIRMED, AnomalyStatus.DISMISSED]).withMessage('Invalid status'),
    body('comment').optional().isString(),
  ],
  anomalyController.reviewAnomaly
);

router.get(
  '/my-scores',
  authenticateToken,
  requireRoles(UserRole.STUDENT),
  anomalyController.getMyHistoricalScores
);

export default router;
