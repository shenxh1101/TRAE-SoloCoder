import { Router } from 'express';
import multer from 'multer';
import { authenticate, requireAdmin } from '../middleware/auth';
import * as authController from '../controllers/authController';
import * as userController from '../controllers/userController';
import * as bookController from '../controllers/bookController';
import * as borrowController from '../controllers/borrowController';
import * as reservationController from '../controllers/reservationController';
import * as fineController from '../controllers/fineController';
import * as messageController from '../controllers/messageController';
import * as statsController from '../controllers/statsController';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/auth/login', authController.login);
router.get('/auth/me', authenticate, authController.getCurrentUser);

router.get('/users', authenticate, requireAdmin, userController.getUsers);
router.get('/users/:id', authenticate, userController.getUserById);
router.post('/users', authenticate, requireAdmin, userController.createUser);
router.put('/users/:id', authenticate, requireAdmin, userController.updateUser);
router.delete('/users/:id', authenticate, requireAdmin, userController.deleteUser);

router.get('/books', authenticate, bookController.getBooks);
router.get('/books/:id', authenticate, bookController.getBookById);
router.post('/books', authenticate, requireAdmin, bookController.createBook);
router.put('/books/:id', authenticate, requireAdmin, bookController.updateBook);
router.delete('/books/:id', authenticate, requireAdmin, bookController.deleteBook);
router.post('/books/import', authenticate, requireAdmin, upload.single('file'), bookController.importBooks);
router.get('/books/export', authenticate, requireAdmin, bookController.exportBooks);

router.get('/borrows', authenticate, requireAdmin, borrowController.getBorrowRecords);
router.get('/borrows/my', authenticate, borrowController.getUserBorrowRecords);
router.get('/borrows/eligibility/:userId', authenticate, borrowController.checkEligibility);
router.post('/borrows', authenticate, requireAdmin, borrowController.borrowBook);
router.post('/borrows/:id/return', authenticate, requireAdmin, borrowController.returnBook);
router.post('/borrows/:id/renew', authenticate, borrowController.renewBook);

router.get('/reservations', authenticate, requireAdmin, reservationController.getReservations);
router.get('/reservations/my', authenticate, reservationController.getUserReservations);
router.post('/reservations', authenticate, reservationController.createReservation);
router.post('/reservations/:id/cancel', authenticate, reservationController.cancelReservation);
router.post('/reservations/:id/complete', authenticate, requireAdmin, reservationController.completeReservation);

router.get('/fines', authenticate, requireAdmin, fineController.getFines);
router.get('/fines/my', authenticate, fineController.getUserFines);
router.post('/fines/:id/pay', authenticate, fineController.payFine);

router.get('/messages', authenticate, messageController.getMessages);
router.post('/messages/:id/read', authenticate, messageController.markAsRead);
router.post('/messages/read-all', authenticate, messageController.markAllAsRead);
router.delete('/messages/:id', authenticate, messageController.deleteMessage);

router.get('/stats/dashboard', authenticate, requireAdmin, statsController.getDashboardStats);
router.get('/stats/popular-books', authenticate, statsController.getPopularBooks);
router.get('/stats/reader-types', authenticate, statsController.getReaderTypeStats);
router.get('/stats/overdue-rate', authenticate, statsController.getOverdueRate);
router.get('/stats/daily-borrows', authenticate, statsController.getDailyBorrows);
router.get('/stats/monthly', authenticate, requireAdmin, statsController.getMonthlyStats);

export default router;
