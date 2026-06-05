import mongoose from 'mongoose';

const bookingUpdateSchema = new mongoose.Schema({
  caregiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Caregiver',
  },
  type: {
    type: String,
    enum: ['photo', 'video'],
    required: true,
  },
  mediaUrls: {
    type: [String],
    default: [],
  },
  videoUrl: {
    type: String,
  },
  note: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  senderName: {
    type: String,
    required: true,
  },
  senderRole: {
    type: String,
    enum: ['user', 'caregiver', 'admin'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const bookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  petId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet',
    required: true,
  },
  packageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Package',
    required: true,
  },
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
  },
  caregiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Caregiver',
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'],
    default: 'pending',
  },
  deposit: {
    type: Number,
    required: true,
  },
  totalPrice: {
    type: Number,
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending',
  },
  specialInstructions: {
    type: String,
    default: '',
  },
  updates: [bookingUpdateSchema],
  messages: [messageSchema],
  review: {
    rating: Number,
    content: String,
    createdAt: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

bookingSchema.methods.getDays = function () {
  const diffTime = Math.abs(new Date(this.endDate) - new Date(this.startDate));
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

bookingSchema.methods.hoursSinceLastUpdate = function () {
  if (this.updates.length === 0) {
    return Math.floor((Date.now() - new Date(this.startDate).getTime()) / (1000 * 60 * 60));
  }
  const lastUpdate = this.updates[this.updates.length - 1].createdAt;
  return Math.floor((Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60));
};

export default mongoose.model('Booking', bookingSchema);
