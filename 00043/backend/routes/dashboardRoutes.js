import express from 'express';
import {
  getDashboardStats,
  getRevenueReport,
  exportRevenueCSV,
  exportCaregiverReportCSV,
} from '../controllers/dashboardController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/stats', getDashboardStats);
router.get('/revenue', authorize('admin'), getRevenueReport);
router.get('/revenue/export', authorize('admin'), exportRevenueCSV);
router.get('/caregiver/export', authorize('admin'), exportCaregiverReportCSV);

export default router;
