const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNo: {
    type: String,
    unique: true,
    default: () => 'ORD' + Date.now() + Math.random().toString(36).substr(2, 6).toUpperCase()
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  pointsEarned: {
    type: Number,
    default: 0
  },
  couponId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon'
  },
  couponDiscount: {
    type: Number,
    default: 0
  },
  finalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'completed', 'cancelled'],
    default: 'pending'
  },
  items: [{
    name: String,
    price: Number,
    quantity: Number
  }],
  paidAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: 1 });

module.exports = mongoose.model('Order', orderSchema);
