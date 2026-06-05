import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { sendMessageToUser } from '../services/websocket';
import { FineStatus, MessageType } from '@prisma/client';

export const getFines = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, pageSize = 10, status, userId } = req.query;
    
    const where: any = {};
    if (status) where.status = status;
    if (userId) where.userId = userId as string;

    const [fines, total] = await Promise.all([
      prisma.fine.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, username: true } },
          borrowRecord: { include: { book: { select: { title: true } } } },
        },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.fine.count({ where }),
    ]);

    res.json({
      data: fines,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  } catch (error) {
    console.error('Get fines error:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
};

export const getUserFines = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { page = 1, pageSize = 10, status } = req.query;
    
    const where: any = { userId };
    if (status) where.status = status;

    const [fines, total] = await Promise.all([
      prisma.fine.findMany({
        where,
        include: {
          borrowRecord: { include: { book: true } },
        },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.fine.count({ where }),
    ]);

    res.json({
      data: fines,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  } catch (error) {
    console.error('Get user fines error:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
};

export const payFine = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const fine = await prisma.fine.findUnique({
      where: { id },
      include: { borrowRecord: { include: { book: true } } },
    });

    if (!fine) {
      return res.status(404).json({ message: '罚款记录不存在' });
    }

    if (fine.status === FineStatus.PAID) {
      return res.status(400).json({ message: '该罚款已缴纳' });
    }

    if (fine.userId !== req.user?.id && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: '权限不足' });
    }

    const updatedFine = await prisma.fine.update({
      where: { id },
      data: {
        status: FineStatus.PAID,
        paidDate: new Date(),
      },
    });

    await sendMessageToUser(fine.userId, {
      title: '罚款缴纳成功',
      content: `您已成功缴纳罚款¥${Number(fine.amount).toFixed(2)}`,
      type: MessageType.FINE,
    });

    res.json(updatedFine);
  } catch (error) {
    console.error('Pay fine error:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
};
