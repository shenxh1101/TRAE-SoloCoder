import { Request, Response, NextFunction } from 'express';
import { verify } from 'jsonwebtoken';
import { JWT_SECRET } from '../config';
import type { UserRole } from '../types';

interface JwtPayload {
  userId: string;
  username: string;
  role: UserRole;
  name: string;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: '未提供认证令牌' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = verify(token, JWT_SECRET) as JwtPayload;
    req.user = {
      id: decoded.userId,
      username: decoded.username,
      role: decoded.role,
    };
    next();
  } catch (error) {
    res.status(401).json({ message: '认证令牌无效或已过期' });
  }
}

export function roleMiddleware(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: '用户未认证' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: '权限不足' });
      return;
    }

    next();
  };
}
