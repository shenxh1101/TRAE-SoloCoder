import mongoose from 'mongoose';

const packageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, '请输入套餐名称'],
    trim: true,
  },
  type: {
    type: String,
    enum: ['economy', 'luxury'],
    required: true,
  },
  description: {
    type: String,
    required: [true, '请输入套餐描述'],
  },
  pricePerDay: {
    type: Number,
    required: [true, '请输入每日价格'],
    min: 0,
  },
  features: {
    type: [String],
    default: [],
  },
  roomIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
  }],
  suitableFor: {
    maxAge: Number,
    minAge: Number,
    maxWeight: Number,
    allergies: [String],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Package', packageSchema);
