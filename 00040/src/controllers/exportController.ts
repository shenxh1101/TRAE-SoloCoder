import { Response } from 'express';
import { AuthRequest } from '../types';
import * as exportService from '../services/exportService';
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '@prisma/client';

export async function exportClassScores(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role === UserRole.STUDENT) {
    throw new AppError('Permission denied', 403);
  }

  const { classId } = req.params;
  const { examId } = req.query;

  const { buffer, filename } = await exportService.exportClassScores(
    classId,
    examId as string | undefined
  );

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
  res.send(buffer);
}

export async function exportExamAnalysis(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role === UserRole.STUDENT) {
    throw new AppError('Permission denied', 403);
  }

  const { courseId } = req.params;

  const { buffer, filename } = await exportService.exportExamAnalysis(courseId);

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
  res.send(buffer);
}
