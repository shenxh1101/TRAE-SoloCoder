const mongoose = require('mongoose');

const interviewEvaluationSchema = new mongoose.Schema({
  interviewId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Interview',
    required: true
  },
  interviewerId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  interviewerName: {
    type: String,
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
  ratings: {
    technicalSkills: { type: Number, required: true, min: 0, max: 10 },
    problemSolving: { type: Number, required: true, min: 0, max: 10 },
    communication: { type: Number, required: true, min: 0, max: 10 },
    leadership: { type: Number, min: 0, max: 10 },
    cultureFit: { type: Number, required: true, min: 0, max: 10 },
    motivation: { type: Number, min: 0, max: 10 }
  },
  overallScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  recommendation: {
    type: String,
    enum: ['strong_hire', 'hire', 'no_hire', 'strong_no_hire', 'undecided'],
    required: true
  },
  strengths: [{
    type: String
  }],
  weaknesses: [{
    type: String
  }],
  keyQuestions: [{
    question: { type: String },
    answer: { type: String },
    score: { type: Number, min: 0, max: 10 }
  }],
  notes: {
    type: String
  },
  followUpQuestions: [{
    type: String
  }],
  submittedAt: {
    type: Date,
    default: Date.now
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  lastEditedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

interviewEvaluationSchema.index({ interviewId: 1, interviewerId: 1 }, { unique: true });
interviewEvaluationSchema.index({ candidateId: 1, createdAt: -1 });

module.exports = mongoose.model('InterviewEvaluation', interviewEvaluationSchema);
