const mongoose = require('mongoose');

const giftSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  pointsRequired: {
    type: Number,
    required: true,
    min: 0
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  category: String,
  imageUrl: String,
  status: {
    type: String,
    enum: ['active', 'inactive', 'sold_out'],
    default: 'active'
  },
  exchangeCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

giftSchema.methods.isAvailable = function() {
  return this.status === 'active' && this.stock > 0;
};

giftSchema.methods.decreaseStock = function(quantity = 1) {
  if (this.stock < quantity) {
    throw new Error('库存不足');
  }
  this.stock -= quantity;
  this.exchangeCount += quantity;
  if (this.stock === 0) {
    this.status = 'sold_out';
  }
  return this.save();
};

giftSchema.index({ category: 1, pointsRequired: 1 });

module.exports = mongoose.model('Gift', giftSchema);
