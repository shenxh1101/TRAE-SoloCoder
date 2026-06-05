import express from 'express';
import {
  getRooms,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom,
  getAvailableRooms,
} from '../controllers/roomController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/available', protect, getAvailableRooms);

router.route('/')
  .get(protect, getRooms)
  .post(protect, authorize('admin'), createRoom);

router.route('/:id')
  .get(protect, getRoom)
  .put(protect, authorize('admin'), updateRoom)
  .delete(protect, authorize('admin'), deleteRoom);

export default router;
