const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: [true, '请输入手机号'],
    unique: true,
    match: [/^1[3-9]\d{9}$/, '请输入有效的手机号']
  },
  password: {
    type: String,
    required: [true, '请输入密码'],
    minlength: 6,
    select: false
  },
  name: {
    type: String,
    required: [true, '请输入姓名']
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  licensePlates: [{
    type: String,
    match: [/^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z][A-Z0-9]{5,6}$/, '请输入有效的车牌号']
  }],
  defaultPlate: String,
  isBookingRestricted: {
    type: Boolean,
    default: false
  },
  violationCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

userSchema.virtual('monthlyCards', {
  ref: 'MonthlyCard',
  localField: '_id',
  foreignField: 'userId',
  justOne: false
});

userSchema.virtual('reservations', {
  ref: 'Reservation',
  localField: '_id',
  foreignField: 'userId',
  justOne: false
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.getValidMonthlyCard = function() {
  return this.monthlyCards?.find(card => 
    card.status === 'active' && new Date(card.expireAt) > new Date()
  );
};

module.exports = mongoose.model('User', userSchema);
