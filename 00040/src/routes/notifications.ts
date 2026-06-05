import { Router } from 'express';
import { param } from 'express-validator';
import * as notificationController from '../controllers/notificationController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, notificationController.getNotifications);

router.put(
  '/:notificationId/read',
  authenticateToken,
  [param('notificationId').notEmpty().withMessage('Notification ID is required')],
  notificationController.markAsRead
);

router.put('/read-all', authenticateToken, notificationController.markAllAsRead);

export default router;
