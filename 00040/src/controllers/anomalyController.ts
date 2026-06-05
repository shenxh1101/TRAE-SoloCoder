import { Response } from 'express';
import { AuthRequest } from '../types';
import * as anomalyService from '../services/anomalyService';
import * as statisticsService from '../services/statisticsService';
import { AppError } from '../middleware/errorHandler';
import { AnomalyStatus, UserRole } from '@prisma/client';

export async function getAnomalies(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== UserRole.ADMIN) {
    throw new AppError('Permission denied', 403);
  }

  const { status } = req.query;
  const statusEnum = status ? (status as AnomalyStatus) : undefined;

  const anomalies = await anomalyService.getAnomalies(statusEnum);
  res.json(anomalies);
}

export async function reviewAnomaly(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== UserRole.ADMIN) {
    throw new AppError('Permission denied', 403);
  }

  const { anomalyId } = req.params;
  const { status, comment } = req.body;

  if (![AnomalyStatus.CONFIRMED, AnomalyStatus.DISMISSED].includes(status)) {
    throw new AppError('Invalid status', 400);
  }

  const result = await anomalyService.reviewAnomaly(
    anomalyId,
    req.user.userId,
    status,
    comment
  );

  res.json(result);
}

export async function getMyHistoricalScores(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== UserRole.STUDENT) {
    throw new AppError('Permission denied', 403);
  }

  const scores = await statisticsService.getStudentHistoricalScores(req.user.userId);
  res.json(scores);
}
