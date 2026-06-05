const mongoose = require('mongoose');

const jobCandidateSchema = new mongoose.Schema({
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
  resumeId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Resume'
  },
  status: {
    type: String,
    enum: [
      'applied', 'screening', 'screened', 'phone_screen', 'phone_screen_passed',
      'phone_screen_failed', 'interview_scheduled', 'interview_in_progress',
      'interview_completed', 'interview_passed', 'interview_failed',
      'offer_preparing', 'offer_sent', 'offer_accepted', 'offer_rejected',
      'offer_negotiating', 'background_check', 'background_check_passed',
      'background_check_failed', 'hired', 'rejected', 'withdrawn'
    ],
    default: 'applied'
  },
  statusHistory: [{
    status: { type: String, required: true },
    changedBy: { type: mongoose.Schema.ObjectId, ref: 'User' },
    changedAt: { type: Date, default: Date.now },
    remarks: { type: String }
  }],
  matchScore: {
    type: Number,
    min: 0,
    max: 100
  },
  matchBreakdown: {
    skills: { type: Number, min: 0, max: 100 },
    experience: { type: Number, min: 0, max: 100 },
    education: { type: Number, min: 0, max: 100 },
    location: { type: Number, min: 0, max: 100 }
  },
  hrRatings: {
    overall: { type: Number, min: 0, max: 10 },
    communication: { type: Number, min: 0, max: 10 },
    experience: { type: Number, min: 0, max: 10 },
    cultureFit: { type: Number, min: 0, max: 10 }
  },
  hrRemarks: {
    type: String
  },
  finalScore: {
    type: Number,
    min: 0,
    max: 100
  },
  ranking: {
    type: Number
  },
  isShortlisted: {
    type: Boolean,
    default: false
  },
  shortlistedAt: {
    type: Date
  },
  appliedDate: {
    type: Date,
    default: Date.now
  },
  source: {
    type: String
  },
  notes: [{
    content: { type: String },
    createdBy: { type: mongoose.Schema.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

jobCandidateSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

jobCandidateSchema.index({ jobId: 1, candidateId: 1 }, { unique: true });

module.exports = mongoose.model('JobCandidate', jobCandidateSchema);
