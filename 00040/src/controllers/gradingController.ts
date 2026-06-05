import { Response } from 'express';
import { AuthRequest } from '../types';
import * as answerService from '../services/answerService';
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '@prisma/client';

export async function getPendingGradings(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== UserRole.TEACHER) {
    throw new AppError('Permission denied', 403);
  }

  const gradings = await answerService.getPendingGradings(req.user.userId);
  res.json(gradings);
}

export async function gradeAnswer(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== UserRole.TEACHER) {
    throw new AppError('Permission denied', 403);
  }

  const { answerId } = req.params;
  const { score, comment } = req.body;

  if (typeof score !== 'number' || score < 0) {
    throw new AppError('Invalid score', 400);
  }

  const result = await answerService.gradeSubjectiveAnswer(
    answerId,
    req.user.userId,
    score,
    comment
  );

  res.json(result);
}

export async function calculateFinalScore(req: AuthRequest, res: Response) {
  const { paperId } = req.params;
  const allGraded = await answerService.checkAllGraded(paperId);

  if (!allGraded) {
    throw new AppError('Not all subjective answers have been graded', 400);
  }

  const result = await answerService.calculateFinalScore(paperId);
  res.json(result);
}
