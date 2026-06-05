const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Job',
    required: true
  },
  candidateId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Candidate',
    required: true
  },
  jobCandidateId: {
    type: mongoose.Schema.ObjectId,
    ref: 'JobCandidate',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  level: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  baseSalary: {
    type: Number,
    required: true
  },
  annualBonus: {
    type: Number,
    default: 0
  },
  stockOptions: {
    type: Number,
    default: 0
  },
  signingBonus: {
    type: Number,
    default: 0
  },
  relocationAllowance: {
    type: Number,
    default: 0
  },
  otherBenefits: [{
    name: { type: String },
    value: { type: String }
  }],
  totalCompensation: {
    type: Number,
    required: true
  },
  compensationBreakdown: {
    base: { type: Number },
    bonus: { type: Number },
    stock: { type: Number },
    other: { type: Number }
  },
  startDate: {
    type: Date,
    required: true
  },
  probationPeriod: {
    type: Number,
    default: 3
  },
  workLocation: {
    type: String
  },
  workType: {
    type: String,
    enum: ['onsite', 'remote', 'hybrid'],
    default: 'onsite'
  },
  reportTo: {
    type: String
  },
  status: {
    type: String,
    enum: ['draft', 'pending_approval', 'approved', 'sent', 'accepted', 'rejected', 'negotiating', 'cancelled', 'expired'],
    default: 'draft'
  },
  approvalWorkflow: [{
    approverId: { type: mongoose.Schema.ObjectId, ref: 'User' },
    approverName: { type: String },
    approverRole: { type: String },
    status: { type: String, enum: ['pending', 'approved', 'rejected'] },
    approvalDate: { type: Date },
    comments: { type: String }
  }],
  requiresApproval: {
    type: Boolean,
    default: false
  },
  approvalReason: {
    type: String
  },
  approvedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  sentAt: {
    type: Date
  },
  respondedAt: {
    type: Date
  },
  response: {
    type: String,
    enum: ['accepted', 'rejected', 'negotiating']
  },
  rejectionReason: {
    type: String
  },
  negotiationDetails: {
    counterOffer: Object,
    requestedChanges: String,
    status: { type: String, enum: ['pending', 'approved', 'rejected'] }
  },
  expiresAt: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  budgetCheck: {
    withinBudget: Boolean,
    budgetAmount: Number,
    difference: Number,
    percentageOver: Number
  },
  marketComparison: {
    marketMedian: Number,
    percentile: String,
    analysis: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

offerSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Offer', offerSchema);
