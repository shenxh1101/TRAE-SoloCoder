const express = require('express');
const {
  initiateBackgroundCheck,
  updateCheckItem,
  assignInvestigator,
  submitReport,
  approveBackgroundCheck,
  cancelBackgroundCheck,
  getBackgroundCheck,
  getBackgroundChecks,
  getMyBackgroundChecks,
  getStatistics
} = require('../controllers/backgroundCheckController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(authorize('admin', 'hr'), getBackgroundChecks);

router.route('/stats')
  .get(authorize('admin', 'hr'), getStatistics);

router.route('/my')
  .get(authorize('admin', 'hr', 'investigator'), getMyBackgroundChecks);

router.route('/initiate/:jobCandidateId')
  .post(authorize('admin', 'hr'), initiateBackgroundCheck);

router.route('/:checkId')
  .get(authorize('admin', 'hr', 'investigator'), getBackgroundCheck)
  .put(authorize('admin', 'hr', 'investigator'), assignInvestigator);

router.route('/:checkId/items/:itemId')
  .put(authorize('admin', 'hr', 'investigator'), updateCheckItem);

router.route('/:checkId/submit-report')
  .post(authorize('admin', 'hr', 'investigator'), submitReport);

router.route('/:checkId/approve')
  .post(authorize('admin', 'hr_manager'), approveBackgroundCheck);

router.route('/:checkId/cancel')
  .post(authorize('admin', 'hr'), cancelBackgroundCheck);

module.exports = router;
