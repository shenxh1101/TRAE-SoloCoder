const JobCandidate = require('../models/JobCandidate');
const Job = require('../models/Job');
const { AppError } = require('../middleware/errorHandler');
const { calculateTotalScore } = require('../utils/matchingAlgorithm');

const calculateFinalScore = (matchScore, hrRatings, historicalData = {}) => {
  const hrOverall = hrRatings?.overall || 0;
  const hrCommunication = hrRatings?.communication || 0;
  const hrExperience = hrRatings?.experience || 0;
  const hrCultureFit = hrRatings?.cultureFit || 0;

  const hrAverage = hrOverall ? hrOverall * 10 :
    (hrCommunication + hrExperience + hrCultureFit) / 3 * 10;

  const historicalWeight = historicalData.successRate || 0;
  const matchWeight = 0.4;
  const hrWeight = 0.4;
  const historicalWeightFactor = 0.2;

  const finalScore =
    (matchScore || 0) * matchWeight +
    (hrAverage || 0) * hrWeight +
    (historicalWeight || 0) * historicalWeightFactor;

  return Math.min(100, Math.max(0, Math.round(finalScore * 100) / 100));
};

const calculateHistoricalSuccessRate = (candidateId) => {
  return 80;
};

exports.rateCandidate = async (req, res, next) => {
  try {
    const { jobCandidateId } = req.params;
    const { hrRatings, hrRemarks, isShortlisted } = req.body;

    const jobCandidate = await JobCandidate.findById(jobCandidateId)
      .populate('jobId')
      .populate('candidateId');

    if (!jobCandidate) {
      return next(new AppError('候选记录不存在', 404));
    }

    if (hrRatings) {
      jobCandidate.hrRatings = {
        ...jobCandidate.hrRatings,
        ...hrRatings
      };
    }

    if (hrRemarks) {
      jobCandidate.hrRemarks = hrRemarks;
    }

    if (isShortlisted !== undefined) {
      jobCandidate.isShortlisted = isShortlisted;
      if (isShortlisted) {
        jobCandidate.shortlistedAt = Date.now();
        jobCandidate.status = 'screened';
      }
    }

    const historicalSuccessRate = calculateHistoricalSuccessRate(jobCandidate.candidateId);

    let autoMatchScore = jobCandidate.matchScore;
    let matchBreakdown = jobCandidate.matchBreakdown;

    if (jobCandidate.jobId && jobCandidate.candidateId) {
      autoMatchScore = calculateTotalScore({
        skillMatch: matchBreakdown?.skills || 0,
        experienceMatch: matchBreakdown?.experience || 0,
        educationMatch: matchBreakdown?.education || 0,
        locationMatch: matchBreakdown?.location || 0
      });
      jobCandidate.matchScore = autoMatchScore;
    }

    const finalScore = calculateFinalScore(
      autoMatchScore,
      jobCandidate.hrRatings,
      { successRate: historicalSuccessRate }
    );

    jobCandidate.finalScore = finalScore;

    if (jobCandidate.status === 'applied') {
      jobCandidate.status = 'screening';
    }

    jobCandidate.statusHistory.push({
      status: jobCandidate.status,
      changedBy: req.user.id,
      remarks: 'HR评分'
    });

    await jobCandidate.save();

    res.status(200).json({
      success: true,
      data: {
        jobCandidate,
        scoreBreakdown: {
          autoMatchScore,
          hrScore: hrRatings,
          historicalSuccessRate,
          finalScore,
          matchBreakdown
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.rankCandidates = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { threshold = 0 } = req.query;

    const job = await Job.findById(jobId);
    if (!job) {
      return next(new AppError('职位不存在', 404));
    }

    const candidates = await JobCandidate.find({
      jobId,
      status: { $nin: ['rejected', 'withdrawn'] },
      finalScore: { $gte: parseFloat(threshold) }
    })
      .populate('candidateId', 'name email phone yearsOfExperience highestDegree currentEmployer currentPosition skills')
      .sort({ finalScore: -1, matchScore: -1 });

    const rankedCandidates = candidates.map((candidate, index) => ({
      ...candidate.toObject(),
      ranking: index + 1
    }));

    const bulkOps = rankedCandidates.map(c => ({
      updateOne: {
        filter: { _id: c._id },
        update: { ranking: c.ranking }
      }
    }));

    if (bulkOps.length > 0) {
      await JobCandidate.bulkWrite(bulkOps);
    }

    res.status(200).json({
      success: true,
      total: rankedCandidates.length,
      data: rankedCandidates
    });
  } catch (error) {
    next(error);
  }
};

exports.getCandidateScreeningDetails = async (req, res, next) => {
  try {
    const { jobCandidateId } = req.params;

    const jobCandidate = await JobCandidate.findById(jobCandidateId)
      .populate('jobId')
      .populate('candidateId');

    if (!jobCandidate) {
      return next(new AppError('候选记录不存在', 404));
    }

    const historicalSuccessRate = calculateHistoricalSuccessRate(jobCandidate.candidateId);

    const finalScore = calculateFinalScore(
      jobCandidate.matchScore,
      jobCandidate.hrRatings,
      { successRate: historicalSuccessRate }
    );

    res.status(200).json({
      success: true,
      data: {
        jobCandidate,
        scoreAnalysis: {
          autoMatchScore: jobCandidate.matchScore,
          autoMatchBreakdown: jobCandidate.matchBreakdown,
          hrRatings: jobCandidate.hrRatings,
          historicalSuccessRate,
          finalScore,
          recommendedAction: finalScore >= 80 ? '强烈推荐面试' :
            finalScore >= 70 ? '推荐面试' :
              finalScore >= 60 ? '考虑面试' : '不推荐'
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.updateCandidateStatus = async (req, res, next) => {
  try {
    const { jobCandidateId } = req.params;
    const { status, remarks } = req.body;

    const validStatuses = [
      'applied', 'screening', 'screened', 'phone_screen', 'phone_screen_passed',
      'phone_screen_failed', 'interview_scheduled', 'interview_in_progress',
      'interview_completed', 'interview_passed', 'interview_failed',
      'offer_preparing', 'offer_sent', 'offer_accepted', 'offer_rejected',
      'offer_negotiating', 'background_check', 'background_check_passed',
      'background_check_failed', 'hired', 'rejected', 'withdrawn'
    ];

    if (!validStatuses.includes(status)) {
      return next(new AppError('无效的状态值', 400));
    }

    const jobCandidate = await JobCandidate.findById(jobCandidateId);
    if (!jobCandidate) {
      return next(new AppError('候选记录不存在', 404));
    }

    jobCandidate.status = status;
    jobCandidate.statusHistory.push({
      status,
      changedBy: req.user.id,
      changedAt: Date.now(),
      remarks
    });

    await jobCandidate.save();

    res.status(200).json({
      success: true,
      message: '状态更新成功',
      data: jobCandidate
    });
  } catch (error) {
    next(error);
  }
};

exports.addNote = async (req, res, next) => {
  try {
    const { jobCandidateId } = req.params;
    const { content } = req.body;

    if (!content || content.trim() === '') {
      return next(new AppError('备注内容不能为空', 400));
    }

    const jobCandidate = await JobCandidate.findById(jobCandidateId);
    if (!jobCandidate) {
      return next(new AppError('候选记录不存在', 404));
    }

    jobCandidate.notes.push({
      content,
      createdBy: req.user.id,
      createdAt: Date.now()
    });

    await jobCandidate.save();

    res.status(200).json({
      success: true,
      message: '备注添加成功',
      data: jobCandidate.notes[jobCandidate.notes.length - 1]
    });
  } catch (error) {
    next(error);
  }
};

exports.batchUpdateStatus = async (req, res, next) => {
  try {
    const { candidateIds, status, remarks } = req.body;

    if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
      return next(new AppError('请选择要更新的候选人', 400));
    }

    const result = await JobCandidate.updateMany(
      { _id: { $in: candidateIds } },
      {
        $set: { status },
        $push: {
          statusHistory: {
            status,
            changedBy: req.user.id,
            changedAt: Date.now(),
            remarks
          }
        }
      }
    );

    res.status(200).json({
      success: true,
      message: `已更新 ${result.modifiedCount} 条记录`,
      data: { modifiedCount: result.modifiedCount }
    });
  } catch (error) {
    next(error);
  }
};

exports.advanceToPhoneScreen = async (req, res, next) => {
  try {
    const { jobCandidateId } = req.params;

    const jobCandidate = await JobCandidate.findById(jobCandidateId)
      .populate('candidateId');

    if (!jobCandidate) {
      return next(new AppError('候选记录不存在', 404));
    }

    if (!jobCandidate.finalScore || jobCandidate.finalScore < 50) {
      return next(new AppError('候选人评分不足，请先完成评分', 400));
    }

    jobCandidate.status = 'phone_screen';
    jobCandidate.statusHistory.push({
      status: 'phone_screen',
      changedBy: req.user.id,
      remarks: '进入电话面试阶段'
    });

    await jobCandidate.save();

    res.status(200).json({
      success: true,
      message: '已进入电话面试阶段',
      data: jobCandidate
    });
  } catch (error) {
    next(error);
  }
};

exports.getScreeningStats = async (req, res, next) => {
  try {
    const { jobId } = req.query;

    const matchQuery = jobId ? { jobId } : {};

    const stats = await JobCandidate.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgScore: { $avg: '$finalScore' }
        }
      }
    ]);

    const total = await JobCandidate.countDocuments(matchQuery);
    const shortlisted = await JobCandidate.countDocuments({ ...matchQuery, isShortlisted: true });

    const scoreDistribution = await JobCandidate.aggregate([
      { $match: matchQuery },
      {
        $bucket: {
          groupBy: '$finalScore',
          boundaries: [0, 50, 60, 70, 80, 90, 101],
          default: 'unrated',
          output: { count: { $sum: 1 } }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        total,
        shortlisted,
        statusStats: stats,
        scoreDistribution,
        shortlistRate: total > 0 ? ((shortlisted / total) * 100).toFixed(1) + '%' : '0%'
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.candidatesRanking = async (req, res, next) => {
  try {
    const { jobId, department, threshold = 0, page = 1, limit = 20 } = req.query;

    const matchQuery = {
      status: { $nin: ['rejected', 'withdrawn'] }
    };

    if (jobId) matchQuery.jobId = jobId;

    if (department) {
      const jobs = await Job.find({ department });
      matchQuery.jobId = { $in: jobs.map(j => j._id) };
    }

    if (parseFloat(threshold) > 0) {
      matchQuery.finalScore = { $gte: parseFloat(threshold) };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const candidates = await JobCandidate.find(matchQuery)
      .populate('candidateId', 'name email phone yearsOfExperience highestDegree currentEmployer currentPosition skills')
      .populate('jobId', 'title department')
      .sort({ finalScore: -1, matchScore: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await JobCandidate.countDocuments(matchQuery);

    const rankedCandidates = candidates.map((candidate, index) => ({
      ...candidate.toObject(),
      ranking: skip + index + 1
    }));

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: rankedCandidates
    });
  } catch (error) {
    next(error);
  }
};
