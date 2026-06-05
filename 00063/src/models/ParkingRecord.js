const mongoose = require('mongoose');
const moment = require('moment');

const parkingRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  spaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ParkingSpace'
  },
  reservationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation'
  },
  licensePlate: {
    type: String,
    required: [true, '车牌号不能为空'],
    index: true
  },
  vehicleType: {
    type: String,
    enum: ['compact', 'standard', 'large'],
    default: 'standard'
  },
  entryTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  exitTime: Date,
  entryGate: String,
  exitGate: String,
  entryImage: String,
  exitImage: String,
  status: {
    type: String,
    enum: ['parking', 'completed', 'locked'],
    default: 'parking'
  },
  isMonthlyCard: {
    type: Boolean,
    default: false
  },
  monthlyCardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MonthlyCard'
  },
  baseFee: {
    type: Number,
    default: 0
  },
  overtimeFee: {
    type: Number,
    default: 0
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  totalFee: {
    type: Number,
    default: 0
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'wechat', 'alipay', 'monthly_card', 'unpaid']
  },
  paymentTime: Date,
  isReservationMatched: {
    type: Boolean,
    default: false
  },
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

parkingRecordSchema.index({ licensePlate: 1, status: 1 });
parkingRecordSchema.index({ entryTime: -1 });
parkingRecordSchema.index({ userId: 1, entryTime: -1 });

parkingRecordSchema.virtual('parkingDuration').get(function() {
  if (!this.exitTime) return null;
  return moment(this.exitTime).diff(moment(this.entryTime), 'minutes');
});

parkingRecordSchema.statics.calculateParkingFee = function(vehicleType, entryTime, exitTime, reservation = null) {
  const rates = {
    compact: { firstHour: 5, hourly: 3, maxDaily: 50, freeMinutes: 30 },
    standard: { firstHour: 8, hourly: 5, maxDaily: 80, freeMinutes: 30 },
    large: { firstHour: 12, hourly: 8, maxDaily: 120, freeMinutes: 30 }
  };

  const rate = rates[vehicleType] || rates.standard;
  const durationMinutes = moment(exitTime).diff(moment(entryTime), 'minutes');
  
  if (durationMinutes <= rate.freeMinutes) {
    return { baseFee: 0, overtimeFee: 0, totalFee: 0, durationMinutes };
  }
  
  const billableMinutes = durationMinutes - rate.freeMinutes;
  const billableHours = Math.ceil(billableMinutes / 60);
  
  let baseFee = 0;
  if (billableHours > 0) {
    baseFee = rate.firstHour;
    if (billableHours > 1) {
      baseFee += (billableHours - 1) * rate.hourly;
    }
  }
  
  const days = Math.floor(durationMinutes / 1440);
  const maxFee = Math.max(days * rate.maxDaily, rate.maxDaily);
  baseFee = Math.min(baseFee, maxFee);
  
  let overtimeFee = 0;
  if (reservation && moment(exitTime).isAfter(moment(reservation.endTime))) {
    const overtimeMinutes = moment(exitTime).diff(moment(reservation.endTime), 'minutes');
    const overtimeHours = Math.ceil(overtimeMinutes / 60);
    overtimeFee = overtimeHours * rate.hourly * 1.5;
  }
  
  return {
    baseFee: Math.round(baseFee * 100) / 100,
    overtimeFee: Math.round(overtimeFee * 100) / 100,
    totalFee: Math.round((baseFee + overtimeFee) * 100) / 100,
    durationMinutes
  };
};

parkingRecordSchema.statics.getActiveParkingByPlate = function(licensePlate) {
  return this.findOne({
    licensePlate,
    status: { $in: ['parking', 'locked'] }
  }).populate('userId').populate('spaceId').populate('reservationId');
};

parkingRecordSchema.statics.getUserParkingHistory = function(userId, limit = 50) {
  return this.find({ userId })
    .sort({ entryTime: -1 })
    .limit(limit)
    .populate('spaceId');
};

parkingRecordSchema.statics.getParkingStats = async function(startDate, endDate) {
  const records = await this.find({
    entryTime: { $gte: startDate, $lte: endDate },
    status: 'completed'
  });
  
  const totalRevenue = records.reduce((sum, r) => sum + (r.totalFee || 0), 0);
  const totalParkings = records.length;
  const avgDuration = totalParkings > 0 
    ? records.reduce((sum, r) => sum + (r.parkingDuration || 0), 0) / totalParkings 
    : 0;
  
  return { totalRevenue, totalParkings, avgDuration };
};

module.exports = mongoose.model('ParkingRecord', parkingRecordSchema);
