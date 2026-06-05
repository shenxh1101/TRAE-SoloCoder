const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['discount', 'fixed'],
    required: true
  },
  value: {
    type: Number,
    required: true
  },
  minPurchase: {
    type: Number,
    default: 0
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  targetLevel: {
    type: String,
    enum: ['normal', 'silver', 'gold', 'all'],
    default: 'all'
  },
  status: {
    type: String,
    enum: ['available', 'used', 'expired'],
    default: 'available'
  },
  validFrom: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date,
    required: true
  },
  usedAt: Date,
  orderId: String,
  issuedReason: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

couponSchema.methods.isValid = function() {
  const now = new Date();
  return this.status === 'available' && 
         now >= this.validFrom && 
         now <= this.validUntil;
};

couponSchema.methods.calculateDiscount = function(orderAmount) {
  if (!this.isValid() || orderAmount < this.minPurchase) {
    return 0;
  }
  if (this.type === 'fixed') {
    return Math.min(this.value, orderAmount);
  } else {
    return orderAmount * (1 - this.value / 100);
  }
};

couponSchema.index({ userId: 1, status: 1 });
couponSchema.index({ validUntil: 1 });

module.exports = mongoose.model('Coupon', couponSchema);
