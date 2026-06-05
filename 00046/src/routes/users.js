const express = require('express');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/profile', protect, async (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user
  });
});

router.get('/admin-only', protect, authorize('admin'), (req, res) => {
  res.status(200).json({
    success: true,
    message: '管理员权限验证通过'
  });
});

router.get('/hr-only', protect, authorize('admin', 'hr'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'HR权限验证通过'
  });
});

module.exports = router;
