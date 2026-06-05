import { Response } from 'express';
import { AuthRequest } from '../types';
import * as makeupService from '../services/makeupService';
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '@prisma/client';

export async function requestMakeup(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== UserRole.STUDENT) {
    throw new AppError('Permission denied', 403);
  }

  const { originalExamId, reason } = req.body;

  if (!originalExamId || !reason) {
    throw new AppError('originalExamId and reason are required', 400);
  }

  const result = await makeupService.requestMakeup(
    originalExamId,
    req.user.userId,
    reason
  );

  res.status(201).json(result);
}

export async function approveMakeup(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== UserRole.TEACHER) {
    throw new AppError('Permission denied', 403);
  }

  const { makeupId } = req.params;
  const { startTime, endTime } = req.body;

  if (!startTime || !endTime) {
    throw new AppError('startTime and endTime are required', 400);
  }

  const result = await makeupService.approveMakeup(
    makeupId,
    req.user.userId,
    new Date(startTime),
    new Date(endTime)
  );

  res.json(result);
}

export async function rejectMakeup(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== UserRole.TEACHER) {
    throw new AppError('Permission denied', 403);
  }

  const { makeupId } = req.params;
  const { reason } = req.body;

  if (!reason) {
    throw new AppError('reason is required', 400);
  }

  const result = await makeupService.rejectMakeup(
    makeupId,
    req.user.userId,
    reason
  );

  res.json(result);
}

export async function getMyMakeupRequests(req: AuthRequest, res: Response) {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  let requests;
  if (req.user.role === UserRole.STUDENT) {
    requests = await makeupService.getMakeupRequestsByStudent(req.user.userId);
  } else if (req.user.role === UserRole.TEACHER) {
    requests = await makeupService.getMakeupRequestsByTeacher(req.user.userId);
  } else {
    throw new AppError('Permission denied', 403);
  }

  res.json(requests);
}
