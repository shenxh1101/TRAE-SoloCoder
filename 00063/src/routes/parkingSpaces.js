const express = require('express');
const {
  getParkingSpaces,
  getParkingSpace,
  createParkingSpace,
  updateParkingSpace,
  deleteParkingSpace,
  getSpaceAvailability,
  getSpaceAvailableSlots,
  getParkingStats
} = require('../controllers/parkingSpaceController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, getParkingSpaces);
router.get('/stats', protect, getParkingStats);
router.get('/availability', protect, getSpaceAvailability);
router.get('/:id', protect, getParkingSpace);
router.get('/:id/available-slots', protect, getSpaceAvailableSlots);

router.post('/', protect, authorize('admin'), createParkingSpace);
router.put('/:id', protect, authorize('admin'), updateParkingSpace);
router.delete('/:id', protect, authorize('admin'), deleteParkingSpace);

module.exports = router;
