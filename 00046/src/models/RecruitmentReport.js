const mongoose = require('mongoose');

const recruitmentReportSchema = new mongoose.Schema({
  reportType: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'custom'],
    required: true
  },
  period: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true }
  },
  summary: {
    totalResumes: { type: Number, default: 0 },
    totalJobs: { type: Number, default: 0 },
    totalHires: { type: Number, default: 0 },
    overallConversionRate: { type: Number, default: 0 }
  },
  funnelData: [{
    stage: { type: String },
    count: { type: Number },
    conversionRate: { type: Number }
  }],
  byJob: [{
    jobId: { type: mongoose.Schema.ObjectId, ref: 'Job' },
    jobTitle: { type: String },
    department: { type: String },
    totalResumes: { type: Number, default: 0 },
    screeningPassRate: { type: Number, default: 0 },
    interviewAttendanceRate: { type: Number, default: 0 },
    offerAcceptanceRate: { type: Number, default: 0 },
    hires: { type: Number, default: 0 }
  }],
  byDepartment: [{
    department: { type: String },
    totalResumes: { type: Number, default: 0 },
    hires: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 }
  }],
  byChannel: [{
    channel: { type: String },
    totalResumes: { type: Number, default: 0 },
    hires: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    costPerHire: { type: Number, default: 0 }
  }],
  metrics: {
    timeToHire: {
      average: { type: Number },
      median: { type: Number }
    },
    interviewToHireRatio: { type: Number },
    offerToAcceptanceRatio: { type: Number }
  },
  generatedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  exportedCount: {
    type: Number,
    default: 0
  },
  lastExportedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

recruitmentReportSchema.index({ 'period.startDate': 1, 'period.endDate': 1, reportType: 1 });

module.exports = mongoose.model('RecruitmentReport', recruitmentReportSchema);
