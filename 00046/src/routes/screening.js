const express = require('express');
const {
  rateCandidate,
  rankCandidates,
  getCandidateScreeningDetails,
  updateCandidateStatus,
  addNote,
  batchUpdateStatus,
  advanceToPhoneScreen,
  getScreeningStats,
  candidatesRanking
} = require('../controllers/screeningController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/rate/:jobCandidateId')
  .post(authorize('admin', 'hr'), rateCandidate);

router.route('/rank/:jobId')
  .get(authorize('admin', 'hr', 'hiring_manager'), rankCandidates);

router.route('/ranking')
  .get(authorize('admin', 'hr', 'hiring_manager'), candidatesRanking);

router.route('/details/:jobCandidateId')
  .get(authorize('admin', 'hr', 'hiring_manager'), getCandidateScreeningDetails);

router.route('/status/:jobCandidateId')
  .put(authorize('admin', 'hr'), updateCandidateStatus);

router.route('/batch-status')
  .put(authorize('admin', 'hr'), batchUpdateStatus);

router.route('/phone-screen/:jobCandidateId')
  .post(authorize('admin', 'hr'), advanceToPhoneScreen);

router.route('/notes/:jobCandidateId')
  .post(authorize('admin', 'hr', 'hiring_manager'), addNote);

router.route('/stats')
  .get(authorize('admin', 'hr', 'hiring_manager'), getScreeningStats);

module.exports = router;
