import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth';

const createUserSchema = z.object({
  username: z.string().min(3, '用户名至少3个字符'),
  password: z.string().min(6, '密码至少6个字符'),
  name: z.string().min(1, '姓名不能为空'),
  email: z.string().email('邮箱格式不正确').optional().nullable(),
  phone: z.string().optional().nullable(),
  role: z.enum(['STUDENT', 'TEACHER', 'ADMIN']).default('STUDENT'),
  department: z.string().optional().nullable(),
  studentId: z.string().optional().nullable(),
});

const updateUserSchema = z.object({
  name: z.string().min(1, '姓名不能为空').optional(),
  email: z.string().email('邮箱格式不正确').optional().nullable(),
  phone: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  avatar: z.string().optional().nullable(),
});

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, pageSize = 10, role, search } = req.query;
    
    const where: any = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { username: { contains: search as string } },
        { name: { contains: search as string } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          department: true,
          studentId: true,
          avatar: true,
          createdAt: true,
        },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      data: users,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
};

export const getUserById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        department: true,
        studentId: true,
        avatar: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const data = createUserSchema.parse(req.body);
    
    const existingUser = await prisma.user.findUnique({
      where: { username: data.username },
    });

    if (existingUser) {
      return res.status(400).json({ message: '用户名已存在' });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    res.status(201).json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: '请求参数错误', errors: error.errors });
    }
    console.error('Create user error:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateUserSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
      },
    });

    res.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: '请求参数错误', errors: error.errors });
    }
    console.error('Update user error:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.user.delete({ where: { id } });
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
};
