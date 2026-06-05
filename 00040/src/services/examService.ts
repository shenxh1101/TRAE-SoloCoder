import { QuestionType, ExamStatus, Exam } from '@prisma/client';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { shuffleArray } from '../utils/helpers';
import { CreateExamDto } from '../types';
import { notifyExamPublished, notifyExamStarted, notifyExamEnded } from './notificationService';

export async function createExam(dto: CreateExamDto, creatorId: string) {
  const totalScore = dto.rules.reduce(
    (sum, rule) => sum + rule.count * rule.scorePerQuestion,
    0
  );

  const exam = await prisma.$transaction(async (tx) => {
    const newExam = await tx.exam.create({
      data: {
        title: dto.title,
        courseId: dto.courseId,
        classId: dto.classId,
        creatorId,
        duration: dto.duration,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        passingScore: dto.passingScore,
        totalScore,
        rules: {
          create: dto.rules.map((rule) => ({
            questionType: rule.questionType,
            count: rule.count,
            scorePerQuestion: rule.scorePerQuestion,
          })),
        },
      },
      include: { rules: true, course: true, class: true },
    });

    const course = await tx.course.findUnique({
      where: { id: dto.courseId },
      include: { questionBanks: true },
    });

    if (!course) {
      throw new AppError('Course not found', 404);
    }

    if (course.questionBanks.length === 0) {
      throw new AppError('No question banks found for this course', 400);
    }

    const bankId = course.questionBanks[0].id;

    for (const rule of dto.rules) {
      const questions = await tx.question.findMany({
        where: {
          bankId,
          type: rule.questionType,
        },
      });

      if (questions.length < rule.count) {
        throw new AppError(
          `Not enough ${rule.questionType} questions. Available: ${questions.length}, Required: ${rule.count}`,
          400
        );
      }
    }

    return newExam;
  });

  return exam;
}

export async function generatePaperForStudent(examId: string, studentId: string) {
  return prisma.$transaction(async (tx) => {
    const existingPaper = await tx.examPaper.findUnique({
      where: { examId_studentId: { examId, studentId } },
    });

    if (existingPaper) {
      return existingPaper;
    }

    const exam = await tx.exam.findUnique({
      where: { id: examId },
      include: { rules: true, course: { include: { questionBanks: true } } },
    });

    if (!exam) {
      throw new AppError('Exam not found', 404);
    }

    if (exam.course.questionBanks.length === 0) {
      throw new AppError('No question banks found', 400);
    }

    const bankId = exam.course.questionBanks[0].id;
    const paperQuestionsData: any[] = [];
    let order = 0;

    for (const rule of exam.rules) {
      const questions = await tx.question.findMany({
        where: {
          bankId,
          type: rule.questionType,
        },
      });

      if (questions.length < rule.count) {
        throw new AppError(
          `Not enough ${rule.questionType} questions. Available: ${questions.length}, Required: ${rule.count}`,
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

    const paper = await tx.examPaper.create({
      data: {
        examId,
        studentId,
        questions: {
          create: paperQuestionsData,
        },
        answers: {
          create: paperQuestionsData.map((pq) => ({
            questionId: pq.questionId,
          })),
        },
      },
      include: {
        questions: {
          include: {
            question: {
              select: {
                id: true,
                type: true,
                content: true,
                options: true,
                score: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    return paper;
  });
}

export async function publishExam(examId: string, teacherId: string) {
  const exam = await prisma.exam.findFirst({
    where: { id: examId, creatorId: teacherId },
    include: { rules: true, class: { include: { students: true } } },
  });

  if (!exam) {
    throw new AppError('Exam not found or permission denied', 404);
  }

  if (exam.status !== 'DRAFT') {
    throw new AppError('Only draft exams can be published', 400);
  }

  const publishedExam = await prisma.exam.update({
    where: { id: examId },
    data: { status: ExamStatus.PUBLISHED },
  });

  const studentIds = exam.class.students.map((s) => s.id);
  await notifyExamPublished(examId, exam.title, studentIds);

  return publishedExam;
}

export async function startExam(examId: string) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { class: { include: { students: true } } },
  });

  if (!exam) {
    throw new AppError('Exam not found', 404);
  }

  if (exam.status !== 'PUBLISHED') {
    throw new AppError('Only published exams can be started', 400);
  }

  const startedExam = await prisma.exam.update({
    where: { id: examId },
    data: { status: ExamStatus.ONGOING },
  });

  const studentIds = exam.class.students.map((s) => s.id);
  await notifyExamStarted(examId, exam.title, studentIds);

  return startedExam;
}

export async function endExam(examId: string) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { class: { include: { students: true } } },
  });

  if (!exam) {
    throw new AppError('Exam not found', 404);
  }

  if (exam.status !== 'ONGOING') {
    throw new AppError('Only ongoing exams can be ended', 400);
  }

  const endedExam = await prisma.$transaction(async (tx) => {
    const updatedExam = await tx.exam.update({
      where: { id: examId },
      data: { status: ExamStatus.ENDED },
    });

    await tx.examPaper.updateMany({
      where: {
        examId,
        status: { in: ['NOT_STARTED', 'IN_PROGRESS'] },
      },
      data: { status: 'LATE_SUBMITTED', submittedAt: new Date() },
    });

    return updatedExam;
  });

  const studentIds = exam.class.students.map((s) => s.id);
  await notifyExamEnded(examId, exam.title, studentIds);

  return endedExam;
}

export async function getExamById(examId: string) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      rules: true,
      course: true,
      class: true,
      creator: { select: { id: true, name: true } },
      statistics: true,
    },
  });

  if (!exam) {
    throw new AppError('Exam not found', 404);
  }

  return exam;
}

export async function getExamsByTeacher(teacherId: string) {
  return prisma.exam.findMany({
    where: { creatorId: teacherId },
    include: { course: true, class: true, rules: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getExamsByStudent(studentId: string) {
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { classId: true },
  });

  if (!student || !student.classId) {
    throw new AppError('Student not found or not assigned to a class', 404);
  }

  return prisma.exam.findMany({
    where: {
      classId: student.classId,
      status: { not: 'DRAFT' },
    },
    include: {
      course: true,
      class: true,
      papers: {
        where: { studentId },
        select: { id: true, status: true, totalScore: true, isPassed: true, rank: true },
      },
    },
    orderBy: { startTime: 'desc' },
  });
}

export async function getExamWithPaper(examId: string, studentId: string) {
  await generatePaperForStudent(examId, studentId);

  const paper = await prisma.examPaper.findUnique({
    where: { examId_studentId: { examId, studentId } },
    include: {
      questions: {
        include: {
          question: {
            select: {
              id: true,
              type: true,
              content: true,
              options: true,
              score: true,
            },
          },
        },
        orderBy: { order: 'asc' },
      },
      answers: {
        select: {
          questionId: true,
          studentAnswer: true,
          autoScore: true,
          manualScore: true,
          finalScore: true,
        },
      },
    },
  });

  if (!paper) {
    throw new AppError('Exam paper not found', 404);
  }

  return paper;
}
