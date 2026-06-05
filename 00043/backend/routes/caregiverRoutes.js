import express from 'express';
import {
  getCaregivers,
  getCaregiver,
  createCaregiver,
  updateCaregiver,
  deleteCaregiver,
  assignCaregiver,
  getSchedules,
  addSchedule,
  updateSchedule,
  deleteSchedule,
  updateCaregiverWeight,
} from '../controllers/caregiverController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getCaregivers)
  .post(authorize('admin'), createCaregiver);

router.route('/:id')
  .get(getCaregiver)
  .put(authorize('admin'), updateCaregiver)
  .delete(authorize('admin'), deleteCaregiver);

router.put('/:id/weight', authorize('admin'), updateCaregiverWeight);
router.get('/assign', assignCaregiver);

router.get('/schedules', getSchedules);
router.post('/schedules', authorize('admin'), addSchedule);
router.put('/schedules/:id', authorize('admin'), updateSchedule);
router.delete('/schedules/:id', authorize('admin'), deleteSchedule);

export default router;
