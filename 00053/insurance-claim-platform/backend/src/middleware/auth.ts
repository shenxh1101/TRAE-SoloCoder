import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload, UserRole, ApiResponse } from '../types';

const JWT_SECRET = 'insurance-secret-key-2024';

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Access token required'
    } as ApiResponse);
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      error: 'Invalid or expired token'
    } as ApiResponse);
  }
}

export function checkPermission(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      } as ApiResponse);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      } as ApiResponse);
      return;
    }

    next();
  };
}

export interface DataScopeFilter {
  region?: string;
  branch?: string;
}

export function checkDataScope(req: Request): DataScopeFilter {
  const filter: DataScopeFilter = {};

  if (!req.user) {
    return filter;
  }

  switch (req.user.role) {
    case 'headquarters':
      break;
    case 'region':
      if (req.user.region) {
        filter.region = req.user.region;
      }
      break;
    case 'branch':
      if (req.user.region) {
        filter.region = req.user.region;
      }
      if (req.user.branch) {
        filter.branch = req.user.branch;
      }
      break;
  }

  return filter;
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    return null;
  }
}

export default {
  authenticateToken,
  checkPermission,
  checkDataScope,
  generateToken,
  verifyToken
};
