import mongoose from 'mongoose';

const vaccineRecordSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  nextDate: {
    type: String,
  },
});

const petSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: [true, '请输入宠物名称'],
    trim: true,
  },
  breed: {
    type: String,
    required: [true, '请输入品种'],
    trim: true,
  },
  age: {
    type: Number,
    required: [true, '请输入年龄'],
    min: 0,
  },
  weight: {
    type: Number,
    required: [true, '请输入体重'],
    min: 0,
  },
  gender: {
    type: String,
    enum: ['male', 'female'],
  },
  avatar: {
    type: String,
    default: '',
  },
  vaccineRecords: [vaccineRecordSchema],
  allergies: {
    type: [String],
    default: [],
  },
  notes: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

petSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Pet', petSchema);
