import { AnomalyStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import { config } from '../config';
import { calculateMean, calculateStandardDeviation } from '../utils/helpers';
import { notifyAnomalyDetected } from './notificationService';

export async function detectScoreAnomaly(
  paperId: string,
  studentId: string,
  currentScore: number
) {
  const historicalPapers = await prisma.examPaper.findMany({
    where: {
      studentId,
      id: { not: paperId },
      totalScore: { not: null },
      exam: { isMakeup: false, status: 'GRADED' },
    },
    select: { totalScore: true },
  });

  if (historicalPapers.length < 3) {
    return null;
  }

  const historicalScores = historicalPapers.map((p) => p.totalScore as number);
  const historicalAvg = calculateMean(historicalScores);
  const historicalStd = calculateStandardDeviation(historicalScores);

  if (historicalStd === 0) {
    return null;
  }

  const deviation = Math.abs(currentScore - historicalAvg) / historicalStd;
  const threshold = config.stdDeviationThreshold;

  if (deviation > threshold) {
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { name: true },
    });

    const anomaly = await prisma.scoreAnomaly.upsert({
      where: { paperId },
      create: {
        paperId,
        historicalAvg,
        historicalStd,
        currentScore,
        deviation,
        threshold,
        status: AnomalyStatus.DETECTED,
      },
      update: {
        historicalAvg,
        historicalStd,
        currentScore,
        deviation,
        threshold,
      },
    });

    if (student) {
      await notifyAnomalyDetected(studentId, student.name, paperId);
    }

    return anomaly;
  }

  return null;
}

export async function getAnomalies(status?: AnomalyStatus) {
  const where = status ? { status } : {};

  return prisma.scoreAnomaly.findMany({
    where,
    include: {
      paper: {
        include: {
          student: {
            select: { id: true, name: true, studentId: true, class: true },
          },
          exam: { select: { id: true, title: true, course: true } },
        },
      },
      reviewedBy: { select: { id: true, name: true } },
    },
    orderBy: { detectedAt: 'desc' },
  });
}

export async function reviewAnomaly(
  anomalyId: string,
  reviewerId: string,
  status: 'CONFIRMED' | 'DISMISSED',
  reviewComment?: string
) {
  const anomaly = await prisma.scoreAnomaly.findUnique({
    where: { id: anomalyId },
  });

  if (!anomaly) {
    throw new Error('Anomaly not found');
  }

  if (anomaly.status !== AnomalyStatus.DETECTED && anomaly.status !== AnomalyStatus.REVIEWING) {
    throw new Error('Anomaly already reviewed');
  }

  return prisma.scoreAnomaly.update({
    where: { id: anomalyId },
    data: {
      status,
      reviewedById: reviewerId,
      reviewedAt: new Date(),
      reviewComment,
    },
    include: {
      paper: {
        include: {
          student: { select: { name: true } },
          exam: { select: { title: true } },
        },
      },
    },
  });
}
