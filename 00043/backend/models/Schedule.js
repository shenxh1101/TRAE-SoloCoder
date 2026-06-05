import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema({
  caregiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Caregiver',
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  shift: {
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'full'],
    required: true,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  assignedBookings: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
  }],
  notes: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

scheduleSchema.index({ caregiverId: 1, date: 1, shift: 1 }, { unique: true });

export default mongoose.model('Schedule', scheduleSchema);
