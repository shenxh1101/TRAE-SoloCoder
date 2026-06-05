import { Response } from 'express';
import dayjs from 'dayjs';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { calculateDueDate, getOverdueDays, calculateDamageFee, calculateOverdueFine, checkBorrowEligibility } from '../utils/businessRules';
import { sendMessageToUser } from '../services/websocket';
import { BorrowStatus, FineType, MessageType } from '@prisma/client';

export const getBorrowRecords = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, pageSize = 10, status, userId, bookId } = req.query;
    
    const where: any = {};
    if (status) where.status = status;
    if (userId) where.userId = userId as string;
    if (bookId) where.bookId = bookId as string;

    const [records, total] = await Promise.all([
      prisma.borrowRecord.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, username: true } },
          book: { select: { id: true, title: true, isbn: true } },
        },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { borrowDate: 'desc' },
      }),
      prisma.borrowRecord.count({ where }),
    ]);

    res.json({
      data: records,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  } catch (error) {
    console.error('Get borrow records error:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
};

export const getUserBorrowRecords = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { page = 1, pageSize = 10, status } = req.query;
    
    const where: any = { userId };
    if (status) where.status = status;

    const [records, total] = await Promise.all([
      prisma.borrowRecord.findMany({
        where,
        include: {
          book: true,
          fines: true,
        },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { borrowDate: 'desc' },
      }),
      prisma.borrowRecord.count({ where }),
    ]);

    res.json({
      data: records,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  } catch (error) {
    console.error('Get user borrow records error:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
};

export const checkEligibility = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.userId;
    
    const overdueRecords = await prisma.borrowRecord.findMany({
      where: {
        userId,
        status: 'BORROWED',
        dueDate: { lt: new Date() },
      },
      select: { dueDate: true },
    });

    const overdueCount = overdueRecords.length;
    const maxOverdueDays = overdueRecords.length > 0
      ? Math.max(...overdueRecords.map(r => getOverdueDays(r.dueDate)))
      : 0;

    const eligibility = checkBorrowEligibility(overdueCount, maxOverdueDays);
    res.json(eligibility);
  } catch (error) {
    console.error('Check eligibility error:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
};

export const borrowBook = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, bookId } = req.body;

    const [user, book] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.book.findUnique({ where: { id: bookId } }),
    ]);

    if (!user || !book) {
      return res.status(404).json({ message: '用户或图书不存在' });
    }

    if (book.availableCopies <= 0) {
      return res.status(400).json({ message: '该图书已无库存' });
    }

    const overdueRecords = await prisma.borrowRecord.findMany({
      where: {
        userId,
        status: 'BORROWED',
        dueDate: { lt: new Date() },
      },
      select: { dueDate: true },
    });

    const overdueCount = overdueRecords.length;
    const maxOverdueDays = overdueRecords.length > 0
      ? Math.max(...overdueRecords.map(r => getOverdueDays(r.dueDate)))
      : 0;

    const eligibility = checkBorrowEligibility(overdueCount, maxOverdueDays);
    if (!eligibility.eligible) {
      return res.status(400).json({ message: eligibility.reason });
    }

    const dueDate = calculateDueDate(user.role);

    const [borrowRecord] = await Promise.all([
      prisma.borrowRecord.create({
        data: {
          userId,
          bookId,
          dueDate,
        },
        include: { book: true, user: true },
      }),
      prisma.book.update({
        where: { id: bookId },
        data: {
          availableCopies: { decrement: 1 },
          borrowCount: { increment: 1 },
        },
      }),
    ]);

    await sendMessageToUser(userId, {
      title: '借阅成功',
      content: `您已成功借阅《${book.title}》，应还日期为${dayjs(dueDate).format('YYYY-MM-DD')}`,
      type: MessageType.BORROW,
    });

    res.status(201).json(borrowRecord);
  } catch (error) {
    console.error('Borrow book error:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
};

export const returnBook = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { damageLevel = 'none' } = req.body;

    const borrowRecord = await prisma.borrowRecord.findUnique({
      where: { id },
      include: { book: true, user: true },
    });

    if (!borrowRecord) {
      return res.status(404).json({ message: '借阅记录不存在' });
    }

    if (borrowRecord.status === BorrowStatus.RETURNED) {
      return res.status(400).json({ message: '该图书已归还' });
    }

    const overdueDays = getOverdueDays(borrowRecord.dueDate);
    const overdueFine = calculateOverdueFine(overdueDays);
    const damageFine = calculateDamageFee(Number(borrowRecord.book.price), damageLevel);
    const totalFine = overdueFine + damageFine;

    const fines = [];

    if (overdueFine > 0) {
      fines.push({
        userId: borrowRecord.userId,
        borrowRecordId: borrowRecord.id,
        amount: overdueFine,
        type: FineType.OVERDUE,
        description: `逾期${overdueDays}天，每天0.5元`,
      });
    }

    if (damageFine > 0) {
      fines.push({
        userId: borrowRecord.userId,
        borrowRecordId: borrowRecord.id,
        amount: damageFine,
        type: FineType.DAMAGE,
        description: `图书损坏（${damageLevel}），按原价${damageLevel === 'minor' ? '30%' : damageLevel === 'moderate' ? '60%' : '100%'}赔偿`,
      });
    }

    const [updatedRecord] = await Promise.all([
      prisma.borrowRecord.update({
        where: { id },
        data: {
          status: BorrowStatus.RETURNED,
          returnDate: new Date(),
          damageLevel,
        },
        include: { book: true, user: true },
      }),
      prisma.book.update({
        where: { id: borrowRecord.bookId },
        data: {
          availableCopies: { increment: 1 },
        },
      }),
      ...fines.map(fine => prisma.fine.create({ data: fine })),
    ]);

    if (fines.length > 0) {
      await sendMessageToUser(borrowRecord.userId, {
        title: '还书成功，产生罚款',
        content: `您已归还《${borrowRecord.book.title}》，产生罚款¥${totalFine.toFixed(2)}，请及时缴纳。`,
        type: MessageType.FINE,
      });
    } else {
      await sendMessageToUser(borrowRecord.userId, {
        title: '还书成功',
        content: `您已成功归还《${borrowRecord.book.title}》`,
        type: MessageType.BORROW,
      });
    }

    const pendingReservation = await prisma.reservation.findFirst({
      where: {
        bookId: borrowRecord.bookId,
        status: 'PENDING',
      },
      orderBy: { queuePosition: 'asc' },
      include: { user: true },
    });

    if (pendingReservation) {
      await prisma.reservation.update({
        where: { id: pendingReservation.id },
        data: {
          status: 'NOTIFIED',
          notifyDate: new Date(),
          expireDate: dayjs().add(24, 'hour').toDate(),
        },
      });

      await sendMessageToUser(pendingReservation.userId, {
        title: '预约图书到馆通知',
        content: `您预约的《${borrowRecord.book.title}》已到馆，请在24小时内到馆取书。`,
        type: MessageType.RESERVE,
      });
    }

    res.json(updatedRecord);
  } catch (error) {
    console.error('Return book error:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
};

export const renewBook = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const borrowRecord = await prisma.borrowRecord.findUnique({
      where: { id },
      include: { book: true, user: true },
    });

    if (!borrowRecord) {
      return res.status(404).json({ message: '借阅记录不存在' });
    }

    if (borrowRecord.renewCount >= 1) {
      return res.status(400).json({ message: '已达到最大续借次数' });
    }

    if (borrowRecord.status !== BorrowStatus.BORROWED) {
      return res.status(400).json({ message: '该图书不可续借' });
    }

    const overdueDays = getOverdueDays(borrowRecord.dueDate);
    if (overdueDays > 0) {
      return res.status(400).json({ message: '逾期图书不可续借' });
    }

    const newDueDate = dayjs(borrowRecord.dueDate).add(15, 'day').toDate();

    const updatedRecord = await prisma.borrowRecord.update({
      where: { id },
      data: {
        dueDate: newDueDate,
        renewCount: { increment: 1 },
      },
      include: { book: true },
    });

    await sendMessageToUser(borrowRecord.userId, {
      title: '续借成功',
      content: `《${borrowRecord.book.title}》续借成功，新的应还日期为${dayjs(newDueDate).format('YYYY-MM-DD')}`,
      type: MessageType.RENEW,
    });

    res.json(updatedRecord);
  } catch (error) {
    console.error('Renew book error:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
};
