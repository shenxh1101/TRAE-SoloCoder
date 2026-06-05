const express = require('express');
const {
  generateFunnelReport,
  exportFunnelReportToExcel,
  getReports,
  getReport,
  deleteReport,
  sendReportByEmail,
  getDepartmentStats,
  getSourceStats
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(authorize('admin', 'hr', 'hiring_manager'), getReports);

router.route('/funnel')
  .post(authorize('admin', 'hr', 'hiring_manager'), generateFunnelReport);

router.route('/funnel/export')
  .post(authorize('admin', 'hr', 'hiring_manager'), exportFunnelReportToExcel);

router.route('/department-stats')
  .get(authorize('admin', 'hr', 'hiring_manager'), getDepartmentStats);

router.route('/source-stats')
  .get(authorize('admin', 'hr', 'hiring_manager'), getSourceStats);

router.route('/:reportId')
  .get(authorize('admin', 'hr', 'hiring_manager'), getReport)
  .delete(authorize('admin', 'hr'), deleteReport);

router.route('/:reportId/send-email')
  .post(authorize('admin', 'hr'), sendReportByEmail);

module.exports = router;
