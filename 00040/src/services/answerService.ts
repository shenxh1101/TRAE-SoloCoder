import { QuestionType, PaperStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { compareAnswers } from '../utils/helpers';
import { notifyGradingAssigned } from './notificationService';

export async function submitAnswer(
  paperId: string,
  questionId: string,
  studentAnswer: string,
  studentId: string
) {
  const paper = await prisma.examPaper.findUnique({
    where: { id: paperId, studentId },
    include: { exam: true, answers: true, questions: true },
  });

  if (!paper) {
    throw new AppError('Exam paper not found', 404);
  }

  if (paper.exam.status !== 'ONGOING') {
    throw new AppError('Exam is not ongoing', 400);
  }

  if (paper.status === 'SUBMITTED' || paper.status === 'LATE_SUBMITTED') {
    throw new AppError('Paper already submitted', 400);
  }

  const questionExists = paper.questions.some((q) => q.questionId === questionId);
  if (!questionExists) {
    throw new AppError('Question not found in this paper', 404);
  }

  const question = await prisma.question.findUnique({
    where: { id: questionId },
  });

  if (!question) {
    throw new AppError('Question not found', 404);
  }

  let autoScore: number | null = null;

  if (question.type !== 'SUBJECTIVE' && question.answer) {
    const isCorrect = compareAnswers(studentAnswer, question.answer, question.type);
    const paperQuestion = paper.questions.find((pq) => pq.questionId === questionId);
    autoScore = isCorrect ? (paperQuestion?.assignedScore || question.score) : 0;
  }

  const answer = await prisma.answer.upsert({
    where: {
      paperId_questionId: { paperId, questionId },
    },
    update: {
      studentAnswer,
      autoScore,
    },
    create: {
      paperId,
      questionId,
      studentAnswer,
      autoScore,
    },
  });

  if (paper.status === 'NOT_STARTED') {
    await prisma.examPaper.update({
      where: { id: paperId },
      data: { status: PaperStatus.IN_PROGRESS, startedAt: new Date() },
    });
  }

  return answer;
}

export async function submitPaper(paperId: string, studentId: string) {
  const paper = await prisma.examPaper.findUnique({
    where: { id: paperId, studentId },
    include: {
      exam: true,
      answers: { include: { question: true } },
      questions: true,
    },
  });

  if (!paper) {
    throw new AppError('Exam paper not found', 404);
  }

  if (paper.status === 'SUBMITTED' || paper.status === 'LATE_SUBMITTED') {
    throw new AppError('Paper already submitted', 400);
  }

  const now = new Date();
  const isLate = now > paper.exam.endTime;

  const updatedPaper = await prisma.$transaction(async (tx) => {
    const result = await tx.examPaper.update({
      where: { id: paperId },
      data: {
        status: isLate ? PaperStatus.LATE_SUBMITTED : PaperStatus.SUBMITTED,
        submittedAt: now,
      },
      include: {
        answers: { include: { question: true } },
        student: { select: { id: true, name: true } },
        exam: { select: { id: true, title: true, creatorId: true } },
      },
    });

    const subjectiveAnswers = result.answers.filter(
      (a) => a.question.type === 'SUBJECTIVE'
    );

    if (subjectiveAnswers.length > 0) {
      const teachers = await tx.user.findMany({
        where: { role: 'TEACHER' },
        select: { id: true },
        orderBy: { id: 'asc' },
      });

      if (teachers.length === 0) {
        throw new AppError('No teachers available for grading', 500);
      }

      for (let i = 0; i < subjectiveAnswers.length; i++) {
        const answer = subjectiveAnswers[i];
        const teacherIndex = i % teachers.length;
        const teacherId = teachers[teacherIndex].id;

        await tx.gradingAssignment.upsert({
          where: {
            teacherId_answerId: { teacherId, answerId: answer.id },
          },
          create: {
            teacherId,
            answerId: answer.id,
          },
          update: {},
        });

        await notifyGradingAssigned(
          teacherId,
          result.student.name,
          result.exam.title,
          answer.id
        );
      }
    }

    return result;
  });

  return updatedPaper;
}

export async function gradeSubjectiveAnswer(
  answerId: string,
  teacherId: string,
  score: number,
  comment?: string
) {
  const assignment = await prisma.gradingAssignment.findUnique({
    where: {
      teacherId_answerId: { teacherId, answerId },
    },
    include: {
      answer: {
        include: {
          question: true,
          paper: { include: { questions: true } },
        },
      },
    },
  });

  if (!assignment) {
    throw new AppError('Grading assignment not found', 404);
  }

  if (assignment.completedAt) {
    throw new AppError('Answer already graded', 400);
  }

  const paperQuestion = assignment.answer.paper.questions.find(
    (pq) => pq.questionId === assignment.answer.questionId
  );
  const maxScore = paperQuestion?.assignedScore || assignment.answer.question.score;

  if (score < 0 || score > maxScore) {
    throw new AppError(`Score must be between 0 and ${maxScore}`, 400);
  }

  const updatedAnswer = await prisma.$transaction(async (tx) => {
    const answer = await tx.answer.update({
      where: { id: answerId },
      data: {
        manualScore: score,
        finalScore: score,
        gradedById: teacherId,
        gradedAt: new Date(),
        comment,
      },
    });

    await tx.gradingAssignment.update({
      where: {
        teacherId_answerId: { teacherId, answerId },
      },
      data: { completedAt: new Date() },
    });

    return answer;
  });

  return updatedAnswer;
}

export async function getPendingGradings(teacherId: string) {
  return prisma.gradingAssignment.findMany({
    where: {
      teacherId,
      completedAt: null,
    },
    include: {
      answer: {
        include: {
          question: true,
          paper: {
            include: {
              student: { select: { id: true, name: true, studentId: true } },
              exam: { select: { id: true, title: true } },
            },
          },
        },
      },
    },
    orderBy: { assignedAt: 'asc' },
  });
}

export async function checkAllGraded(paperId: string): Promise<boolean> {
  const answers = await prisma.answer.findMany({
    where: { paperId },
    include: { question: true },
  });

  const subjectives = answers.filter(
    (a) => a.question?.type === 'SUBJECTIVE'
  );

  if (subjectives.length === 0) {
    return true;
  }

  return subjectives.every((a) => a.finalScore !== null && a.finalScore !== undefined);
}

export async function calculateFinalScore(paperId: string) {
  const paper = await prisma.examPaper.findUnique({
    where: { id: paperId },
    include: { answers: true, exam: true },
  });

  if (!paper) {
    throw new AppError('Exam paper not found', 404);
  }

  let totalScore = 0;

  for (const answer of paper.answers) {
    const finalScore = answer.finalScore ?? answer.autoScore ?? 0;
    totalScore += finalScore;
  }

  const isPassed = totalScore >= paper.exam.passingScore;

  return prisma.examPaper.update({
    where: { id: paperId },
    data: {
      totalScore,
      isPassed,
      status: PaperStatus.GRADED,
    },
  });
}
