import { NotificationType, UserRole } from '@prisma/client';
import prisma from '../lib/prisma';
import { sendToUser, sendToRole } from '../lib/websocket';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  relatedId?: string;
}

export async function createNotification({
  userId,
  type,
  title,
  content,
  relatedId,
}: CreateNotificationParams) {
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      content,
      relatedId,
    },
  });

  sendToUser(userId, 'notification', {
    id: notification.id,
    type,
    title,
    content,
    relatedId,
    createdAt: notification.createdAt,
  });

  return notification;
}

export async function notifyExamPublished(examId: string, title: string, studentIds: string[]) {
  const notifications = studentIds.map((studentId) =>
    createNotification({
      userId: studentId,
      type: NotificationType.EXAM_PUBLISHED,
      title: '新考试发布',
      content: `考试"${title}"已发布，请准时参加！`,
      relatedId: examId,
    })
  );
  return Promise.all(notifications);
}

export async function notifyExamStarted(examId: string, title: string, studentIds: string[]) {
  const notifications = studentIds.map((studentId) =>
    createNotification({
      userId: studentId,
      type: NotificationType.EXAM_STARTED,
      title: '考试开始',
      content: `考试"${title}"已开始，请进入考试页面答题！`,
      relatedId: examId,
    })
  );
  return Promise.all(notifications);
}

export async function notifyExamEnded(examId: string, title: string, studentIds: string[]) {
  const notifications = studentIds.map((studentId) =>
    createNotification({
      userId: studentId,
      type: NotificationType.EXAM_ENDED,
      title: '考试结束',
      content: `考试"${title}"已结束，请等待成绩发布。`,
      relatedId: examId,
    })
  );
  return Promise.all(notifications);
}

export async function notifyScorePublished(
  examId: string, title: string, studentIds: string[]
) {
  const notifications = studentIds.map((studentId) =>
    createNotification({
      userId: studentId,
      type: NotificationType.SCORE_PUBLISHED,
      title: '成绩发布',
      content: `考试"${title}"成绩已发布，请查看您的成绩。`,
      relatedId: examId,
    })
  );
  return Promise.all(notifications);
}

export async function notifyAnomalyDetected(
  studentId: string,
  studentName: string,
  paperId: string
) {
  await createNotification({
    userId: studentId,
    type: NotificationType.ANOMALY_DETECTED,
    title: '成绩异常',
    content: `您的考试成绩存在异常，已标记待复查。`,
    relatedId: paperId,
  });

  const admins = await prisma.user.findMany({
    where: { role: UserRole.ADMIN },
    select: { id: true },
  });

  const adminNotifications = admins.map((admin) =>
    createNotification({
      userId: admin.id,
      type: NotificationType.ANOMALY_DETECTED,
      title: '成绩异常检测',
      content: `学生${studentName}的考试成绩存在异常，请及时复查。`,
      relatedId: paperId,
    })
  );

  return Promise.all(adminNotifications);
}

export async function notifyGradingAssigned(
  teacherId: string,
  studentName: string,
  examTitle: string,
  answerId: string
) {
  return createNotification({
    userId: teacherId,
    type: NotificationType.GRADING_ASSIGNED,
    title: '主观题评阅分配',
    content: `您被分配评阅${studentName}在考试"${examTitle}"中的主观题。`,
    relatedId: answerId,
  });
}

export async function notifyMakeupRequested(
  teacherId: string,
  studentName: string,
  examTitle: string,
  makeupId: string
) {
  return createNotification({
    userId: teacherId,
    type: NotificationType.MAKEUP_REQUESTED,
    title: '补考申请',
    content: `学生${studentName}申请参加"${examTitle}"的补考，请审批。`,
    relatedId: makeupId,
  });
}

export async function notifyMakeupApproved(
  studentId: string, examTitle: string, makeupId: string
) {
  return createNotification({
    userId: studentId,
    type: NotificationType.MAKEUP_APPROVED,
    title: '补考申请已通过',
    content: `您参加"${examTitle}"的补考申请已通过，请按时参加补考。`,
    relatedId: makeupId,
  });
}

export async function notifyMakeupRejected(
  studentId: string, examTitle: string, makeupId: string
) {
  return createNotification({
    userId: studentId,
    type: NotificationType.MAKEUP_REJECTED,
    title: '补考申请未通过',
    content: `您参加"${examTitle}"的补考申请未通过，请联系教务。`,
    relatedId: makeupId,
  });
}

export async function getNotifications(userId: string, page: number = 1, limit: number = 20) {
  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notification.count({ where: { userId } }),
  ]);

  const unreadCount = await prisma.notification.count({
    where: { userId, isRead: false },
  });

  return { notifications, total, unreadCount };
}

export async function markNotificationAsRead(notificationId: string, userId: string) {
  return prisma.notification.update({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });
}

export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}
