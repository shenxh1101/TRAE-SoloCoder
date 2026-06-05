const mongoose = require('mongoose');
const moment = require('moment');

const reservationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  spaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ParkingSpace',
    required: true
  },
  licensePlate: {
    type: String,
    required: [true, '请输入车牌号']
  },
  vehicleType: {
    type: String,
    required: true,
    enum: ['compact', 'standard', 'large']
  },
  startTime: {
    type: Date,
    required: [true, '请输入开始时间']
  },
  endTime: {
    type: Date,
    required: [true, '请输入结束时间']
  },
  durationHours: {
    type: Number,
    required: true
  },
  calculatedFee: {
    type: Number,
    required: true
  },
  actualFee: {
    type: Number
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'locked', 'checked_in', 'completed', 'cancelled', 'no_show'],
    default: 'pending'
  },
  lockExpiresAt: Date,
  checkedInAt: Date,
  checkedOutAt: Date,
  isMonthlyCardUsed: {
    type: Boolean,
    default: false
  },
  cancellationReason: String,
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

reservationSchema.index({ spaceId: 1, startTime: 1, endTime: 1 });
reservationSchema.index({ userId: 1, status: 1 });
reservationSchema.index({ status: 1, createdAt: -1 });

reservationSchema.virtual('parkingSpace', {
  ref: 'ParkingSpace',
  localField: 'spaceId',
  foreignField: '_id',
  justOne: true
});

reservationSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

reservationSchema.statics.calculateFee = function(vehicleType, startTime, endTime) {
  const rates = {
    compact: { base: 5, hourly: 3, maxDaily: 50 },
    standard: { base: 8, hourly: 5, maxDaily: 80 },
    large: { base: 12, hourly: 8, maxDaily: 120 }
  };

  const rate = rates[vehicleType] || rates.standard;
  const duration = moment(endTime).diff(moment(startTime), 'hours', true);
  const roundedHours = Math.ceil(duration);
  
  let fee = rate.base;
  if (roundedHours > 1) {
    fee += (roundedHours - 1) * rate.hourly;
  }
  
  const days = Math.floor(duration / 24);
  const maxFee = Math.max(days * rate.maxDaily, rate.maxDaily);
  
  return Math.min(fee, maxFee);
};

reservationSchema.statics.findConflictReservations = async function(spaceId, startTime, endTime, excludeId = null) {
  const query = {
    spaceId,
    status: { $in: ['pending', 'confirmed', 'locked', 'checked_in'] },
    $or: [
      { startTime: { $lt: endTime, $gte: startTime } },
      { endTime: { $gt: startTime, $lte: endTime } },
      { startTime: { $lte: startTime }, endTime: { $gte: endTime } }
    ]
  };
  
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  
  return this.find(query).populate('spaceId');
};

reservationSchema.statics.findAvailableSlots = async function(spaceId, date, durationHours = 2) {
  const startOfDay = moment(date).startOf('day').toDate();
  const endOfDay = moment(date).endOf('day').toDate();
  
  const reservations = await this.find({
    spaceId,
    status: { $in: ['pending', 'confirmed', 'locked', 'checked_in'] },
    startTime: { $lt: endOfDay },
    endTime: { $gt: startOfDay }
  }).sort('startTime');
  
  const availableSlots = [];
  let currentTime = moment(startOfDay);
  
  for (const resv of reservations) {
    const resvStart = moment(resv.startTime);
    const gapMinutes = resvStart.diff(currentTime, 'minutes');
    
    if (gapMinutes >= durationHours * 60) {
      availableSlots.push({
        startTime: currentTime.toDate(),
        endTime: resvStart.toDate(),
        durationMinutes: gapMinutes
      });
    }
    currentTime = moment.max(currentTime, moment(resv.endTime));
  }
  
  const endGap = moment(endOfDay).diff(currentTime, 'minutes');
  if (endGap >= durationHours * 60) {
    availableSlots.push({
      startTime: currentTime.toDate(),
      endTime: endOfDay,
      durationMinutes: endGap
    });
  }
  
  return availableSlots;
};

module.exports = mongoose.model('Reservation', reservationSchema);
