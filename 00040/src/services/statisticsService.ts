import { ExamStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import {
  calculateMean,
  calculateStandardDeviation,
  calculateDifficultyIndex,
  calculateDiscriminationIndex,
} from '../utils/helpers';
import { notifyScorePublished } from './notificationService';
import { detectScoreAnomaly } from './anomalyService';
import { QuestionStats } from '../types';

export async function calculateExamStatistics(examId: string) {
  return prisma.$transaction(async (tx) => {
    const exam = await tx.exam.findUnique({
      where: { id: examId },
      include: {
        papers: {
          where: {
            status: { in: ['SUBMITTED', 'GRADED', 'LATE_SUBMITTED'] },
          },
          include: {
            answers: {
              include: {
                question: true,
              },
            },
            student: { select: { id: true, name: true, classId: true } },
          },
        },
        class: { include: { students: true } },
      },
    });

    if (!exam) {
      throw new AppError('Exam not found', 404);
    }

    if (exam.status !== 'ENDED') {
      throw new AppError('Only ended exams can have statistics calculated', 400);
    }

    const validPapers = exam.papers.filter((p) => p.totalScore !== null);
    if (validPapers.length === 0) {
      throw new AppError('No valid papers found for this exam', 400);
    }

    const scores = validPapers.map((p) => p.totalScore as number);
    const sortedPapers = [...validPapers].sort(
      (a, b) => (b.totalScore as number) - (a.totalScore as number)
    );

    for (let i = 0; i < sortedPapers.length; i++) {
      await tx.examPaper.update({
        where: { id: sortedPapers[i].id },
        data: { rank: i + 1 },
      });
    }

    const allQuestionIds = new Set<string>();
    for (const paper of validPapers) {
      for (const answer of paper.answers) {
        allQuestionIds.add(answer.questionId);
      }
    }

    const questionStatsMap = new Map<string, QuestionStats>();

    for (const questionId of allQuestionIds) {
      const questionAnswers = validPapers
        .flatMap((p) => p.answers)
        .filter((a) => a.questionId === questionId);

      const totalCount = questionAnswers.length;
      const correctCount = questionAnswers.filter((a) => {
        const score = a.finalScore ?? a.autoScore;
        return score !== null && score > 0;
      }).length;

      const correctRate = totalCount > 0 ? correctCount / totalCount : 0;

      const highGroupCount = Math.ceil(sortedPapers.length * 0.27);
      const lowGroupCount = Math.ceil(sortedPapers.length * 0.27);

      const highGroup = sortedPapers.slice(0, highGroupCount);
      const lowGroup = sortedPapers.slice(-lowGroupCount);

      const highGroupCorrect = highGroup.filter((p) => {
        const answer = p.answers.find((a) => a.questionId === questionId);
        if (!answer) return false;
        const score = answer.finalScore ?? answer.autoScore;
        return score !== null && score > 0;
      }).length;

      const lowGroupCorrect = lowGroup.filter((p) => {
        const answer = p.answers.find((a) => a.questionId === questionId);
        if (!answer) return false;
        const score = answer.finalScore ?? answer.autoScore;
        return score !== null && score > 0;
      }).length;

      const highGroupRate = highGroup.length > 0 ? highGroupCorrect / highGroup.length : 0;
      const lowGroupRate = lowGroup.length > 0 ? lowGroupCorrect / lowGroup.length : 0;

      const difficulty = calculateDifficultyIndex(correctRate);
      const discrimination = calculateDiscriminationIndex(highGroupRate, lowGroupRate);

      questionStatsMap.set(questionId, {
        questionId,
        correctCount,
        totalCount,
        correctRate,
        difficulty,
        discrimination,
      });
    }

    const averageScore = calculateMean(scores);
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);
    const passCount = scores.filter((s) => s >= exam.passingScore).length;
    const passRate = scores.length > 0 ? passCount / scores.length : 0;
    const stdDeviation = calculateStandardDeviation(scores);

    const questionStatsArray = Array.from(questionStatsMap.values());
    const avgDifficulty = questionStatsArray.length > 0
      ? calculateMean(questionStatsArray.map((q) => q.difficulty))
      : 0;
    const avgDiscrimination = questionStatsArray.length > 0
      ? calculateMean(questionStatsArray.map((q) => q.discrimination))
      : 0;

    const statistics = await tx.examStatistics.upsert({
      where: { examId },
      create: {
        examId,
        averageScore,
        highestScore,
        lowestScore,
        passRate,
        stdDeviation,
        questionStats: questionStatsArray as any,
        difficultyIndex: avgDifficulty,
        discriminationIndex: avgDiscrimination,
      },
      update: {
        averageScore,
        highestScore,
        lowestScore,
        passRate,
        stdDeviation,
        questionStats: questionStatsArray as any,
        difficultyIndex: avgDifficulty,
        discriminationIndex: avgDiscrimination,
      },
    });

    await tx.exam.update({
      where: { id: examId },
      data: { status: ExamStatus.GRADED },
    });

    const studentIds = validPapers.map((p) => p.studentId);
    await notifyScorePublished(examId, exam.title, studentIds);

    for (const paper of validPapers) {
      if (paper.totalScore !== null) {
        await detectScoreAnomaly(paper.id, paper.studentId, paper.totalScore);
      }
    }

    return {
      statistics,
      rankings: sortedPapers.map((p, i) => ({
        rank: i + 1,
        studentId: p.studentId,
        studentName: p.student.name,
        score: p.totalScore,
        isPassed: p.isPassed,
      })),
      questionStats: questionStatsArray,
    };
  });
}

export async function getExamStatistics(examId: string) {
  const statistics = await prisma.examStatistics.findUnique({
    where: { examId },
    include: {
      exam: {
        select: {
          id: true,
          title: true,
          totalScore: true,
          passingScore: true,
          course: true,
          class: true,
        },
      },
    },
  });

  if (!statistics) {
    throw new AppError('Statistics not found for this exam', 404);
  }

  const rankings = await prisma.examPaper.findMany({
    where: {
      examId,
      totalScore: { not: null },
    },
    select: {
      rank: true,
      totalScore: true,
      isPassed: true,
      student: {
        select: {
          id: true,
          name: true,
          studentId: true,
        },
      },
    },
    orderBy: { rank: 'asc' },
  });

  return {
    statistics,
    rankings,
  };
}

export async function getStudentHistoricalScores(studentId: string, limit: number = 10) {
  return prisma.examPaper.findMany({
    where: {
      studentId,
      totalScore: { not: null },
      exam: { isMakeup: false, status: 'GRADED' },
    },
    select: {
      id: true,
      totalScore: true,
      exam: {
        select: {
          id: true,
          title: true,
          totalScore: true,
          course: { select: { name: true } },
        },
      },
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function getClassScoreDistribution(examId: string) {
  const papers = await prisma.examPaper.findMany({
    where: { examId, totalScore: { not: null } },
    select: { totalScore: true },
  });

  const ranges = [
    { min: 0, max: 59, label: '0-59' },
    { min: 60, max: 69, label: '60-69' },
    { min: 70, max: 79, label: '70-79' },
    { min: 80, max: 89, label: '80-89' },
    { min: 90, max: 100, label: '90-100' },
  ];

  const distribution = ranges.map((range) => ({
    ...range,
    count: papers.filter(
      (p) => p.totalScore! >= range.min && p.totalScore! <= range.max
    ).length,
  }));

  return distribution;
}
