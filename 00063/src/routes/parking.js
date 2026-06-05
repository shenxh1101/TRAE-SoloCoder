const express = require('express');
const {
  vehicleEntry,
  vehicleExit,
  payParkingFee,
  getParkingHistory,
  getCurrentParking,
  getAllParkingRecords
} = require('../controllers/parkingController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/entry', vehicleEntry);
router.post('/exit', vehicleExit);
router.get('/history', protect, getParkingHistory);
router.get('/current', protect, getCurrentParking);
router.put('/:id/pay', protect, payParkingFee);

router.get('/', protect, authorize('admin'), getAllParkingRecords);

module.exports = router;
