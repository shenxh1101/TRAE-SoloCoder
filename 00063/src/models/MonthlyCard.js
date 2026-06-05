const mongoose = require('mongoose');
const moment = require('moment');

const monthlyCardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  planType: {
    type: String,
    required: true,
    enum: ['basic', 'standard', 'premium', 'business']
  },
  planName: String,
  price: {
    type: Number,
    required: true
  },
  durationDays: {
    type: Number,
    required: true,
    default: 30
  },
  balance: {
    type: Number,
    default: 0
  },
  maxParkingHoursPerDay: {
    type: Number,
    default: 24
  },
  includedZones: [{
    type: String,
    enum: ['A', 'B', 'C', 'D', 'E']
  }],
  startTime: {
    type: Date,
    required: true
  },
  expireAt: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'expired', 'cancelled', 'suspended'],
    default: 'pending',
    index: true
  },
  applicationTime: {
    type: Date,
    default: Date.now
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  approvalNotes: String,
  totalUsageHours: {
    type: Number,
    default: 0
  },
  totalParkings: {
    type: Number,
    default: 0
  },
  lastUsedAt: Date,
  autoRenew: {
    type: Boolean,
    default: false
  },
  licensePlates: [{
    type: String
  }],
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

monthlyCardSchema.index({ userId: 1, status: 1 });
monthlyCardSchema.index({ expireAt: 1 });

monthlyCardSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

monthlyCardSchema.statics.PLANS = {
  basic: {
    name: '基础月卡',
    price: 300,
    durationDays: 30,
    maxParkingHoursPerDay: 12,
    zones: ['C', 'D', 'E'],
    description: '适合偶尔停车用户'
  },
  standard: {
    name: '标准月卡',
    price: 500,
    durationDays: 30,
    maxParkingHoursPerDay: 24,
    zones: ['B', 'C', 'D', 'E'],
    description: '适合日常通勤用户'
  },
  premium: {
    name: '尊享月卡',
    price: 800,
    durationDays: 30,
    maxParkingHoursPerDay: 24,
    zones: ['A', 'B', 'C', 'D', 'E'],
    description: '全区域通行，优先车位'
  },
  business: {
    name: '商务月卡',
    price: 1500,
    durationDays: 30,
    maxParkingHoursPerDay: 24,
    zones: ['A', 'B', 'C', 'D', 'E'],
    description: '多车辆绑定，专属服务'
  }
};

monthlyCardSchema.statics.recommendPlan = async function(userId) {
  const ParkingRecord = mongoose.model('ParkingRecord');
  const thirtyDaysAgo = moment().subtract(30, 'days').toDate();
  
  const records = await ParkingRecord.find({
    userId,
    entryTime: { $gte: thirtyDaysAgo },
    status: 'completed'
  });
  
  if (records.length === 0) {
    return {
      recommended: 'basic',
      plans: this.PLANS,
      reason: '暂无停车记录，推荐基础月卡'
    };
  }
  
  const totalParkings = records.length;
  const avgHoursPerParking = records.reduce((sum, r) => {
    const hours = (r.parkingDuration || 0) / 60;
    return sum + hours;
  }, 0) / totalParkings;
  
  const zoneCounts = {};
  for (const record of records) {
    if (record.spaceId) {
      const space = await mongoose.model('ParkingSpace').findById(record.spaceId);
      if (space) {
        zoneCounts[space.zone] = (zoneCounts[space.zone] || 0) + 1;
      }
    }
  }
  
  const primaryZone = Object.entries(zoneCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'C';
  
  let recommended = 'basic';
  let reason = '';
  
  if (totalParkings >= 20 && avgHoursPerParking >= 8) {
    recommended = 'premium';
    reason = '近30天停车20次以上，平均每次停车8小时以上，推荐尊享月卡';
  } else if (totalParkings >= 15 && avgHoursPerParking >= 4) {
    recommended = 'standard';
    reason = '近30天停车15次以上，平均每次停车4小时以上，推荐标准月卡';
  } else if (totalParkings >= 5) {
    recommended = 'basic';
    reason = '近30天停车5次以上，推荐基础月卡';
  } else {
    recommended = 'basic';
    reason = '停车频率较低，推荐基础月卡或按次停车';
  }
  
  return {
    recommended,
    plans: this.PLANS,
    reason,
    stats: {
      totalParkings,
      avgHoursPerParking: Math.round(avgHoursPerParking * 10) / 10,
      primaryZone,
      zoneCounts
    }
  };
};

monthlyCardSchema.methods.isValid = function() {
  return this.status === 'active' && new Date(this.expireAt) > new Date();
};

monthlyCardSchema.methods.canUseZone = function(zone) {
  return this.includedZones.includes(zone);
};

monthlyCardSchema.methods.deductUsage = function(hours) {
  this.totalUsageHours += hours;
  this.totalParkings += 1;
  this.lastUsedAt = new Date();
  return this.save();
};

monthlyCardSchema.methods.renew = function() {
  const plan = this.constructor.PLANS[this.planType];
  this.startTime = moment.max(moment(this.expireAt), moment()).toDate();
  this.expireAt = moment(this.startTime).add(plan.durationDays, 'days').toDate();
  this.status = 'active';
  return this.save();
};

module.exports = mongoose.model('MonthlyCard', monthlyCardSchema);
