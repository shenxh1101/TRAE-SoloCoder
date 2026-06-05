const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['reservation', 'parking', 'payment', 'violation', 'monthly_card', 'system', 'admin'],
    index: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: Object,
    default: {}
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: Date,
  isPushed: {
    type: Boolean,
    default: false
  },
  pushedAt: Date,
  pushChannels: [{
    type: String,
    enum: ['websocket', 'sms', 'email', 'app']
  }],
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

notificationSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

notificationSchema.statics.createAndPush = async function(notificationData, io) {
  const notification = new this(notificationData);
  await notification.save();
  
  if (io) {
    io.to(`user:${notification.userId}`).emit('notification', {
      id: notification._id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      createdAt: notification.createdAt
    });
    
    notification.isPushed = true;
    notification.pushedAt = new Date();
    notification.pushChannels.push('websocket');
    await notification.save();
  }
  
  return notification;
};

notificationSchema.statics.broadcastToAdmins = async function(notificationData, io) {
  const User = mongoose.model('User');
  const admins = await User.find({ role: 'admin' });
  
  const notifications = [];
  for (const admin of admins) {
    const notification = new this({
      ...notificationData,
      userId: admin._id
    });
    await notification.save();
    notifications.push(notification);
    
    if (io) {
      io.to(`user:${admin._id}`).emit('notification', {
        id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        createdAt: notification.createdAt
      });
    }
  }
  
  return notifications;
};

notificationSchema.statics.getUserNotifications = function(userId, unreadOnly = false, limit = 50) {
  const query = { userId };
  if (unreadOnly) query.isRead = false;
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit);
};

notificationSchema.statics.markAsRead = function(userId, notificationId = null) {
  const query = { userId };
  if (notificationId) query._id = notificationId;
  return this.updateMany(
    query,
    { isRead: true, readAt: new Date() }
  );
};

notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({ userId, isRead: false });
};

notificationSchema.methods.markRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Notification', notificationSchema);
