import { MakeupStatus, ExamStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { config } from '../config';
import { shuffleArray } from '../utils/helpers';
import {
  notifyMakeupRequested,
  notifyMakeupApproved,
  notifyMakeupRejected,
} from './notificationService';

export async function requestMakeup(
  originalExamId: string,
  studentId: string,
  reason: string
) {
  const originalExam = await prisma.exam.findUnique({
    where: { id: originalExamId },
    include: {
      papers: {
        where: { studentId },
        select: { id: true, totalScore: true, isPassed: true, status: true },
      },
    },
  });

  if (!originalExam) {
    throw new AppError('Exam not found', 404);
  }

  if (originalExam.status !== 'GRADED') {
    throw new AppError('Exam is not yet graded', 400);
  }

  if (originalExam.isMakeup) {
    throw new AppError('Cannot apply for makeup of a makeup exam', 400);
  }

  const studentPaper = originalExam.papers[0];
  if (!studentPaper) {
    throw new AppError('No exam record found for this student', 404);
  }

  if (studentPaper.isPassed) {
    throw new AppError('You have passed this exam, cannot apply for makeup', 400);
  }

  const existingMakeups = await prisma.makeUpExam.findMany({
    where: {
      originalExamId,
      studentId,
      status: { in: ['PENDING', 'APPROVED', 'COMPLETED'] },
    },
  });

  if (existingMakeups.length > 0) {
    const pendingOrApproved = existingMakeups.find(
      (m) => m.status === 'PENDING' || m.status === 'APPROVED'
    );
    if (pendingOrApproved) {
      throw new AppError('You already have a pending or approved makeup request', 400);
    }
  }

  const pastMakeupCount = await prisma.makeUpExam.count({
    where: {
      originalExamId,
      studentId,
      status: 'COMPLETED',
    },
  });

  if (pastMakeupCount >= config.maxMakeupAttempts) {
    throw new AppError(
      `Maximum makeup attempts (${config.maxMakeupAttempts}) reached`,
      400
    );
  }

  const makeupRequest = await prisma.makeUpExam.create({
    data: {
      originalExamId,
      studentId,
      reason,
      attemptCount: pastMakeupCount + 1,
    },
    include: {
      originalExam: { include: { course: true, creator: { select: { id: true } } } },
      student: { select: { name: true } },
    },
  });

  await notifyMakeupRequested(
    makeupRequest.originalExam.creatorId,
    makeupRequest.student.name,
    makeupRequest.originalExam.title,
    makeupRequest.id
  );

  return makeupRequest;
}

export async function approveMakeup(
  makeupId: string,
  teacherId: string,
  startTime: Date,
  endTime: Date
) {
  const makeup = await prisma.makeUpExam.findUnique({
    where: { id: makeupId },
    include: {
      originalExam: {
        include: {
          rules: true,
          course: { include: { questionBanks: true } },
          class: true,
          creator: { select: { id: true } },
        },
      },
      student: { select: { id: true, name: true } },
    },
  });

  if (!makeup) {
    throw new AppError('Makeup request not found', 404);
  }

  if (makeup.status !== 'PENDING') {
    throw new AppError('Makeup request is not pending', 400);
  }

  if (makeup.originalExam.creatorId !== teacherId) {
    throw new AppError('Permission denied', 403);
  }

  const makeupExam = await prisma.$transaction(async (tx) => {
    const newExam = await tx.exam.create({
      data: {
        title: `${makeup.originalExam.title} (补考${makeup.attemptCount})`,
        courseId: makeup.originalExam.courseId,
        classId: makeup.originalExam.classId,
        creatorId: teacherId,
        duration: makeup.originalExam.duration,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        passingScore: makeup.originalExam.passingScore,
        totalScore: makeup.originalExam.totalScore,
        isMakeup: true,
        originalExamId: makeup.originalExamId,
        rules: {
          create: makeup.originalExam.rules.map((rule) => ({
            questionType: rule.questionType,
            count: rule.count,
            scorePerQuestion: rule.scorePerQuestion,
          })),
        },
      },
      include: { rules: true },
    });

    const bankId = makeup.originalExam.course.questionBanks[0]?.id;
    if (!bankId) {
      throw new AppError('No question banks found', 400);
    }

    const examPaper = await tx.examPaper.create({
      data: {
        examId: newExam.id,
        studentId: makeup.studentId,
      },
    });

    const paperQuestionsData: any[] = [];
    let order = 0;

    for (const rule of newExam.rules) {
      const questions = await tx.question.findMany({
        where: {
          bankId,
          type: rule.questionType,
        },
      });

      if (questions.length < rule.count) {
        throw new AppError(
          `Not enough ${rule.questionType} questions for makeup exam`,
          400
        );
      }

      const selectedQuestions = shuffleArray(questions).slice(0, rule.count);

      for (const question of selectedQuestions) {
        paperQuestionsData.push({
          questionId: question.id,
          order: order++,
          assignedScore: rule.scorePerQuestion,
        });
      }
    }

    await tx.paperQuestion.createMany({
      data: paperQuestionsData.map((pq) => ({
        ...pq,
        paperId: examPaper.id,
      })),
    });

    await tx.answer.createMany({
      data: paperQuestionsData.map((pq) => ({
        questionId: pq.questionId,
        paperId: examPaper.id,
      })),
    });

    await tx.makeUpExam.update({
      where: { id: makeupId },
      data: {
        status: MakeupStatus.APPROVED,
        approvedById: teacherId,
        approvedAt: new Date(),
        makeupExamId: newExam.id,
      },
    });

    return newExam;
  });

  await notifyMakeupApproved(
    makeup.studentId,
    makeup.originalExam.title,
    makeupId
  );

  return { makeup, makeupExam };
}

export async function rejectMakeup(
  makeupId: string,
  teacherId: string,
  reason: string
) {
  const makeup = await prisma.makeUpExam.findUnique({
    where: { id: makeupId },
    include: {
      originalExam: {
        include: { creator: { select: { id: true } } },
      },
      student: { select: { id: true, name: true } },
    },
  });

  if (!makeup) {
    throw new AppError('Makeup request not found', 404);
  }

  if (makeup.status !== 'PENDING') {
    throw new AppError('Makeup request is not pending', 400);
  }

  if (makeup.originalExam.creatorId !== teacherId) {
    throw new AppError('Permission denied', 403);
  }

  const rejectedMakeup = await prisma.makeUpExam.update({
    where: { id: makeupId },
    data: {
      status: MakeupStatus.REJECTED,
      approvedById: teacherId,
      approvedAt: new Date(),
    },
  });

  await notifyMakeupRejected(
    makeup.studentId,
    makeup.originalExam.title,
    makeupId
  );

  return rejectedMakeup;
}

export async function getMakeupRequestsByStudent(studentId: string) {
  return prisma.makeUpExam.findMany({
    where: { studentId },
    include: {
      originalExam: { include: { course: true } },
      makeupExam: { include: { course: true } },
      approvedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getMakeupRequestsByTeacher(teacherId: string) {
  return prisma.makeUpExam.findMany({
    where: {
      originalExam: { creatorId: teacherId },
    },
    include: {
      originalExam: { include: { course: true, class: true } },
      student: { select: { id: true, name: true, studentId: true } },
      makeupExam: true,
      approvedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}
