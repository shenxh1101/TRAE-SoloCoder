const express = require('express');
const Candidate = require('../models/Candidate');
const { AppError } = require('../middleware/errorHandler');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(authorize('admin', 'hr', 'hiring_manager'), async (req, res, next) => {
    try {
      const { page = 1, limit = 20, search, skills, location } = req.query;
      const query = { deleted: { $ne: true } };

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { currentPosition: { $regex: search, $options: 'i' } }
        ];
      }

      if (skills) {
        const skillArray = skills.split(',').map(s => s.trim());
        query.skills = { $in: skillArray };
      }

      if (location) {
        query.location = { $regex: location, $options: 'i' };
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const candidates = await Candidate.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Candidate.countDocuments(query);

      res.status(200).json({
        success: true,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        data: candidates
      });
    } catch (error) {
      next(error);
    }
  })
  .post(authorize('admin', 'hr'), async (req, res, next) => {
    try {
      const candidate = await Candidate.create(req.body);

      res.status(201).json({
        success: true,
        data: candidate
      });
    } catch (error) {
      next(error);
    }
  });

router.route('/:id')
  .get(authorize('admin', 'hr', 'hiring_manager'), async (req, res, next) => {
    try {
      const candidate = await Candidate.findById(req.params.id)
        .populate('resumes');

      if (!candidate) {
        return next(new AppError('候选人不存在', 404));
      }

      res.status(200).json({
        success: true,
        data: candidate
      });
    } catch (error) {
      next(error);
    }
  })
  .put(authorize('admin', 'hr'), async (req, res, next) => {
    try {
      const candidate = await Candidate.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );

      if (!candidate) {
        return next(new AppError('候选人不存在', 404));
      }

      res.status(200).json({
        success: true,
        data: candidate
      });
    } catch (error) {
      next(error);
    }
  })
  .delete(authorize('admin', 'hr'), async (req, res, next) => {
    try {
      const candidate = await Candidate.findById(req.params.id);
      if (!candidate) {
        return next(new AppError('候选人不存在', 404));
      }

      candidate.deleted = true;
      candidate.deletedAt = Date.now();
      candidate.deletedBy = req.user.id;
      await candidate.save();

      res.status(200).json({
        success: true,
        message: '候选人已删除'
      });
    } catch (error) {
      next(error);
    }
  });

module.exports = router;
