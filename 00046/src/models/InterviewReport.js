const mongoose = require('mongoose');

const interviewReportSchema = new mongoose.Schema({
  interviewId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Interview',
    required: true
  },
  candidateId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Candidate',
    required: true
  },
  jobId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Job',
    required: true
  },
  evaluations: [{
    type: mongoose.Schema.ObjectId,
    ref: 'InterviewEvaluation'
  }],
  overallScore: {
    type: Number,
    min: 0,
    max: 100
  },
  overallRecommendation: {
    type: String,
    enum: ['strong_hire', 'hire', 'no_hire', 'strong_no_hire', 'needs_review']
  },
  statistics: {
    mean: { type: Number },
    median: { type: Number },
    stdDev: { type: Number },
    min: { type: Number },
    max: { type: Number },
    range: { type: Number }
  },
  dimensionAnalysis: {
    technicalSkills: { mean: Number, stdDev: Number, hasDisagreement: Boolean },
    communication: { mean: Number, stdDev: Number, hasDisagreement: Boolean },
    problemSolving: { mean: Number, stdDev: Number, hasDisagreement: Boolean },
    teamwork: { mean: Number, stdDev: Number, hasDisagreement: Boolean },
    culturalFit: { mean: Number, stdDev: Number, hasDisagreement: Boolean }
  },
  hasSignificantDisagreement: {
    type: Boolean,
    default: false
  },
  disagreementDetails: {
    overallStdDev: Number,
    dimensionAnalysis: Object
  },
  reReviewTriggered: {
    type: Boolean,
    default: false
  },
  reReviewReason: {
    type: String
  },
  reReviewAssignedTo: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  summary: {
    type: String
  },
  strengths: [{
    type: String
  }],
  weaknesses: [{
    type: String
  }],
  finalDecision: {
    type: String,
    enum: ['pass', 'fail', 're-review', 'pending']
  },
  decisionMaker: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  decisionMadeAt: {
    type: Date
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

interviewReportSchema.index({ interviewId: 1 }, { unique: true });

module.exports = mongoose.model('InterviewReport', interviewReportSchema);
