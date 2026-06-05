import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
  },
  type: {
    type: String,
    enum: ['update_overdue', 'check_in', 'check_out', 'payment_due'],
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  hours: {
    type: Number,
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'dismissed'],
    default: 'pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Reminder', reminderSchema);
