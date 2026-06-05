const mongoose = require('mongoose');

const jobMatchSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Job',
    required: true
  },
  resumeId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Resume'
  },
  candidateId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Candidate',
    required: true
  },
  candidateName: {
    type: String,
    required: true
  },
  totalScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  breakdown: {
    skills: { type: Number, min: 0, max: 100 },
    experience: { type: Number, min: 0, max: 100 },
    education: { type: Number, min: 0, max: 100 },
    location: { type: Number, min: 0, max: 100 }
  },
  matchLevel: {
    type: String,
    enum: ['优秀匹配', '良好匹配', '基本匹配', '不匹配']
  },
  matchingKeywords: [{
    type: String
  }],
  reviewStatus: {
    type: String,
    enum: ['pending', 'viewed', 'shortlisted', 'rejected'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  notes: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

jobMatchSchema.index({ jobId: 1, totalScore: -1 });
jobMatchSchema.index({ jobId: 1, candidateId: 1 }, { unique: true });

module.exports = mongoose.model('JobMatch', jobMatchSchema);
