import { Response } from 'express';
import { AuthRequest } from '../types';
import * as examService from '../services/examService';
import * as answerService from '../services/answerService';
import * as statisticsService from '../services/statisticsService';
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '@prisma/client';

export async function createExam(req: AuthRequest, res: Response) {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const exam = await examService.createExam(req.body, req.user.userId);
  res.status(201).json(exam);
}

export async function publishExam(req: AuthRequest, res: Response) {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const { examId } = req.params;
  const exam = await examService.publishExam(examId, req.user.userId);
  res.json(exam);
}

export async function startExam(req: AuthRequest, res: Response) {
  const { examId } = req.params;
  const exam = await examService.startExam(examId);
  res.json(exam);
}

export async function endExam(req: AuthRequest, res: Response) {
  const { examId } = req.params;
  const exam = await examService.endExam(examId);
  res.json(exam);
}

export async function getExam(req: AuthRequest, res: Response) {
  const { examId } = req.params;
  const exam = await examService.getExamById(examId);
  res.json(exam);
}

export async function getMyExams(req: AuthRequest, res: Response) {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  let exams;
  if (req.user.role === UserRole.TEACHER) {
    exams = await examService.getExamsByTeacher(req.user.userId);
  } else if (req.user.role === UserRole.STUDENT) {
    exams = await examService.getExamsByStudent(req.user.userId);
  } else {
    throw new AppError('Invalid role', 400);
  }

  res.json(exams);
}

export async function getExamPaper(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== UserRole.STUDENT) {
    throw new AppError('Permission denied', 403);
  }

  const { examId } = req.params;
  const paper = await examService.getExamWithPaper(examId, req.user.userId);
  res.json(paper);
}

export async function submitAnswer(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== UserRole.STUDENT) {
    throw new AppError('Permission denied', 403);
  }

  const { paperId } = req.params;
  const { questionId, answer } = req.body;

  const result = await answerService.submitAnswer(
    paperId,
    questionId,
    answer,
    req.user.userId
  );

  res.json(result);
}

export async function submitPaper(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== UserRole.STUDENT) {
    throw new AppError('Permission denied', 403);
  }

  const { paperId } = req.params;
  const result = await answerService.submitPaper(paperId, req.user.userId);
  res.json(result);
}

export async function calculateStatistics(req: AuthRequest, res: Response) {
  const { examId } = req.params;
  const result = await statisticsService.calculateExamStatistics(examId);
  res.json(result);
}

export async function getStatistics(req: AuthRequest, res: Response) {
  const { examId } = req.params;
  const result = await statisticsService.getExamStatistics(examId);
  res.json(result);
}

export async function getScoreDistribution(req: AuthRequest, res: Response) {
  const { examId } = req.params;
  const distribution = await statisticsService.getClassScoreDistribution(examId);
  res.json(distribution);
}
