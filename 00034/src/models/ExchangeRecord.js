const mongoose = require('mongoose');

const exchangeRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  giftId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gift',
    required: true
  },
  giftName: String,
  pointsSpent: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending'
  },
  pointsRecordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PointsRecord'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

exchangeRecordSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('ExchangeRecord', exchangeRecordSchema);
