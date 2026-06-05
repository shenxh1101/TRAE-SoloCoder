import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  roomNumber: {
    type: String,
    required: [true, '请输入房间号'],
    unique: true,
  },
  name: {
    type: String,
    required: [true, '请输入房间名称'],
  },
  type: {
    type: String,
    enum: ['economy', 'luxury'],
    required: true,
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'locked', 'maintenance'],
    default: 'available',
  },
  packageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Package',
  },
  capacity: {
    type: Number,
    default: 1,
  },
  features: {
    type: [String],
    default: [],
  },
  currentBookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
  },
  images: {
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
});

export default mongoose.model('Room', roomSchema);
