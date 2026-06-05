const mongoose = require('mongoose');

const violationRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  licensePlate: {
    type: String,
    required: true,
    index: true
  },
  parkingRecordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ParkingRecord'
  },
  reservationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation'
  },
  spaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ParkingSpace'
  },
  type: {
    type: String,
    required: true,
    enum: ['overtime', 'wrong_zone', 'no_reservation', 'disabled_abuse', 'other'],
    index: true
  },
  typeName: String,
  description: String,
  severity: {
    type: String,
    enum: ['minor', 'moderate', 'severe'],
    default: 'minor'
  },
  fineAmount: {
    type: Number,
    default: 0
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  paidAt: Date,
  evidenceImages: [String],
  detectedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  handledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  handledAt: Date,
  handlingNotes: String,
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'appealed', 'dismissed', 'resolved'],
    default: 'pending'
  },
  userAppeal: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

violationRecordSchema.index({ userId: 1, status: 1, createdAt: -1 });
violationRecordSchema.index({ licensePlate: 1, detectedAt: -1 });

violationRecordSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

violationRecordSchema.statics.TYPE_DESCRIPTIONS = {
  overtime: '超时占位',
  wrong_zone: '违规停放区域',
  no_reservation: '无预约占用',
  disabled_abuse: '滥用残疾人车位',
  other: '其他违规'
};

violationRecordSchema.statics.checkAndAddViolation = async function(userId, licensePlate, type, details = {}) {
  const violation = new this({
    userId,
    licensePlate,
    type,
    typeName: this.TYPE_DESCRIPTIONS[type],
    ...details
  });
  
  await violation.save();
  
  const User = mongoose.model('User');
  const user = await User.findById(userId);
  
  if (user) {
    user.violationCount = (user.violationCount || 0) + 1;
    
    if (user.violationCount >= 3) {
      user.isBookingRestricted = true;
    }
    
    await user.save();
    
    const Notification = mongoose.model('Notification');
    await Notification.create({
      userId,
      type: 'violation',
      title: '违规停车通知',
      message: `您的车辆 ${licensePlate} 因${this.TYPE_DESCRIPTIONS[type]}被记录。累计${user.violationCount}次违规${user.violationCount >= 3 ? '，预约权限已被限制' : ''}。`,
      data: { violationId: violation._id, violationCount: user.violationCount }
    });
  }
  
  return violation;
};

violationRecordSchema.statics.getUserViolations = function(userId, status = null) {
  const query = { userId };
  if (status) query.status = status;
  return this.find(query).sort({ detectedAt: -1 }).populate('spaceId');
};

violationRecordSchema.statics.getUnpaidViolations = function(userId) {
  return this.find({
    userId,
    isPaid: false,
    status: { $in: ['pending', 'confirmed'] }
  }).sort({ detectedAt: -1 });
};

violationRecordSchema.statics.clearViolations = async function(userId, adminUserId, reason = '') {
  const User = mongoose.model('User');
  const user = await User.findById(userId);
  
  if (!user) {
    throw new Error('用户不存在');
  }
  
  user.violationCount = 0;
  user.isBookingRestricted = false;
  await user.save();
  
  await this.updateMany(
    { userId, status: { $in: ['pending', 'confirmed'] } },
    { 
      status: 'resolved',
      handledBy: adminUserId,
      handledAt: new Date(),
      handlingNotes: reason || '管理员手动清除违规记录'
    }
  );
  
  const Notification = mongoose.model('Notification');
  await Notification.create({
    userId,
    type: 'system',
    title: '违规记录已清除',
    message: '管理员已清除您的违规记录，预约权限已恢复。',
    data: {}
  });
  
  return true;
};

violationRecordSchema.methods.payFine = function() {
  this.isPaid = true;
  this.paidAt = new Date();
  this.status = 'resolved';
  return this.save();
};

violationRecordSchema.methods.appeal = function(appealText) {
  this.userAppeal = appealText;
  this.status = 'appealed';
  return this.save();
};

module.exports = mongoose.model('ViolationRecord', violationRecordSchema);
