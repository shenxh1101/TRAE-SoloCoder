const mongoose = require('mongoose');
const moment = require('moment');

const operationReportSchema = new mongoose.Schema({
  reportDate: {
    type: Date,
    required: true,
    unique: true
  },
  reportType: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: 'daily'
  },
  zoneStats: [{
    zone: String,
    totalSpaces: Number,
    occupiedSpaces: Number,
    utilizationRate: Number,
    revenue: Number
  }],
  totalSpaces: {
    type: Number,
    required: true
  },
  totalParkings: {
    type: Number,
    default: 0
  },
  totalRevenue: {
    type: Number,
    default: 0
  },
  averageUtilizationRate: {
    type: Number,
    default: 0
  },
  peakHours: [{
    hour: Number,
    occupancy: Number
  }],
  peakHour: Number,
  peakOccupancy: Number,
  violationCount: {
    type: Number,
    default: 0
  },
  violationTypes: [{
    type: { type: String },
    count: Number
  }],
  monthlyCardUsage: {
    totalUses: Number,
    revenue: Number
  },
  reservationStats: {
    totalReservations: Number,
    completedReservations: Number,
    cancelledReservations: Number,
    noShowReservations: Number
  },
  newUsers: {
    type: Number,
    default: 0
  },
  newMonthlyCards: {
    type: Number,
    default: 0
  },
  hourlyStats: [{
    hour: Number,
    entries: Number,
    exits: Number,
    revenue: Number
  }],
  generatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

operationReportSchema.index({ reportDate: -1, reportType: 1 });

operationReportSchema.statics.generateDailyReport = async function(date = new Date()) {
  const startOfDay = moment(date).startOf('day').toDate();
  const endOfDay = moment(date).endOf('day').toDate();
  
  const ParkingSpace = mongoose.model('ParkingSpace');
  const ParkingRecord = mongoose.model('ParkingRecord');
  const Reservation = mongoose.model('Reservation');
  const ViolationRecord = mongoose.model('ViolationRecord');
  const User = mongoose.model('User');
  const MonthlyCard = mongoose.model('MonthlyCard');
  
  const allSpaces = await ParkingSpace.find();
  const zones = ['A', 'B', 'C', 'D', 'E'];
  const zoneStats = [];
  
  for (const zone of zones) {
    const zoneSpaces = allSpaces.filter(s => s.zone === zone);
    const totalSpaces = zoneSpaces.length;
    if (totalSpaces === 0) continue;
    
    const zoneRecords = await ParkingRecord.find({
      entryTime: { $gte: startOfDay, $lte: endOfDay }
    }).populate('spaceId');
    
    const zoneRecordsFiltered = zoneRecords.filter(r => r.spaceId?.zone === zone);
    const occupiedSpaces = zoneRecordsFiltered.length;
    const utilizationRate = totalSpaces > 0 ? (occupiedSpaces / totalSpaces) * 100 : 0;
    const revenue = zoneRecordsFiltered.reduce((sum, r) => sum + (r.totalFee || 0), 0);
    
    zoneStats.push({
      zone,
      totalSpaces,
      occupiedSpaces,
      utilizationRate: Math.round(utilizationRate * 100) / 100,
      revenue
    });
  }
  
  const records = await ParkingRecord.find({
    entryTime: { $gte: startOfDay, $lte: endOfDay }
  });
  
  const totalRevenue = records.reduce((sum, r) => sum + (r.totalFee || 0), 0);
  const totalParkings = records.length;
  const avgUtilization = zoneStats.length > 0 
    ? zoneStats.reduce((sum, z) => sum + z.utilizationRate, 0) / zoneStats.length 
    : 0;
  
  const hourlyStats = [];
  for (let hour = 0; hour < 24; hour++) {
    const hourStart = moment(date).hour(hour).startOf('hour').toDate();
    const hourEnd = moment(date).hour(hour).endOf('hour').toDate();
    
    const entries = records.filter(r => 
      moment(r.entryTime).isBetween(hourStart, hourEnd, null, '[]')
    ).length;
    
    const exits = records.filter(r => 
      r.exitTime && moment(r.exitTime).isBetween(hourStart, hourEnd, null, '[]')
    ).length;
    
    const hourlyRevenue = records
      .filter(r => r.paymentTime && moment(r.paymentTime).isBetween(hourStart, hourEnd, null, '[]'))
      .reduce((sum, r) => sum + (r.totalFee || 0), 0);
    
    hourlyStats.push({ hour, entries, exits, revenue: hourlyRevenue });
  }
  
  const peakHours = hourlyStats
    .sort((a, b) => b.entries - a.entries)
    .slice(0, 5)
    .map(h => ({ hour: h.hour, occupancy: h.entries }));
  
  const peakHour = peakHours[0]?.hour || 0;
  const peakOccupancy = peakHours[0]?.occupancy || 0;
  
  const violations = await ViolationRecord.find({
    detectedAt: { $gte: startOfDay, $lte: endOfDay }
  });
  
  const violationTypes = [];
  const typeCounts = {};
  for (const v of violations) {
    typeCounts[v.type] = (typeCounts[v.type] || 0) + 1;
  }
  for (const [type, count] of Object.entries(typeCounts)) {
    violationTypes.push({ type, count });
  }
  
  const reservations = await Reservation.find({
    createdAt: { $gte: startOfDay, $lte: endOfDay }
  });
  
  const monthlyCardRecords = records.filter(r => r.isMonthlyCard);
  const newUsers = await User.countDocuments({
    createdAt: { $gte: startOfDay, $lte: endOfDay }
  });
  
  const newCards = await MonthlyCard.countDocuments({
    applicationTime: { $gte: startOfDay, $lte: endOfDay },
    status: 'active'
  });
  
  const report = new this({
    reportDate: startOfDay,
    reportType: 'daily',
    zoneStats,
    totalSpaces: allSpaces.length,
    totalParkings,
    totalRevenue,
    averageUtilizationRate: Math.round(avgUtilization * 100) / 100,
    peakHours,
    peakHour,
    peakOccupancy,
    violationCount: violations.length,
    violationTypes,
    monthlyCardUsage: {
      totalUses: monthlyCardRecords.length,
      revenue: monthlyCardRecords.reduce((sum, r) => sum + (r.totalFee || 0), 0)
    },
    reservationStats: {
      totalReservations: reservations.length,
      completedReservations: reservations.filter(r => r.status === 'completed').length,
      cancelledReservations: reservations.filter(r => r.status === 'cancelled').length,
      noShowReservations: reservations.filter(r => r.status === 'no_show').length
    },
    newUsers,
    newMonthlyCards: newCards,
    hourlyStats,
    generatedAt: new Date()
  });
  
  await report.save();
  return report;
};

operationReportSchema.statics.generateWeeklyReport = async function(date = new Date()) {
  const startOfWeek = moment(date).startOf('week').toDate();
  const endOfWeek = moment(date).endOf('week').toDate();
  
  const dailyReports = await this.find({
    reportDate: { $gte: startOfWeek, $lte: endOfWeek },
    reportType: 'daily'
  });
  
  if (dailyReports.length === 0) {
    return null;
  }
  
  const zoneStatsMap = {};
  for (const report of dailyReports) {
    for (const zone of report.zoneStats) {
      if (!zoneStatsMap[zone.zone]) {
        zoneStatsMap[zone.zone] = { ...zone, totalSpaces: zone.totalSpaces };
      } else {
        zoneStatsMap[zone.zone].occupiedSpaces += zone.occupiedSpaces;
        zoneStatsMap[zone.zone].revenue += zone.revenue;
      }
    }
  }
  
  const zoneStats = Object.values(zoneStatsMap).map(z => ({
    ...z,
    utilizationRate: Math.round((z.occupiedSpaces / (z.totalSpaces * dailyReports.length)) * 10000) / 100
  }));
  
  const hourlyStatsMap = {};
  for (const report of dailyReports) {
    for (const hour of report.hourlyStats) {
      if (!hourlyStatsMap[hour.hour]) {
        hourlyStatsMap[hour.hour] = { hour: hour.hour, entries: 0, exits: 0, revenue: 0 };
      }
      hourlyStatsMap[hour.hour].entries += hour.entries;
      hourlyStatsMap[hour.hour].exits += hour.exits;
      hourlyStatsMap[hour.hour].revenue += hour.revenue;
    }
  }
  
  const hourlyStats = Object.values(hourlyStatsMap);
  const peakHours = hourlyStats
    .sort((a, b) => b.entries - a.entries)
    .slice(0, 5)
    .map(h => ({ hour: h.hour, occupancy: h.entries }));
  
  const report = new this({
    reportDate: startOfWeek,
    reportType: 'weekly',
    zoneStats,
    totalSpaces: dailyReports[0].totalSpaces,
    totalParkings: dailyReports.reduce((sum, r) => sum + r.totalParkings, 0),
    totalRevenue: dailyReports.reduce((sum, r) => sum + r.totalRevenue, 0),
    averageUtilizationRate: Math.round(
      dailyReports.reduce((sum, r) => sum + r.averageUtilizationRate, 0) / dailyReports.length * 100
    ) / 100,
    peakHours,
    peakHour: peakHours[0]?.hour || 0,
    peakOccupancy: peakHours[0]?.occupancy || 0,
    violationCount: dailyReports.reduce((sum, r) => sum + r.violationCount, 0),
    reservationStats: {
      totalReservations: dailyReports.reduce((sum, r) => sum + r.reservationStats.totalReservations, 0),
      completedReservations: dailyReports.reduce((sum, r) => sum + r.reservationStats.completedReservations, 0),
      cancelledReservations: dailyReports.reduce((sum, r) => sum + r.reservationStats.cancelledReservations, 0),
      noShowReservations: dailyReports.reduce((sum, r) => sum + r.reservationStats.noShowReservations, 0)
    },
    newUsers: dailyReports.reduce((sum, r) => sum + r.newUsers, 0),
    newMonthlyCards: dailyReports.reduce((sum, r) => sum + r.newMonthlyCards, 0),
    hourlyStats,
    generatedAt: new Date()
  });
  
  await report.save();
  return report;
};

operationReportSchema.statics.getReports = function(type = 'daily', startDate, endDate) {
  const query = { reportType: type };
  if (startDate && endDate) {
    query.reportDate = { $gte: startDate, $lte: endDate };
  }
  return this.find(query).sort({ reportDate: -1 });
};

module.exports = mongoose.model('OperationReport', operationReportSchema);
