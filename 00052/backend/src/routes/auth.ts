import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { JWT_SECRET } from '../config';
import { User } from '../entities/User';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const router = Router();

interface LoginRequest {
  username: string;
  password: string;
}

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body as LoginRequest;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: '用户名和密码不能为空'
      });
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { username } });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: '用户名或密码错误'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: '用户名或密码错误'
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          department: user.department
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: '登录失败，请稍后重试'
    });
  }
});

router.post('/logout', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        message: '登出成功'
      }
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: '登出失败'
    });
  }
});

router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: '未提供认证令牌'
      });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({ where: { id: decoded.userId } });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: '用户不存在'
        });
      }

      res.json({
        success: true,
        data: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          department: user.department
        }
      });
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: '认证令牌无效或已过期'
      });
    }
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      error: '获取用户信息失败'
    });
  }
});

export default router;
