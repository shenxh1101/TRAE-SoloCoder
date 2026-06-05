import cron from 'node-cron';
import dayjs from 'dayjs';
import prisma from '../config/prisma';
import { sendMessageToUser } from './websocket';
import { generateAndSaveMonthlyStats } from '../controllers/statsController';
import { isExpiringSoon, getOverdueDays } from '../utils/businessRules';
import { MessageType, ReservationStatus } from '@prisma/client';

export const initCronJobs = () => {
  console.log('Initializing cron jobs...');

  cron.schedule('0 9 * * *', async () => {
    console.log('Running daily reminder check...');
    await sendDueDateReminders();
    await updateOverdueStatus();
    await expireReservations();
  });

  cron.schedule('0 0 1 * *', async () => {
    console.log('Running monthly stats generation...');
    await generateAndSaveMonthlyStats();
  });

  console.log('Cron jobs initialized');
};

const sendDueDateReminders = async () => {
  try {
    const borrowRecords = await prisma.borrowRecord.findMany({
      where: { status: 'BORROWED' },
      include: { book: true, user: true },
    });

    for (const record of borrowRecords) {
      if (isExpiringSoon(record.dueDate, 3)) {
        const daysLeft = dayjs(record.dueDate).diff(dayjs(), 'day') + 1;
        await sendMessageToUser(record.userId, {
          title: '图书到期提醒',
          content: `您借阅的《${record.book.title}》还有${daysLeft}天到期，请及时归还或续借。`,
          type: MessageType.REMINDER,
        });
      }
    }

    console.log('Daily reminders sent');
  } catch (error) {
    console.error('Error sending due date reminders:', error);
  }
};

const updateOverdueStatus = async () => {
  try {
    const overdueRecords = await prisma.borrowRecord.findMany({
      where: {
        status: 'BORROWED',
        dueDate: { lt: new Date() },
      },
      include: { book: true, user: true },
    });

    for (const record of overdueRecords) {
      const overdueDays = getOverdueDays(record.dueDate);
      if (overdueDays === 1) {
        await sendMessageToUser(record.userId, {
          title: '图书逾期提醒',
          content: `您借阅的《${record.book.title}》已逾期，请尽快归还并缴纳罚款。`,
          type: MessageType.REMINDER,
        });
      }
    }

    await prisma.borrowRecord.updateMany({
      where: {
        status: 'BORROWED',
        dueDate: { lt: new Date() },
      },
      data: { status: 'OVERDUE' },
    });

    console.log('Overdue status updated');
  } catch (error) {
    console.error('Error updating overdue status:', error);
  }
};

const expireReservations = async () => {
  try {
    const expiredReservations = await prisma.reservation.findMany({
      where: {
        status: ReservationStatus.NOTIFIED,
        expireDate: { lt: new Date() },
      },
      include: { book: true, user: true },
    });

    for (const reservation of expiredReservations) {
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: { status: ReservationStatus.EXPIRED },
      });

      const nextReservation = await prisma.reservation.findFirst({
        where: {
          bookId: reservation.bookId,
          status: ReservationStatus.PENDING,
        },
        orderBy: { queuePosition: 'asc' },
        include: { user: true },
      });

      if (nextReservation) {
        await prisma.reservation.update({
          where: { id: nextReservation.id },
          data: {
            status: ReservationStatus.NOTIFIED,
            notifyDate: new Date(),
            expireDate: dayjs().add(24, 'hour').toDate(),
          },
        });

        await sendMessageToUser(nextReservation.userId, {
          title: '预约图书到馆通知',
          content: `您预约的《${reservation.book.title}》已到馆，请在24小时内到馆取书。`,
          type: MessageType.RESERVE,
        });
      }

      await sendMessageToUser(reservation.userId, {
        title: '预约已过期',
        content: `您预约的《${reservation.book.title}》已超过取书时间，预约已取消。`,
        type: MessageType.RESERVE,
      });
    }

    console.log('Expired reservations processed');
  } catch (error) {
    console.error('Error expiring reservations:', error);
  }
};
