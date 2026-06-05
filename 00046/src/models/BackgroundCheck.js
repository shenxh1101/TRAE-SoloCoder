const mongoose = require('mongoose');

const backgroundCheckSchema = new mongoose.Schema({
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
  jobCandidateId: {
    type: mongoose.Schema.ObjectId,
    ref: 'JobCandidate',
    required: true
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  checks: [{
    checkType: {
      type: String,
      enum: [
        'identity_verification',
        'education_verification',
        'employment_history',
        'reference_check',
        'criminal_record',
        'credit_check',
        'professional_license',
        'drug_test',
        'social_media',
        'address_verification'
      ],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'failed'],
      default: 'pending'
    },
    result: {
      type: String,
      enum: ['pass', 'fail', 'alert', 'pending', 'not_applicable']
    },
    findings: {
      type: String
    },
    notes: {
      type: String
    },
    assignedTo: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    assignedToName: {
      type: String
    },
    assignedAt: {
      type: Date
    },
    startedAt: {
      type: Date
    },
    completedAt: {
      type: Date
    },
    hasException: {
      type: Boolean,
      default: false
    },
    exceptionDetails: {
      type: String
    },
    documents: [{
      name: { type: String },
      url: { type: String },
      uploadedAt: { type: Date, default: Date.now }
    }]
  }],
  overallStatus: {
    type: String,
    enum: ['pending', 'in_progress', 'requires_review', 'completed'],
    default: 'pending'
  },
  overallResult: {
    type: String,
    enum: ['pending', 'clear', 'conditional', 'fail']
  },
  hasException: {
    type: Boolean,
    default: false
  },
  exceptionTypes: [{
    type: String
  }],
  exceptionDescription: {
    type: String
  },
  notifiedHrAt: {
    type: Date
  },
  reviewedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  reviewNotes: {
    type: String
  },
  finalDecision: {
    type: String,
    enum: ['approve', 'reject', 'escalate']
  },
  finalDecisionBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  finalDecisionAt: {
    type: Date
  },
  completedAt: {
    type: Date
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

backgroundCheckSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('BackgroundCheck', backgroundCheckSchema);
