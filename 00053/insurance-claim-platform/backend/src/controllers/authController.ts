import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db';
import { generateToken } from '../middleware/auth';
import { User, LoginRequest, LoginResponse, ApiResponse, JwtPayload } from '../types';

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { username, password }: LoginRequest = req.body;

    if (!username || !password) {
      res.status(400).json({
        success: false,
        error: 'Username and password are required'
      } as ApiResponse);
      return;
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined;

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      } as ApiResponse);
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.password || '');

    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      } as ApiResponse);
      return;
    }

    const payload: JwtPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      region: user.region,
      branch: user.branch
    };

    const token = generateToken(payload);

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: {
        token,
        user: userWithoutPassword
      } as LoginResponse,
      message: 'Login successful'
    } as ApiResponse<LoginResponse>);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
}

export function logout(req: Request, res: Response): void {
  res.json({
    success: true,
    message: 'Logout successful'
  } as ApiResponse);
}

export function getCurrentUser(req: Request, res: Response): void {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      } as ApiResponse);
      return;
    }

    const user = db.prepare('SELECT id, username, name, role, region, branch, created_at FROM users WHERE id = ?').get(req.user.userId) as Omit<User, 'password'> | undefined;

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      data: user,
      message: 'User retrieved successfully'
    } as ApiResponse<Omit<User, 'password'>>);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
}

export default {
  login,
  logout,
  getCurrentUser
};
