const express = require('express');
const {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getNotification,
  createAdminNotification,
  broadcastNotification
} = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/my', protect, getMyNotifications);
router.get('/unread-count', protect, getUnreadCount);
router.put('/:id/read', protect, markAsRead);
router.put('/read-all', protect, markAllAsRead);
router.get('/:id', protect, getNotification);

router.post('/send', protect, authorize('admin'), createAdminNotification);
router.post('/broadcast', protect, authorize('admin'), broadcastNotification);

module.exports = router;
