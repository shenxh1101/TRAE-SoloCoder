const express = require('express');
const {
  generateDailyReport,
  generateWeeklyReport,
  getReports,
  getReport,
  exportReport,
  getDashboardStats
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/dashboard', protect, authorize('admin'), getDashboardStats);
router.post('/generate-daily', protect, authorize('admin'), generateDailyReport);
router.post('/generate-weekly', protect, authorize('admin'), generateWeeklyReport);
router.get('/export', protect, authorize('admin'), exportReport);
router.get('/:id', protect, authorize('admin'), getReport);
router.get('/', protect, authorize('admin'), getReports);

module.exports = router;
