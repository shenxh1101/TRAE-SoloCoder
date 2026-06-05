const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
  candidateId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Candidate',
    required: true
  },
  candidateName: {
    type: String,
    required: true
  },
  summary: {
    type: String
  },
  education: [{
    school: { type: String, required: true },
    degree: { type: String, required: true },
    major: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    gpa: { type: Number },
    achievements: [{ type: String }]
  }],
  workExperience: [{
    company: { type: String, required: true },
    position: { type: String, required: true },
    startDate: { type: Date },
    endDate: { type: Date },
    isCurrent: { type: Boolean, default: false },
    salary: { type: Number },
    responsibilities: { type: String },
    achievements: [{ type: String }]
  }],
  projects: [{
    name: { type: String, required: true },
    role: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    description: { type: String },
    technologies: [{ type: String }],
    achievements: [{ type: String }]
  }],
  skills: [{
    type: String
  }],
  languages: [{
    name: { type: String },
    proficiency: { type: String }
  }],
  certifications: [{
    name: { type: String },
    issuer: { type: String },
    date: { type: Date }
  }],
  references: [{
    name: { type: String },
    title: { type: String },
    company: { type: String },
    contact: { type: String }
  }],
  fileUrl: {
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

resumeSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Resume', resumeSchema);
