import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth';

export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { page = 1, pageSize = 20, unread } = req.query;
    
    const where: any = { userId };
    if (unread === 'true') where.read = false;

    const [messages, total, unreadCount] = await Promise.all([
      prisma.message.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.message.count({ where }),
      prisma.message.count({ where: { userId, read: false } }),
    ]);

    res.json({
      data: messages,
      total,
      unreadCount,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const message = await prisma.message.findUnique({ where: { id } });
    
    if (!message) {
      return res.status(404).json({ message: '消息不存在' });
    }

    if (message.userId !== userId) {
      return res.status(403).json({ message: '权限不足' });
    }

    const updatedMessage = await prisma.message.update({
      where: { id },
      data: { read: true, readAt: new Date() },
    });

    res.json(updatedMessage);
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    await prisma.message.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    });

    res.json({ message: '全部标记为已读' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
};

export const deleteMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const message = await prisma.message.findUnique({ where: { id } });
    
    if (!message) {
      return res.status(404).json({ message: '消息不存在' });
    }

    if (message.userId !== userId && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: '权限不足' });
    }

    await prisma.message.delete({ where: { id } });

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
};
