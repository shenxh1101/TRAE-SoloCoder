import express from 'express';
import { body } from 'express-validator';
import {
  getPets,
  getPet,
  createPet,
  updatePet,
  deletePet,
  getAllPets,
} from '../controllers/petController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/all', authorize('admin'), getAllPets);

router.route('/')
  .get(getPets)
  .post([
    body('name').notEmpty().withMessage('请输入宠物名称'),
    body('breed').notEmpty().withMessage('请输入品种'),
    body('age').isInt({ min: 0 }).withMessage('请输入有效的年龄'),
    body('weight').isFloat({ min: 0 }).withMessage('请输入有效的体重'),
  ], createPet);

router.route('/:id')
  .get(getPet)
  .put(updatePet)
  .delete(deletePet);

export default router;
