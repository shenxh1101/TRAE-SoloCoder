const express = require('express');
const {
  calculateFee,
  createReservation,
  confirmReservation,
  cancelReservation,
  getMyReservations,
  getReservation,
  getAllReservations
} = require('../controllers/reservationController');
const { protect, authorize, checkBookingRestriction } = require('../middleware/auth');

const router = express.Router();

router.post('/calculate-fee', protect, calculateFee);
router.post('/', protect, checkBookingRestriction, createReservation);
router.get('/my', protect, getMyReservations);
router.get('/:id', protect, getReservation);
router.put('/:id/confirm', protect, confirmReservation);
router.put('/:id/cancel', protect, cancelReservation);

router.get('/', protect, authorize('admin'), getAllReservations);

module.exports = router;
