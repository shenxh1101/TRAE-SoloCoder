import express from 'express';
import {
  getPackages,
  getPackage,
  createPackage,
  updatePackage,
  deletePackage,
  recommendPackages,
} from '../controllers/packageController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/recommend/:petId', protect, recommendPackages);

router.route('/')
  .get(protect, getPackages)
  .post(protect, authorize('admin'), createPackage);

router.route('/:id')
  .get(protect, getPackage)
  .put(protect, authorize('admin'), updatePackage)
  .delete(protect, authorize('admin'), deletePackage);

export default router;
