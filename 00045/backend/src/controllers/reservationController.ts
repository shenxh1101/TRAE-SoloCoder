import { Response } from 'express';
import dayjs from 'dayjs';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { sendMessageToUser } from '../services/websocket';
import { MessageType, ReservationStatus } from '@prisma/client';

export const getReservations = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, pageSize = 10, status, userId, bookId } = req.query;
    
    const where: any = {};
    if (status) where.status = status;
    if (userId) where.userId = userId as string;
    if (bookId) where.bookId = bookId as string;

    const [reservations, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, username: true } },
          book: { select: { id: true, title: true, isbn: true } },
        },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { reserveDate: 'desc' },
      }),
      prisma.reservation.count({ where }),
    ]);

    res.json({
      data: reservations,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  } catch (error) {
    console.error('Get reservations error:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
};

export const getUserReservations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { page = 1, pageSize = 10, status } = req.query;
    
    const where: any = { userId };
    if (status) where.status = status;

    const [reservations, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        include: { book: true },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { reserveDate: 'desc' },
      }),
      prisma.reservation.count({ where }),
    ]);

    res.json({
      data: reservations,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  } catch (error) {
    console.error('Get user reservations error:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
};

export const createReservation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { bookId } = req.body;

    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book) {
      return res.status(404).json({ message: '图书不存在' });
    }

    if (book.availableCopies > 0) {
      return res.status(400).json({ message: '该图书有库存，可直接借阅' });
    }

    const existingReservation = await prisma.reservation.findFirst({
      where: {
        userId,
        bookId,
        status: { in: [ReservationStatus.PENDING, ReservationStatus.NOTIFIED] },
      },
    });

    if (existingReservation) {
      return res.status(400).json({ message: '您已预约该图书' });
    }

    const pendingCount = await prisma.reservation.count({
      where: { bookId, status: ReservationStatus.PENDING },
    });

    const reservation = await prisma.reservation.create({
      data: {
        userId,
        bookId,
        queuePosition: pendingCount + 1,
      },
      include: { book: true },
    });

    await sendMessageToUser(userId, {
      title: '预约成功',
      content: `您已成功预约《${book.title}》，当前排队位置：第${pendingCount + 1}位`,
      type: MessageType.RESERVE,
    });

    res.status(201).json(reservation);
  } catch (error) {
    console.error('Create reservation error:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
};

export const cancelReservation = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { book: true },
    });

    if (!reservation) {
      return res.status(404).json({ message: '预约记录不存在' });
    }

    if (reservation.userId !== userId && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: '权限不足' });
    }

    if (reservation.status === ReservationStatus.COMPLETED || reservation.status === ReservationStatus.EXPIRED) {
      return res.status(400).json({ message: '该预约不可取消' });
    }

    await prisma.reservation.update({
      where: { id },
      data: { status: ReservationStatus.CANCELLED },
    });

    await prisma.reservation.updateMany({
      where: {
        bookId: reservation.bookId,
        status: ReservationStatus.PENDING,
        queuePosition: { gt: reservation.queuePosition },
      },
      data: { queuePosition: { decrement: 1 } },
    });

    await sendMessageToUser(userId, {
      title: '预约已取消',
      content: `您已取消《${reservation.book.title}》的预约`,
      type: MessageType.RESERVE,
    });

    res.json({ message: '取消成功' });
  } catch (error) {
    console.error('Cancel reservation error:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
};

export const completeReservation = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { book: true },
    });

    if (!reservation) {
      return res.status(404).json({ message: '预约记录不存在' });
    }

    if (reservation.status !== ReservationStatus.NOTIFIED) {
      return res.status(400).json({ message: '该预约不可完成' });
    }

    await prisma.reservation.update({
      where: { id },
      data: { status: ReservationStatus.COMPLETED },
    });

    res.json({ message: '完成成功' });
  } catch (error) {
    console.error('Complete reservation error:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
};
