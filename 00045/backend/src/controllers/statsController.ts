import { Response } from 'express';
import dayjs from 'dayjs';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { sendMessageToUser } from '../services/websocket';
import { MessageType } from '@prisma/client';

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const [totalBooks, totalUsers, totalBorrows, totalFines, overdueCount] = await Promise.all([
      prisma.book.count(),
      prisma.user.count({ where: { role: { not: 'ADMIN' } } }),
      prisma.borrowRecord.count(),
      prisma.fine.aggregate({ _sum: { amount: true } }),
      prisma.borrowRecord.count({
        where: {
          status: 'BORROWED',
          dueDate: { lt: new Date() },
        },
      }),
    ]);

    const pendingReservations = await prisma.reservation.count({ where: { status: 'PENDING' } });
    const unpaidFines = await prisma.fine.count({ where: { status: 'UNPAID' } });

    res.json({
      totalBooks,
      totalUsers,
      totalBorrows,
      totalFines: Number(totalFines._sum.amount || 0),
      overdueCount,
      pendingReservations,
      unpaidFines,
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
};

export const getPopularBooks = async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 10 } = req.query;
    
    const books = await prisma.book.findMany({
      orderBy: { borrowCount: 'desc' },
      take: Number(limit),
      select: {
        id: true,
        title: true,
        author: true,
        category: true,
        borrowCount: true,
      },
    });

    res.json(books);
  } catch (error) {
    console.error('Get popular books error:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
};

export const getReaderTypeStats = async (req: AuthRequest, res: Response) => {
  try {
    const studentBorrows = await prisma.borrowRecord.count({
      where: { user: { role: 'STUDENT' } },
    });

    const teacherBorrows = await prisma.borrowRecord.count({
      where: { user: { role: 'TEACHER' } },
    });

    res.json([
      { type: '学生', count: studentBorrows },
      { type: '教师', count: teacherBorrows },
    ]);
  } catch (error) {
    console.error('Get reader type stats error:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
};

export const getOverdueRate = async (req: AuthRequest, res: Response) => {
  try {
    const totalBorrows = await prisma.borrowRecord.count();
    const overdueBorrows = await prisma.borrowRecord.count({
      where: {
        OR: [
          { status: 'OVERDUE' },
          { status: 'BORROWED', dueDate: { lt: new Date() } },
        ],
      },
    });

    const rate = totalBorrows > 0 ? overdueBorrows / totalBorrows : 0;

    res.json({ rate, totalBorrows, overdueBorrows });
  } catch (error) {
    console.error('Get overdue rate error:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
};

export const getDailyBorrows = async (req: AuthRequest, res: Response) => {
  try {
    const { days = 7 } = req.query;
    const daysNum = Number(days);
    
    const result = [];
    for (let i = daysNum - 1; i >= 0; i--) {
      const date = dayjs().subtract(i, 'day').startOf('day');
      const nextDate = date.add(1, 'day');
      
      const count = await prisma.borrowRecord.count({
        where: {
          borrowDate: {
            gte: date.toDate(),
            lt: nextDate.toDate(),
          },
        },
      });

      result.push({ date: date.format('YYYY-MM-DD'), count });
    }

    res.json(result);
  } catch (error) {
    console.error('Get daily borrows error:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
};

export const getMonthlyStats = async (req: AuthRequest, res: Response) => {
  try {
    const { month } = req.query;
    const targetMonth = month as string || dayjs().format('YYYY-MM');
    
    const stats = await prisma.monthlyStats.findUnique({
      where: { month: targetMonth },
    });

    if (stats) {
      res.json(stats);
    } else {
      const calculatedStats = await generateMonthlyStats(targetMonth);
      res.json(calculatedStats);
    }
  } catch (error) {
    console.error('Get monthly stats error:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
};

export const generateMonthlyStats = async (monthStr: string) => {
  const startDate = dayjs(monthStr).startOf('month').toDate();
  const endDate = dayjs(monthStr).endOf('month').toDate();

  const [totalBorrows, totalReturns, totalFines, popularBooks, readerStats] = await Promise.all([
    prisma.borrowRecord.count({
      where: { borrowDate: { gte: startDate, lte: endDate } },
    }),
    prisma.borrowRecord.count({
      where: { returnDate: { gte: startDate, lte: endDate } },
    }),
    prisma.fine.aggregate({
      where: { createdAt: { gte: startDate, lte: endDate } },
      _sum: { amount: true },
    }),
    prisma.book.findMany({
      orderBy: { borrowCount: 'desc' },
      take: 10,
      select: { id: true, title: true, borrowCount: true },
    }),
    Promise.all([
      prisma.borrowRecord.count({
        where: { borrowDate: { gte: startDate, lte: endDate }, user: { role: 'STUDENT' } },
      }),
      prisma.borrowRecord.count({
        where: { borrowDate: { gte: startDate, lte: endDate }, user: { role: 'TEACHER' } },
      }),
    ]),
  ]);

  const overdueRate = totalBorrows > 0
    ? await prisma.borrowRecord.count({
        where: {
          borrowDate: { gte: startDate, lte: endDate },
          OR: [
            { status: 'OVERDUE' },
            { status: 'RETURNED', returnDate: { gt: prisma.borrowRecord.fields.dueDate } },
          ],
        },
      }) / totalBorrows
    : 0;

  return {
    month: monthStr,
    totalBorrows,
    totalReturns,
    totalFines: Number(totalFines._sum.amount || 0),
    overdueRate,
    popularBooks,
    readerStats: [
      { type: '学生', count: readerStats[0] },
      { type: '教师', count: readerStats[1] },
    ],
  };
};

export const generateAndSaveMonthlyStats = async () => {
  const lastMonth = dayjs().subtract(1, 'month').format('YYYY-MM');
  
  const stats = await generateMonthlyStats(lastMonth);
  
  await prisma.monthlyStats.upsert({
    where: { month: lastMonth },
    update: stats,
    create: stats,
  });

  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true },
  });

  for (const admin of admins) {
    await sendMessageToUser(admin.id, {
      title: `${lastMonth}月度统计报告`,
      content: `本月借阅${stats.totalBorrows}次，归还${stats.totalReturns}次，罚款¥${stats.totalFines.toFixed(2)}，逾期率${(stats.overdueRate * 100).toFixed(1)}%`,
      type: MessageType.SYSTEM,
    });
  }

  return stats;
};
