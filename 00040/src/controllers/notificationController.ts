import { Response } from 'express';
import { AuthRequest } from '../types';
import * as notificationService from '../services/notificationService';
import { AppError } from '../middleware/errorHandler';

export async function getNotifications(req: AuthRequest, res: Response) {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const result = await notificationService.getNotifications(
    req.user.userId,
    page,
    limit
  );

  res.json(result);
}

export async function markAsRead(req: AuthRequest, res: Response) {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const { notificationId } = req.params;
  const result = await notificationService.markNotificationAsRead(
    notificationId,
    req.user.userId
  );

  res.json(result);
}

export async function markAllAsRead(req: AuthRequest, res: Response) {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  await notificationService.markAllAsRead(req.user.userId);
  res.json({ message: 'All notifications marked as read' });
}
