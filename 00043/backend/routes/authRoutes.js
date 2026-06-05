import express from 'express';
import { body } from 'express-validator';
import { register, login, getCurrentUser } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', [
  body('name').notEmpty().withMessage('请输入用户名'),
  body('email').isEmail().withMessage('请输入有效的邮箱'),
  body('password').isLength({ min: 6 }).withMessage('密码至少需要6个字符'),
], register);

router.post('/login', [
  body('email').isEmail().withMessage('请输入有效的邮箱'),
  body('password').notEmpty().withMessage('请输入密码'),
], login);

router.get('/me', protect, getCurrentUser);

export default router;
