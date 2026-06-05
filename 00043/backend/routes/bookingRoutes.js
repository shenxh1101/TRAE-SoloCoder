import express from 'express';
import {
  getBookings,
  getBooking,
  createBooking,
  payDeposit,
  updateBookingStatus,
  addBookingUpdate,
  addMessage,
  addReview,
  getReminders,
  dismissReminder,
} from '../controllers/bookingController.js';
import { protect, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.use(protect);

router.get('/reminders', getReminders);
router.put('/reminders/:id/dismiss', dismissReminder);

router.post('/:id/pay', payDeposit);
router.put('/:id/status', updateBookingStatus);
router.post('/:id/updates', upload.array('media', 5), addBookingUpdate);
router.post('/:id/messages', addMessage);
router.post('/:id/review', addReview);

router.route('/')
  .get(getBookings)
  .post(createBooking);

router.route('/:id')
  .get(getBooking);

export default router;
