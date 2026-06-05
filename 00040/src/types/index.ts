import { UserRole, QuestionType, ExamStatus, PaperStatus } from '@prisma/client';
import { Request } from 'express';

export interface AuthPayload {
  userId: string;
  role: UserRole;
  username: string;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export interface CreateExamDto {
  title: string;
  courseId: string;
  classId: string;
  duration: number;
  startTime: Date;
  endTime: Date;
  passingScore: number;
  rules: {
    questionType: QuestionType;
    count: number;
    scorePerQuestion: number;
  }[];
}

export interface SubmitAnswerDto {
  questionId: string;
  answer: string;
}

export interface ManualGradeDto {
  score: number;
  comment?: string;
}

export interface MakeUpRequestDto {
  originalExamId: string;
  reason: string;
}

export interface QuestionStats {
  questionId: string;
  correctCount: number;
  totalCount: number;
  correctRate: number;
  difficulty: number;
  discrimination: number;
}
