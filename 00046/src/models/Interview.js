const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
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
  round: {
    type: Number,
    required: true,
    min: 1
  },
  type: {
    type: String,
    enum: ['phone', 'video', 'onsite', 'online_assessment'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  interviewers: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  }],
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  location: {
    type: String
  },
  meetingLink: {
    type: String
  },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled'],
    default: 'scheduled'
  },
  candidateConfirmation: {
    status: { type: String, enum: ['pending', 'confirmed', 'declined'], default: 'pending' },
    confirmedAt: { type: Date },
    notes: { type: String }
  },
  timeLockExpiresAt: {
    type: Date
  },
  isTimeLocked: {
    type: Boolean,
    default: false
  },
  reminders: [{
    sentAt: { type: Date },
    type: { type: String },
    recipient: { type: String }
  }],
  feedbackRequestSent: {
    type: Boolean,
    default: false
  },
  feedbackRequestSentAt: {
    type: Date
  },
  allEvaluationsSubmitted: {
    type: Boolean,
    default: false
  },
  result: {
    type: String,
    enum: ['pass', 'fail', 'pending', 're-review'],
    default: 'pending'
  },
  overallScore: {
    type: Number,
    min: 0,
    max: 100
  },
  needsReReview: {
    type: Boolean,
    default: false
  },
  reReviewReason: {
    type: String
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

interviewSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

interviewSchema.index({ interviewers: 1, startTime: 1, endTime: 1 });
interviewSchema.index({ candidateId: 1, startTime: 1, endTime: 1 });

module.exports = mongoose.model('Interview', interviewSchema);
