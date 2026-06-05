const express = require('express');
const {
  createJob,
  publishJob,
  matchCandidates,
  getJobMatches,
  validateJobBudget,
  getJobs,
  getJob,
  updateJob,
  shortlistCandidate
} = require('../controllers/jobController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getJobs)
  .post(authorize('admin', 'hr', 'hiring_manager'), createJob);

router.route('/validate-budget')
  .post(authorize('admin', 'hr', 'hiring_manager'), validateJobBudget);

router.route('/:id')
  .get(getJob)
  .put(authorize('admin', 'hr', 'hiring_manager'), updateJob);

router.route('/:id/publish')
  .post(authorize('admin', 'hr', 'hiring_manager'), publishJob);

router.route('/:id/match')
  .get(authorize('admin', 'hr', 'hiring_manager'), matchCandidates);

router.route('/matches/:jobId')
  .get(authorize('admin', 'hr', 'hiring_manager'), getJobMatches);

router.route('/matches/:jobId/:matchId/shortlist')
  .post(authorize('admin', 'hr', 'hiring_manager'), shortlistCandidate);

module.exports = router;
