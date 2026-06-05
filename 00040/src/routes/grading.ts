import { Router } from 'express';
import { body, param } from 'express-validator';
import * as gradingController from '../controllers/gradingController';
import { authenticateToken, requireRoles } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

router.get(
  '/pending',
  authenticateToken,
  requireRoles(UserRole.TEACHER),
  gradingController.getPendingGradings
);

router.put(
  '/answers/:answerId/grade',
  authenticateToken,
  requireRoles(UserRole.TEACHER),
  [
    param('answerId').notEmpty().withMessage('Answer ID is required'),
    body('score').isFloat({ min: 0 }).withMessage('Score must be a non-negative number'),
    body('comment').optional().isString(),
  ],
  gradingController.gradeAnswer
);

router.put(
  '/papers/:paperId/finalize',
  authenticateToken,
  requireRoles(UserRole.TEACHER, UserRole.ADMIN),
  [param('paperId').notEmpty().withMessage('Paper ID is required')],
  gradingController.calculateFinalScore
);

export default router;
