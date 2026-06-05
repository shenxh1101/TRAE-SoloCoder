const express = require('express');
const {
  getPlans,
  getRecommendedPlan,
  applyMonthlyCard,
  getMyMonthlyCards,
  getMonthlyCard,
  renewMonthlyCard,
  approveMonthlyCard,
  getAllMonthlyCards
} = require('../controllers/monthlyCardController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/plans', protect, getPlans);
router.get('/recommend', protect, getRecommendedPlan);
router.post('/apply', protect, applyMonthlyCard);
router.get('/my', protect, getMyMonthlyCards);
router.get('/:id', protect, getMonthlyCard);
router.put('/:id/renew', protect, renewMonthlyCard);

router.get('/', protect, authorize('admin'), getAllMonthlyCards);
router.put('/:id/approve', protect, authorize('admin'), approveMonthlyCard);

module.exports = router;
