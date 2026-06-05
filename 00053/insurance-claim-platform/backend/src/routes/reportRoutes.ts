import { Router } from 'express';
import {
  generateMonthlyReport,
  getMonthlyReports,
  generateSuggestions,
  exportReportPDF
} from '../controllers/reportController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/monthly', authenticateToken, getMonthlyReports);
router.get('/:month', authenticateToken, generateMonthlyReport);
router.get('/:month/suggestions', authenticateToken, generateSuggestions);
router.get('/:month/export/pdf', authenticateToken, exportReportPDF);

export default router;
