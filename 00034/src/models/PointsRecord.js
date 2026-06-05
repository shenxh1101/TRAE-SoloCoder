const mongoose = require('mongoose');

const pointsRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['earn', 'spend', 'expire', 'adjust'],
    required: true
  },
  points: {
    type: Number,
    required: true
  },
  remainingPoints: {
    type: Number,
    default: 0
  },
  balanceBefore: {
    type: Number,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  source: {
    type: String,
    enum: ['order', 'exchange', 'expire', 'admin', 'activity'],
    required: true
  },
  sourceId: String,
  description: String,
  expireAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

pointsRecordSchema.index({ userId: 1, createdAt: -1 });
pointsRecordSchema.index({ expireAt: 1, type: 1, remainingPoints: 1 });

module.exports = mongoose.model('PointsRecord', pointsRecordSchema);
