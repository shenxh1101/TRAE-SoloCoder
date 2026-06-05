const express = require('express');
const {
  getAvailableSlots,
  scheduleInterview,
  confirmInterview,
  submitEvaluation,
  getInterviewReport,
  triggerReReview,
  updateInterviewStatus,
  getInterviews,
  getInterview,
  cancelInterview,
  checkConflict,
  scoreDifference
} = require('../controllers/interviewController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getInterviews)
  .post(authorize('admin', 'hr'), scheduleInterview);

router.route('/check-conflict')
  .post(authorize('admin', 'hr'), checkConflict);

router.route('/score-difference')
  .post(authorize('admin', 'hr', 'hiring_manager'), scoreDifference);

router.route('/available-slots/:jobCandidateId')
  .post(authorize('admin', 'hr'), getAvailableSlots);

router.route('/:interviewId')
  .get(getInterview)
  .put(authorize('admin', 'hr'), updateInterviewStatus);

router.route('/:interviewId/confirm')
  .post(confirmInterview);

router.route('/:interviewId/evaluate')
  .post(authorize('admin', 'hr', 'interviewer'), submitEvaluation);

router.route('/:interviewId/report')
  .get(authorize('admin', 'hr', 'hiring_manager'), getInterviewReport);

router.route('/:interviewId/cancel')
  .post(authorize('admin', 'hr'), cancelInterview);

router.route('/reports/:reportId/re-review')
  .post(authorize('admin', 'hr', 'hiring_manager'), triggerReReview);

module.exports = router;
