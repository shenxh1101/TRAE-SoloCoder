import { Router } from 'express';
import { param } from 'express-validator';
import * as exportController from '../controllers/exportController';
import { authenticateToken, requireRoles } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

router.get(
  '/class/:classId/scores',
  authenticateToken,
  requireRoles(UserRole.TEACHER, UserRole.ADMIN),
  [param('classId').notEmpty().withMessage('Class ID is required')],
  exportController.exportClassScores
);

router.get(
  '/course/:courseId/analysis',
  authenticateToken,
  requireRoles(UserRole.TEACHER, UserRole.ADMIN),
  [param('courseId').notEmpty().withMessage('Course ID is required')],
  exportController.exportExamAnalysis
);

export default router;
