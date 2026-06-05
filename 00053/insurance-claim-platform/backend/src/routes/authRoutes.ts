import { Router } from 'express';
import { login, logout, getCurrentUser } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/login', login);

router.get('/me', authenticateToken, getCurrentUser);

router.post('/logout', authenticateToken, logout);

export default router;
