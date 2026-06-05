const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, '请输入职位名称'],
    trim: true
  },
  department: {
    type: String,
    required: [true, '请输入部门'],
    trim: true
  },
  hiringManagerId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  hiringManager: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  jobType: {
    type: String,
    enum: ['full_time', 'part_time', 'contract', 'internship'],
    default: 'full_time'
  },
  location: {
    type: String,
    required: [true, '请输入工作地点']
  },
  yearsOfExperience: {
    min: { type: Number, default: 0 },
    max: { type: Number, default: 99 }
  },
  educationLevel: {
    type: String,
    enum: ['高中', '专科', '本科', '硕士', '博士'],
    default: '本科'
  },
  requiredSkills: [{
    type: String,
    trim: true
  }],
  preferredSkills: [{
    type: String,
    trim: true
  }],
  salaryRange: {
    min: { type: Number },
    max: { type: Number }
  },
  salaryMin: { type: Number },
  salaryMax: { type: Number },
  budget: {
    type: Number,
    required: [true, '请输入年度预算']
  },
  description: {
    type: String,
    required: [true, '请输入职位描述']
  },
  requirements: {
    type: String,
    required: [true, '请输入任职要求']
  },
  benefits: [{
    type: String
  }],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['draft', 'open', 'paused', 'closed', 'cancelled'],
    default: 'draft'
  },
  headCount: {
    type: Number,
    default: 1
  },
  filledCount: {
    type: Number,
    default: 0
  },
  publishDate: {
    type: Date
  },
  closeDate: {
    type: Date
  },
  channel: [{
    type: String
  }],
  level: {
    type: String
  },
  recruiters: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User'
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

jobSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

jobSchema.virtual('candidates', {
  ref: 'JobCandidate',
  localField: '_id',
  foreignField: 'jobId',
  justOne: false
});

module.exports = mongoose.model('Job', jobSchema);
