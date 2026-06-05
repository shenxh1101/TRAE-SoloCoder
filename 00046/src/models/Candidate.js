const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  dateOfBirth: { type: Date },
  location: { type: String },
  currentCity: { type: String },
  avatar: { type: String },
  highestDegree: { type: String },
  yearsOfExperience: { type: Number, default: 0 },
  currentEmployer: { type: String },
  currentPosition: { type: String },
  currentSalary: { type: Number },
  expectedSalaryMin: { type: Number },
  expectedSalaryMax: { type: Number },
  skills: [{ type: String }],
  skillTags: [{ type: String }],
  industry: { type: String },
  domain: { type: String },
  noticePeriod: { type: String },
  availabilityDate: { type: Date },
  linkedinUrl: { type: String },
  portfolioUrl: { type: String },
  githubUrl: { type: String },
  personalWebsite: { type: String },
  summary: { type: String },
  selfIntroduction: { type: String },
  careerObjective: { type: String },
  resumes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Resume' }],
  hasResume: { type: Boolean, default: false },
  resumeFile: { type: String },
  source: { type: String },
  sourceChannel: { type: String },
  sourceCampaign: { type: String },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  applicationStatus: {
    type: String,
    enum: ['active', 'inactive', 'hired', 'rejected'],
    default: 'active'
  },
  tagIds: [{ type: String }],
  tags: [{ type: String }],
  isBlacklisted: { type: Boolean, default: false },
  blacklistReason: { type: String },
  doNotContact: { type: Boolean, default: false },
  notes: { type: String },
  internalNotes: [{
    content: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }],
  availableSlots: [{
    startTime: { type: Date },
    endTime: { type: Date }
  }],
  lastActiveAt: { type: Date },
  lastContactedAt: { type: Date },
  deleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

candidateSchema.index({ email: 1 });
candidateSchema.index({ name: 1 });
candidateSchema.index({ phone: 1 });
candidateSchema.index({ skills: 1 });

module.exports = mongoose.model('Candidate', candidateSchema);
