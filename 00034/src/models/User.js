const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  phone: {
    type: String,
    required: true,
    unique: true
  },
  email: String,
  memberLevel: {
    type: String,
    enum: ['normal', 'silver', 'gold'],
    default: 'normal'
  },
  totalPoints: {
    type: Number,
    default: 0
  },
  availablePoints: {
    type: Number,
    default: 0
  },
  lastLoginAt: {
    type: Date,
    default: Date.now
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.methods.getPointsMultiplier = function() {
  const multipliers = {
    normal: 1,
    silver: 1.2,
    gold: 1.5
  };
  return multipliers[this.memberLevel] || 1;
};

userSchema.methods.isHighActivity = function() {
  return this.totalOrders >= 10 && this.totalSpent >= 5000;
};

userSchema.methods.isInactive = function() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return this.lastLoginAt < thirtyDaysAgo;
};

module.exports = mongoose.model('User', userSchema);
