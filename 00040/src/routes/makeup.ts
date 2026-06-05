import { Router } from 'express';
import { body, param } from 'express-validator';
import * as makeupController from '../controllers/makeupController';
import { authenticateToken, requireRoles } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

router.post(
  '/',
  authenticateToken,
  requireRoles(UserRole.STUDENT),
  [
    body('originalExamId').notEmpty().withMessage('Original exam ID is required'),
    body('reason').notEmpty().withMessage('Reason is required'),
  ],
  makeupController.requestMakeup
);

router.get(
  '/my',
  authenticateToken,
  makeupController.getMyMakeupRequests
);

router.put(
  '/:makeupId/approve',
  authenticateToken,
  requireRoles(UserRole.TEACHER),
  [
    param('makeupId').notEmpty().withMessage('Makeup ID is required'),
    body('startTime').isISO8601().withMessage('Invalid start time'),
    body('endTime').isISO8601().withMessage('Invalid end time'),
  ],
  makeupController.approveMakeup
);

router.put(
  '/:makeupId/reject',
  authenticateToken,
  requireRoles(UserRole.TEACHER),
  [
    param('makeupId').notEmpty().withMessage('Makeup ID is required'),
    body('reason').notEmpty().withMessage('Reason is required'),
  ],
  makeupController.rejectMakeup
);

export default router;
