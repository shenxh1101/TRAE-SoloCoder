const mongoose = require('mongoose');

const parkingSpaceSchema = new mongoose.Schema({
  spaceNumber: {
    type: String,
    required: [true, '请输入车位编号'],
    unique: true
  },
  zone: {
    type: String,
    required: [true, '请输入所属区域'],
    enum: ['A', 'B', 'C', 'D', 'E']
  },
  type: {
    type: String,
    required: [true, '请输入车位类型'],
    enum: ['compact', 'standard', 'large', 'disabled']
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'reserved', 'maintenance'],
    default: 'available'
  },
  floor: {
    type: Number,
    default: 1
  },
  currentVehicle: String,
  currentReservation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation'
  },
  sensorId: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

parkingSpaceSchema.virtual('activeReservations', {
  ref: 'Reservation',
  localField: '_id',
  foreignField: 'spaceId',
  match: { 
    status: { $in: ['pending', 'confirmed', 'locked'] },
    endTime: { $gt: new Date() }
  },
  justOne: false
});

parkingSpaceSchema.index({ zone: 1, status: 1 });
parkingSpaceSchema.index({ type: 1, status: 1 });

parkingSpaceSchema.statics.getAvailableSpaces = function(zone, type) {
  const query = { status: 'available' };
  if (zone) query.zone = zone;
  if (type) query.type = type;
  return this.find(query);
};

parkingSpaceSchema.methods.isAvailableAt = async function(startTime, endTime, excludeReservationId = null) {
  const Reservation = mongoose.model('Reservation');
  const conflicts = await Reservation.find({
    spaceId: this._id,
    status: { $in: ['pending', 'confirmed', 'locked'] },
    _id: { $ne: excludeReservationId },
    $or: [
      { startTime: { $lt: endTime, $gte: startTime } },
      { endTime: { $gt: startTime, $lte: endTime } },
      { startTime: { $lte: startTime }, endTime: { $gte: endTime } }
    ]
  });
  return conflicts.length === 0;
};

module.exports = mongoose.model('ParkingSpace', parkingSpaceSchema);
