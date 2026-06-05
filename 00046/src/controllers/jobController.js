const Job = require('../models/Job');
const Resume = require('../models/Resume');
const JobMatch = require('../models/JobMatch');
const JobCandidate = require('../models/JobCandidate');
const { AppError } = require('../middleware/errorHandler');
const { matchCandidatesToJob } = require('../utils/matchingAlgorithm');
const { validateBudget } = require('../utils/budgetValidator');
const { sendEmail } = require('../utils/emailService');

exports.createJob = async (req, res, next) => {
  try {
    const jobData = req.body;
    jobData.hiringManager = req.user.id;

    const budgetValidation = validateBudget(jobData);

    if (!budgetValidation.isValid) {
      return next(new AppError(`预算校验失败: ${budgetValidation.issues.join('; ')}`, 400));
    }

    const job = await Job.create(jobData);

    res.status(201).json({
      success: true,
      data: job,
      budgetValidation: {
        isValid: budgetValidation.isValid,
        warnings: budgetValidation.warnings,
        salaryHealth: budgetValidation.salaryHealth
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.publishJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return next(new AppError('职位不存在', 404));
    }

    if (job.hiringManager && job.hiringManager.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('无权发布此职位', 403));
    }

    const budgetValidation = validateBudget(job.toObject());
    if (!budgetValidation.isValid) {
      return next(new AppError(`预算校验失败: ${budgetValidation.issues.join('; ')}`, 400));
    }

    job.status = 'open';
    job.publishDate = Date.now();
    await job.save();

    const candidates = await require('../models/Candidate').find({}).populate('resumes');
    const candidateData = candidates.map(c => ({
      ...c.toObject(),
      skills: c.skills,
      yearsOfExperience: c.yearsOfExperience,
      highestDegree: c.highestDegree,
      location: c.location
    }));

    const matches = matchCandidatesToJob(job.toObject(), candidateData, 60);

    const matchDocuments = matches.map(match => ({
      jobId: job._id,
      candidateId: match.candidateId._id,
      candidateName: match.candidateId.name,
      totalScore: match.totalScore,
      breakdown: match.breakdown,
      matchLevel: match.matchLevel,
      matchingKeywords: job.requiredSkills.filter(skill => match.breakdown.skills > 50).slice(0, 10)
    }));

    if (matchDocuments.length > 0) {
      await JobMatch.insertMany(matchDocuments);
    }

    res.status(200).json({
      success: true,
      data: job,
      matchCount: matchDocuments.length,
      topMatches: matches.slice(0, 10),
      budgetValidation
    });
  } catch (error) {
    next(error);
  }
};

exports.matchCandidates = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return next(new AppError('职位不存在', 404));
    }

    const { threshold = 60, limit = 50 } = req.query;

    const candidates = await require('../models/Candidate').find({}).populate('resumes');
    const candidateData = candidates.map(c => ({
      ...c.toObject(),
      skills: c.skills,
      yearsOfExperience: c.yearsOfExperience,
      highestDegree: c.highestDegree,
      location: c.location
    }));

    const matches = matchCandidatesToJob(
      job.toObject(),
      candidateData,
      parseInt(threshold)
    );

    res.status(200).json({
      success: true,
      total: matches.length,
      data: matches.slice(0, parseInt(limit))
    });
  } catch (error) {
    next(error);
  }
};

exports.getJobMatches = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { matchLevel, minScore, page = 1, limit = 20, sortBy = 'totalScore', sortOrder = 'desc' } = req.query;

    const query = { jobId };
    if (matchLevel) query.matchLevel = matchLevel;
    if (minScore) query.totalScore = { $gte: parseFloat(minScore) };

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const matches = await JobMatch.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('candidateId', 'name email phone yearsOfExperience highestDegree currentEmployer currentPosition');

    const total = await JobMatch.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: matches
    });
  } catch (error) {
    next(error);
  }
};

exports.validateJobBudget = async (req, res, next) => {
  try {
    const jobData = req.body;
    const validation = validateBudget(jobData);

    res.status(200).json({
      success: true,
      data: validation
    });
  } catch (error) {
    next(error);
  }
};

exports.getJobs = async (req, res, next) => {
  try {
    const { status, department, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (department) query.department = department;

    if (req.user.role === 'hiring_manager') {
      query.hiringManager = req.user.id;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const jobs = await Job.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('hiringManager', 'name email');

    const total = await Job.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: jobs
    });
  } catch (error) {
    next(error);
  }
};

exports.getJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('hiringManager', 'name email');

    if (!job) {
      return next(new AppError('职位不存在', 404));
    }

    const budgetValidation = validateBudget(job.toObject());

    res.status(200).json({
      success: true,
      data: job,
      budgetValidation
    });
  } catch (error) {
    next(error);
  }
};

exports.updateJob = async (req, res, next) => {
  try {
    let job = await Job.findById(req.params.id);
    if (!job) {
      return next(new AppError('职位不存在', 404));
    }

    if (job.hiringManager && job.hiringManager.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('无权编辑此职位', 403));
    }

    const budgetValidation = validateBudget(req.body);
    if (!budgetValidation.isValid) {
      return next(new AppError(`预算校验失败: ${budgetValidation.issues.join('; ')}`, 400));
    }

    job = await Job.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: job,
      budgetValidation
    });
  } catch (error) {
    next(error);
  }
};

exports.shortlistCandidate = async (req, res, next) => {
  try {
    const { jobId, matchId } = req.params;

    const match = await JobMatch.findById(matchId);
    if (!match) {
      return next(new AppError('匹配记录不存在', 404));
    }

    match.reviewStatus = 'shortlisted';
    match.reviewedBy = req.user.id;
    match.reviewedAt = Date.now();
    await match.save();

    let jobCandidate = await JobCandidate.findOne({ jobId, candidateId: match.candidateId });
    if (!jobCandidate) {
      jobCandidate = await JobCandidate.create({
        jobId,
        candidateId: match.candidateId,
        status: 'screened',
        matchScore: match.totalScore,
        matchBreakdown: match.breakdown,
        isShortlisted: true,
        shortlistedAt: Date.now(),
        source: 'system_recommendation'
      });
    } else {
      jobCandidate.isShortlisted = true;
      jobCandidate.shortlistedAt = Date.now();
      jobCandidate.matchScore = match.totalScore;
      jobCandidate.matchBreakdown = match.breakdown;
      await jobCandidate.save();
    }

    const candidate = await require('../models/Candidate').findById(match.candidateId);
    if (candidate && candidate.email) {
      try {
        await sendEmail({
          email: candidate.email,
          subject: `您已进入 ${jobId} 职位面试流程`,
          message: `恭喜您！您的简历已通过筛选，我们将尽快与您联系安排面试。`
        });
      } catch (emailError) {
        console.error('发送通知邮件失败:', emailError);
      }
    }

    res.status(200).json({
      success: true,
      message: '候选人已加入候选列表',
      data: { match, jobCandidate }
    });
  } catch (error) {
    next(error);
  }
};
