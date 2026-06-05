import { Router } from 'express';
import { body, param } from 'express-validator';
import * as examController from '../controllers/examController';
import { authenticateToken, requireRoles } from '../middleware/auth';
import { UserRole, QuestionType } from '@prisma/client';

const router = Router();

router.post(
  '/',
  authenticateToken,
  requireRoles(UserRole.TEACHER),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('courseId').notEmpty().withMessage('Course ID is required'),
    body('classId').notEmpty().withMessage('Class ID is required'),
    body('duration').isInt({ min: 1 }).withMessage('Duration must be a positive integer'),
    body('startTime').isISO8601().withMessage('Invalid start time'),
    body('endTime').isISO8601().withMessage('Invalid end time'),
    body('passingScore').isInt({ min: 0, max: 100 }).withMessage('Passing score must be between 0 and 100'),
    body('rules').isArray().withMessage('Rules must be an array'),
    body('rules.*.questionType').isIn(Object.values(QuestionType)).withMessage('Invalid question type'),
    body('rules.*.count').isInt({ min: 1 }).withMessage('Count must be a positive integer'),
    body('rules.*.scorePerQuestion').isInt({ min: 1 }).withMessage('Score per question must be a positive integer'),
  ],
  examController.createExam
);

router.get('/my', authenticateToken, examController.getMyExams);

router.get(
  '/:examId',
  authenticateToken,
  [param('examId').notEmpty().withMessage('Exam ID is required')],
  examController.getExam
);

router.get(
  '/:examId/paper',
  authenticateToken,
  requireRoles(UserRole.STUDENT),
  [param('examId').notEmpty().withMessage('Exam ID is required')],
  examController.getExamPaper
);

router.put(
  '/:examId/publish',
  authenticateToken,
  requireRoles(UserRole.TEACHER),
  [param('examId').notEmpty().withMessage('Exam ID is required')],
  examController.publishExam
);

router.put(
  '/:examId/start',
  authenticateToken,
  requireRoles(UserRole.TEACHER, UserRole.ADMIN),
  [param('examId').notEmpty().withMessage('Exam ID is required')],
  examController.startExam
);

router.put(
  '/:examId/end',
  authenticateToken,
  requireRoles(UserRole.TEACHER, UserRole.ADMIN),
  [param('examId').notEmpty().withMessage('Exam ID is required')],
  examController.endExam
);

router.post(
  '/:examId/statistics',
  authenticateToken,
  requireRoles(UserRole.TEACHER, UserRole.ADMIN),
  [param('examId').notEmpty().withMessage('Exam ID is required')],
  examController.calculateStatistics
);

router.get(
  '/:examId/statistics',
  authenticateToken,
  [param('examId').notEmpty().withMessage('Exam ID is required')],
  examController.getStatistics
);

router.get(
  '/:examId/distribution',
  authenticateToken,
  [param('examId').notEmpty().withMessage('Exam ID is required')],
  examController.getScoreDistribution
);

router.post(
  '/papers/:paperId/answers',
  authenticateToken,
  requireRoles(UserRole.STUDENT),
  [
    param('paperId').notEmpty().withMessage('Paper ID is required'),
    body('questionId').notEmpty().withMessage('Question ID is required'),
    body('answer').notEmpty().withMessage('Answer is required'),
  ],
  examController.submitAnswer
);

router.put(
  '/papers/:paperId/submit',
  authenticateToken,
  requireRoles(UserRole.STUDENT),
  [param('paperId').notEmpty().withMessage('Paper ID is required')],
  examController.submitPaper
);

export default router;
