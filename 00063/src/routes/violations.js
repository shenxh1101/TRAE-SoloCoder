const express = require('express');
const {
  getMyViolations,
  getViolation,
  appealViolation,
  payFine,
  getAllViolations,
  handleViolation,
  clearUserViolations,
  createViolation
} = require('../controllers/violationController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/my', protect, getMyViolations);
router.get('/:id', protect, getViolation);
router.put('/:id/appeal', protect, appealViolation);
router.put('/:id/pay', protect, payFine);

router.get('/', protect, authorize('admin'), getAllViolations);
router.post('/', protect, authorize('admin'), createViolation);
router.put('/:id/handle', protect, authorize('admin'), handleViolation);
router.post('/clear-user', protect, authorize('admin'), clearUserViolations);

module.exports = router;
