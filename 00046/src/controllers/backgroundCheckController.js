const BackgroundCheck = require('../models/BackgroundCheck');
const JobCandidate = require('../models/JobCandidate');
const Candidate = require('../models/Candidate');
const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');
const { sendEmail } = require('../utils/emailService');

const determineRiskLevel = (positionLevel, positionType) => {
  const riskLevels = {
    'P5': 'low',
    'P6': 'low',
    'P7': 'medium',
    'P8': 'medium',
    'P9': 'high',
    'P10': 'critical',
    'director': 'high',
    'vp': 'critical',
    'c-level': 'critical'
  };

  const baseRisk = riskLevels[positionLevel] || 'low';

  if (positionType === 'finance' || positionType === 'security') {
    if (baseRisk === 'low') return 'medium';
    if (baseRisk === 'medium') return 'high';
  }

  return baseRisk;
};

const getRequiredCheckItems = (riskLevel) => {
  const checkItems = {
    low: ['identity_verification', 'education_verification'],
    medium: ['identity_verification', 'education_verification', 'employment_history'],
    high: ['identity_verification', 'education_verification', 'employment_history', 'criminal_record', 'credit_check'],
    critical: ['identity_verification', 'education_verification', 'employment_history', 'criminal_record', 'credit_check', 'professional_license', 'reference_check']
  };

  return checkItems[riskLevel] || checkItems.low;
};

exports.initiateBackgroundCheck = async (req, res, next) => {
  try {
    const { jobCandidateId } = req.params;
    const { assignTo, priority, dueDate, checkType } = req.body;

    const jobCandidate = await JobCandidate.findById(jobCandidateId)
      .populate('candidateId')
      .populate('jobId');

    if (!jobCandidate) {
      return next(new AppError('候选记录不存在', 404));
    }

    if (jobCandidate.status !== 'offer_accepted') {
      return next(new AppError('只有接受Offer的候选人才能启动背景调查', 400));
    }

    const existingCheck = await BackgroundCheck.findOne({ jobCandidateId, status: { $ne: 'cancelled' } });
    if (existingCheck) {
      return next(new AppError('该候选人已有进行中的背景调查', 400));
    }

    const candidate = jobCandidate.candidateId;
    const job = jobCandidate.jobId;

    const riskLevel = determineRiskLevel(job.level, job.department);
    const requiredItems = getRequiredCheckItems(riskLevel);

    const items = requiredItems.map(item => ({
      type: item,
      status: 'pending',
      assignedTo: assignTo || null
    }));

    const backgroundCheck = await BackgroundCheck.create({
      jobCandidateId,
      candidateId: candidate._id,
      candidateName: candidate.name,
      jobId: job._id,
      jobTitle: job.title,
      riskLevel,
      priority: priority || 'standard',
      checkItems: items,
      overallStatus: 'pending',
      requestedBy: req.user.id,
      requestedAt: Date.now(),
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      assignedTo: assignTo || null
    });

    jobCandidate.status = 'background_check';
    jobCandidate.statusHistory.push({
      status: 'background_check',
      changedBy: req.user.id,
      remarks: '背景调查已启动'
    });
    await jobCandidate.save();

    if (assignTo) {
      const investigator = await User.findById(assignTo);
      if (investigator && investigator.email) {
        try {
          await sendEmail({
            email: investigator.email,
            subject: `背景调查任务 - ${candidate.name}`,
            message: `您好${investigator.name}，\n\n您有新的背景调查任务：\n候选人：${candidate.name}\n职位：${job.title}\n风险等级：${riskLevel}\n截止日期：${backgroundCheck.dueDate ? new Date(backgroundCheck.dueDate).toLocaleDateString() : '7天内'}`
          });
        } catch (emailError) {
          console.error('发送背景调查任务邮件失败:', emailError);
        }
      }
    }

    res.status(201).json({
      success: true,
      message: '背景调查已启动',
      data: backgroundCheck
    });
  } catch (error) {
    next(error);
  }
};

exports.updateCheckItem = async (req, res, next) => {
  try {
    const { checkId, itemId } = req.params;
    const { status, result, findings, evidenceUrl, completedBy, notes } = req.body;

    const backgroundCheck = await BackgroundCheck.findById(checkId);
    if (!backgroundCheck) {
      return next(new AppError('背景调查不存在', 404));
    }

    const item = backgroundCheck.checkItems.id(itemId);
    if (!item) {
      return next(new AppError('调查项不存在', 404));
    }

    item.status = status;
    item.result = result;
    item.findings = findings;
    item.evidenceUrl = evidenceUrl;
    item.completedBy = completedBy || req.user.id;
    item.completedAt = Date.now();
    item.notes = notes;

    const hasAnomalies = findings && (findings === 'issue' || findings === 'anomaly');
    if (hasAnomalies) {
      item.hasAnomaly = true;
      item.anomalyDetails = notes;
    }

    const allPending = backgroundCheck.checkItems.filter(i => i.status === 'pending').length;
    const allItems = backgroundCheck.checkItems.length;
    const completedItems = backgroundCheck.checkItems.filter(i => i.status === 'completed').length;
    const hasAnyAnomaly = backgroundCheck.checkItems.some(i => i.hasAnomaly);

    backgroundCheck.progress = Math.round((completedItems / allItems) * 100);

    if (allPending === 0) {
      backgroundCheck.overallStatus = hasAnyAnomaly ? 'flagged' : 'clear';
      backgroundCheck.completedAt = Date.now();
      backgroundCheck.result = hasAnyAnomaly ? 'conditional' : 'pass';
    } else if (completedItems > 0) {
      backgroundCheck.overallStatus = 'in_progress';
    }

    await backgroundCheck.save();

    if (allPending === 0) {
      const jobCandidate = await JobCandidate.findById(backgroundCheck.jobCandidateId);
      if (jobCandidate) {
        if (hasAnyAnomaly) {
          jobCandidate.status = 'background_check_flagged';
          jobCandidate.statusHistory.push({
            status: 'background_check_flagged',
            changedBy: req.user.id,
            remarks: '背景调查发现异常，需审核'
          });
        } else {
          jobCandidate.status = 'background_check_passed';
          jobCandidate.statusHistory.push({
            status: 'background_check_passed',
            changedBy: req.user.id,
            remarks: '背景调查通过'
          });
        }
        await jobCandidate.save();
      }
    }

    res.status(200).json({
      success: true,
      message: '调查项已更新',
      data: backgroundCheck
    });
  } catch (error) {
    next(error);
  }
};

exports.assignInvestigator = async (req, res, next) => {
  try {
    const { checkId } = req.params;
    const { investigatorId, itemId } = req.body;

    const backgroundCheck = await BackgroundCheck.findById(checkId);
    if (!backgroundCheck) {
      return next(new AppError('背景调查不存在', 404));
    }

    if (itemId) {
      const item = backgroundCheck.checkItems.id(itemId);
      if (!item) {
        return next(new AppError('调查项不存在', 404));
      }
      item.assignedTo = investigatorId;
    } else {
      backgroundCheck.assignedTo = investigatorId;
      backgroundCheck.checkItems.forEach(item => {
        if (!item.assignedTo) {
          item.assignedTo = investigatorId;
        }
      });
    }

    backgroundCheck.assignedAt = Date.now();
    await backgroundCheck.save();

    res.status(200).json({
      success: true,
      message: '调查员已分配',
      data: backgroundCheck
    });
  } catch (error) {
    next(error);
  }
};

exports.submitReport = async (req, res, next) => {
  try {
    const { checkId } = req.params;
    const { overallResult, summary, recommendations, attachments } = req.body;

    const backgroundCheck = await BackgroundCheck.findById(checkId);
    if (!backgroundCheck) {
      return next(new AppError('背景调查不存在', 404));
    }

    if (backgroundCheck.checkItems.some(i => i.status === 'pending')) {
      return next(new AppError('还有未完成的调查项', 400));
    }

    backgroundCheck.overallStatus = overallResult === 'pass' ? 'clear' : 'flagged';
    backgroundCheck.result = overallResult;
    backgroundCheck.summary = summary;
    backgroundCheck.recommendations = recommendations;
    backgroundCheck.attachments = attachments;
    backgroundCheck.reportSubmittedAt = Date.now();
    backgroundCheck.reportSubmittedBy = req.user.id;

    await backgroundCheck.save();

    const jobCandidate = await JobCandidate.findById(backgroundCheck.jobCandidateId);
    if (jobCandidate) {
      if (overallResult === 'pass') {
        jobCandidate.status = 'hired';
        jobCandidate.statusHistory.push({
          status: 'hired',
          changedBy: req.user.id,
          remarks: '背景调查通过，已录用'
        });
      } else {
        jobCandidate.status = 'background_check_failed';
        jobCandidate.statusHistory.push({
          status: 'background_check_failed',
          changedBy: req.user.id,
          remarks: '背景调查不通过'
        });
      }
      await jobCandidate.save();
    }

    res.status(200).json({
      success: true,
      message: '背景调查报告已提交',
      data: backgroundCheck
    });
  } catch (error) {
    next(error);
  }
};

exports.approveBackgroundCheck = async (req, res, next) => {
  try {
    const { checkId } = req.params;
    const { approved, approvalNotes } = req.body;

    const backgroundCheck = await BackgroundCheck.findById(checkId);
    if (!backgroundCheck) {
      return next(new AppError('背景调查不存在', 404));
    }

    backgroundCheck.approved = approved;
    backgroundCheck.approvedBy = req.user.id;
    backgroundCheck.approvedAt = Date.now();
    backgroundCheck.approvalNotes = approvalNotes;

    if (approved) {
      backgroundCheck.overallStatus = 'approved';
    } else {
      backgroundCheck.overallStatus = 'rejected';
    }

    await backgroundCheck.save();

    const jobCandidate = await JobCandidate.findById(backgroundCheck.jobCandidateId);
    if (jobCandidate && approved) {
      jobCandidate.status = 'hired';
      jobCandidate.statusHistory.push({
        status: 'hired',
        changedBy: req.user.id,
        remarks: '背景调查审批通过，已录用'
      });
      await jobCandidate.save();
    }

    res.status(200).json({
      success: true,
      message: approved ? '背景调查已批准' : '背景调查已拒绝',
      data: backgroundCheck
    });
  } catch (error) {
    next(error);
  }
};

exports.cancelBackgroundCheck = async (req, res, next) => {
  try {
    const { checkId } = req.params;
    const { cancelReason } = req.body;

    const backgroundCheck = await BackgroundCheck.findById(checkId);
    if (!backgroundCheck) {
      return next(new AppError('背景调查不存在', 404));
    }

    backgroundCheck.overallStatus = 'cancelled';
    backgroundCheck.cancelledAt = Date.now();
    backgroundCheck.cancelledBy = req.user.id;
    backgroundCheck.cancelReason = cancelReason;

    await backgroundCheck.save();

    res.status(200).json({
      success: true,
      message: '背景调查已取消',
      data: backgroundCheck
    });
  } catch (error) {
    next(error);
  }
};

exports.getBackgroundCheck = async (req, res, next) => {
  try {
    const { checkId } = req.params;

    const backgroundCheck = await BackgroundCheck.findById(checkId)
      .populate('jobId', 'title department')
      .populate('candidateId', 'name email phone')
      .populate('assignedTo', 'name email role')
      .populate('requestedBy', 'name email');

    if (!backgroundCheck) {
      return next(new AppError('背景调查不存在', 404));
    }

    res.status(200).json({
      success: true,
      data: backgroundCheck
    });
  } catch (error) {
    next(error);
  }
};

exports.getBackgroundChecks = async (req, res, next) => {
  try {
    const { status, riskLevel, assignedTo, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status) query.overallStatus = status;
    if (riskLevel) query.riskLevel = riskLevel;
    if (assignedTo) query.assignedTo = assignedTo;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const backgroundChecks = await BackgroundCheck.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('jobId', 'title')
      .populate('candidateId', 'name email');

    const total = await BackgroundCheck.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: backgroundChecks
    });
  } catch (error) {
    next(error);
  }
};

exports.getMyBackgroundChecks = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = { assignedTo: req.user.id };

    if (status) query.overallStatus = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const backgroundChecks = await BackgroundCheck.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('jobId', 'title')
      .populate('candidateId', 'name email');

    const total = await BackgroundCheck.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: backgroundChecks
    });
  } catch (error) {
    next(error);
  }
};

exports.getStatistics = async (req, res, next) => {
  try {
    const stats = await BackgroundCheck.aggregate([
      {
        $group: {
          _id: '$overallStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    const riskStats = await BackgroundCheck.aggregate([
      {
        $group: {
          _id: '$riskLevel',
          count: { $sum: 1 }
        }
      }
    ]);

    const pendingCount = await BackgroundCheck.countDocuments({ overallStatus: 'pending' });
    const inProgressCount = await BackgroundCheck.countDocuments({ overallStatus: 'in_progress' });
    const flaggedCount = await BackgroundCheck.countDocuments({ overallStatus: 'flagged' });
    const clearCount = await BackgroundCheck.countDocuments({ overallStatus: 'clear' });
    const total = await BackgroundCheck.countDocuments({});

    res.status(200).json({
      success: true,
      data: {
        total,
        pending: pendingCount,
        inProgress: inProgressCount,
        flagged: flaggedCount,
        clear: clearCount,
        byStatus: stats,
        byRiskLevel: riskStats
      }
    });
  } catch (error) {
    next(error);
  }
};
