const Notification = require('../models/Notification');

exports.getMyNotifications = async (req, res, next) => {
  try {
    const { unreadOnly, page = 1, limit = 50 } = req.query;
    
    const notifications = await Notification.getUserNotifications(
      req.user.id,
      unreadOnly === 'true'
    );

    const startIndex = (page - 1) * limit;
    const paginatedNotifications = notifications.slice(startIndex, startIndex + parseInt(limit));

    res.status(200).json({
      success: true,
      count: paginatedNotifications.length,
      total: notifications.length,
      totalPages: Math.ceil(notifications.length / limit),
      currentPage: parseInt(page),
      data: paginatedNotifications
    });
  } catch (err) {
    next(err);
  }
};

exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.getUnreadCount(req.user.id);

    res.status(200).json({
      success: true,
      data: { count }
    });
  } catch (err) {
    next(err);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    await Notification.markAsRead(req.user.id, id);

    res.status(200).json({
      success: true,
      message: '通知已标记为已读'
    });
  } catch (err) {
    next(err);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.markAsRead(req.user.id);

    res.status(200).json({
      success: true,
      message: '所有通知已标记为已读'
    });
  } catch (err) {
    next(err);
  }
};

exports.getNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: '通知不存在'
      });
    }

    if (notification.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权查看此通知'
      });
    }

    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (err) {
    next(err);
  }
};

exports.createAdminNotification = async (req, res, next) => {
  try {
    const { userId, title, message, type = 'admin' } = req.body;

    const notification = await Notification.createAndPush({
      userId,
      type,
      title,
      message,
      data: req.body.data || {}
    }, req.app.get('io'));

    res.status(201).json({
      success: true,
      message: '通知已发送',
      data: notification
    });
  } catch (err) {
    next(err);
  }
};

exports.broadcastNotification = async (req, res, next) => {
  try {
    const { title, message, type = 'system' } = req.body;

    const User = require('../models/User');
    const users = await User.find({}, '_id');
    
    const notifications = [];
    for (const user of users) {
      const notification = await Notification.create({
        userId: user._id,
        type,
        title,
        message,
        data: req.body.data || {}
      });
      notifications.push(notification);
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('broadcast', { title, message, type });
    }

    res.status(201).json({
      success: true,
      message: `广播通知已发送给 ${users.length} 位用户`,
      sentCount: users.length
    });
  } catch (err) {
    next(err);
  }
};
