const moment = require('moment');
const Interview = require('../models/Interview');
const InterviewEvaluation = require('../models/InterviewEvaluation');
const InterviewReport = require('../models/InterviewReport');
const JobCandidate = require('../models/JobCandidate');
const User = require('../models/User');
const Candidate = require('../models/Candidate');
const { AppError } = require('../middleware/errorHandler');
const { checkTimeConflict, findAvailableSlots, suggestBestSlots } = require('../utils/scheduler');
const { sendEmail } = require('../utils/emailService');
const { getStatistics, calculateStandardDeviation } = require('../utils/statistics');

exports.getAvailableSlots = async (req, res, next) => {
  try {
    const { jobCandidateId } = req.params;
    const { interviewerIds, duration = 60 } = req.body;

    const jobCandidate = await JobCandidate.findById(jobCandidateId)
      .populate('candidateId')
      .populate('jobId');

    if (!jobCandidate) {
      return next(new AppError('候选记录不存在', 404));
    }

    const interviewers = await User.find({ _id: { $in: interviewerIds } });
    if (!interviewers || interviewers.length === 0) {
      return next(new AppError('未找到面试官', 404));
    }

    const interviewerSlots = [];
    interviewers.forEach(interviewer => {
      if (interviewer.availableSlots) {
        interviewerSlots.push(...interviewer.availableSlots);
      }
    });

    const candidateSlots = jobCandidate.candidateId?.availableSlots || [];

    const availableSlots = findAvailableSlots(
      interviewerSlots,
      candidateSlots,
      duration
    );

    const suggestedSlots = suggestBestSlots(availableSlots, 5);

    res.status(200).json({
      success: true,
      totalAvailable: availableSlots.length,
      suggested: suggestedSlots,
      allSlots: availableSlots.slice(0, 20)
    });
  } catch (error) {
    next(error);
  }
};

exports.scheduleInterview = async (req, res, next) => {
  try {
    const {
      jobCandidateId,
      interviewerIds,
      startTime,
      endTime,
      type,
      round,
      title,
      duration,
      location,
      meetingLink
    } = req.body;

    const jobCandidate = await JobCandidate.findById(jobCandidateId)
      .populate('candidateId')
      .populate('jobId');

    if (!jobCandidate) {
      return next(new AppError('候选记录不存在', 404));
    }

    for (const interviewerId of interviewerIds) {
      const existingInterviews = await Interview.find({
        interviewers: interviewerId,
        status: { $in: ['scheduled', 'confirmed', 'in_progress'] },
        startTime: { $lt: new Date(endTime) },
        endTime: { $gt: new Date(startTime) }
      });

      if (existingInterviews.length > 0) {
        return next(new AppError(`面试官 ${interviewerId} 时间冲突`, 400));
      }
    }

    const candidateExistingInterviews = await Interview.find({
      candidateId: jobCandidate.candidateId,
      status: { $in: ['scheduled', 'confirmed', 'in_progress'] },
      startTime: { $lt: new Date(endTime) },
      endTime: { $gt: new Date(startTime) }
    });

    if (candidateExistingInterviews.length > 0) {
      return next(new AppError('候选人时间冲突', 400));
    }

    const interview = await Interview.create({
      jobId: jobCandidate.jobId,
      candidateId: jobCandidate.candidateId,
      jobCandidateId,
      interviewers: interviewerIds,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      type,
      round,
      title: title || `${jobCandidate.jobId?.title} - 第${round}轮面试`,
      duration: duration || Math.round((new Date(endTime) - new Date(startTime)) / 60000),
      location,
      meetingLink,
      candidateConfirmation: { status: 'pending' }
    });

    jobCandidate.status = 'interview_scheduled';
    jobCandidate.statusHistory.push({
      status: 'interview_scheduled',
      changedBy: req.user.id,
      remarks: `面试已安排: ${moment(startTime).format('YYYY-MM-DD HH:mm')}`
    });
    await jobCandidate.save();

    const candidate = jobCandidate.candidateId;
    if (candidate && candidate.email) {
      try {
        await sendEmail({
          email: candidate.email,
          subject: `面试安排 - ${jobCandidate.jobId?.title}`,
          message: `您好${candidate.name}，\n\n您的面试已安排：\n\n职位：${jobCandidate.jobId?.title}\n时间：${moment(startTime).format('YYYY-MM-DD HH:mm')}\n类型：${type}\n地点：${location || meetingLink || '待通知'}\n\n请准时参加！`
        });
      } catch (emailError) {
        console.error('发送面试通知邮件失败:', emailError);
      }
    }

    res.status(201).json({
      success: true,
      data: interview
    });
  } catch (error) {
    next(error);
  }
};

exports.confirmInterview = async (req, res, next) => {
  try {
    const { interviewId } = req.params;
    const { confirm, candidateNote } = req.body;

    const interview = await Interview.findById(interviewId)
      .populate('candidateId')
      .populate('jobId');

    if (!interview) {
      return next(new AppError('面试不存在', 404));
    }

    interview.candidateConfirmation = {
      status: confirm ? 'confirmed' : 'declined',
      confirmedAt: Date.now(),
      notes: candidateNote
    };

    if (confirm) {
      interview.status = 'confirmed';
    } else {
      interview.status = 'cancelled';
    }

    await interview.save();

    res.status(200).json({
      success: true,
      message: confirm ? '面试已确认' : '面试已取消',
      data: interview
    });
  } catch (error) {
    next(error);
  }
};

exports.submitEvaluation = async (req, res, next) => {
  try {
    const { interviewId } = req.params;
    const {
      scores,
      overallScore,
      recommendation,
      strengths,
      weaknesses,
      notes
    } = req.body;

    const interview = await Interview.findById(interviewId);
    if (!interview) {
      return next(new AppError('面试不存在', 404));
    }

    const interviewer = await User.findById(req.user.id);
    if (!interviewer) {
      return next(new AppError('用户不存在', 404));
    }

    const evaluation = await InterviewEvaluation.create({
      interviewId,
      interviewerId: req.user.id,
      interviewerName: interviewer.name,
      candidateId: interview.candidateId,
      jobId: interview.jobId,
      ratings: scores,
      overallScore,
      recommendation,
      strengths,
      weaknesses,
      notes
    });

    const allEvaluations = await InterviewEvaluation.find({ interviewId });
    const totalInterviewers = interview.interviewers.length;

    if (allEvaluations.length >= totalInterviewers) {
      interview.allEvaluationsSubmitted = true;

      const allOverallScores = allEvaluations.map(e => e.overallScore);
      const overallStats = getStatistics(allOverallScores);

      interview.overallScore = overallStats.mean;

      if (overallStats.stdDev > 2) {
        interview.needsReReview = true;
        interview.reReviewReason = `评分标准差(${overallStats.stdDev.toFixed(2)})超过阈值2`;
        interview.result = 're-review';

        const report = await InterviewReport.findOneAndUpdate(
          { interviewId },
          {
            evaluations: allEvaluations.map(e => e._id),
            overallScore: overallStats.mean,
            statistics: overallStats,
            hasSignificantDisagreement: true,
            disagreementDetails: { overallStdDev: overallStats.stdDev },
            reReviewTriggered: true,
            reReviewReason: interview.reReviewReason
          },
          { upsert: true, new: true }
        );
      } else {
        interview.result = overallStats.mean >= 70 ? 'pass' : 'fail';
      }

      await interview.save();
    }

    res.status(201).json({
      success: true,
      data: evaluation
    });
  } catch (error) {
    next(error);
  }
};

exports.getInterviewReport = async (req, res, next) => {
  try {
    const { interviewId } = req.params;

    let report = await InterviewReport.findOne({ interviewId })
      .populate('evaluations')
      .populate('candidateId', 'name email')
      .populate('jobId', 'title');

    if (!report) {
      const evaluations = await InterviewEvaluation.find({ interviewId });
      const interview = await Interview.findById(interviewId);

      if (evaluations.length > 0) {
        const allOverallScores = evaluations.map(e => e.overallScore);
        const overallStats = getStatistics(allOverallScores);

        report = await InterviewReport.create({
          interviewId,
          candidateId: interview?.candidateId,
          jobId: interview?.jobId,
          evaluations: evaluations.map(e => e._id),
          overallScore: overallStats.mean,
          statistics: overallStats,
          hasSignificantDisagreement: overallStats.stdDev > 2
        });
      }
    }

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

exports.triggerReReview = async (req, res, next) => {
  try {
    const { reportId } = req.params;

    const report = await InterviewReport.findById(reportId);
    if (!report) {
      return next(new AppError('报告不存在', 404));
    }

    report.reReviewTriggered = true;
    await report.save();

    res.status(200).json({
      success: true,
      message: '复评流程已触发',
      data: report
    });
  } catch (error) {
    next(error);
  }
};

exports.updateInterviewStatus = async (req, res, next) => {
  try {
    const { interviewId } = req.params;
    const { status } = req.body;

    const interview = await Interview.findById(interviewId);
    if (!interview) {
      return next(new AppError('面试不存在', 404));
    }

    interview.status = status;
    await interview.save();

    res.status(200).json({
      success: true,
      data: interview
    });
  } catch (error) {
    next(error);
  }
};

exports.getInterviews = async (req, res, next) => {
  try {
    const { candidateId, jobId, status, page = 1, limit = 20 } = req.query;
    const query = {};

    if (candidateId) query.candidateId = candidateId;
    if (jobId) query.jobId = jobId;
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const interviews = await Interview.find(query)
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('candidateId', 'name email')
      .populate('jobId', 'title department')
      .populate('interviewers', 'name email');

    const total = await Interview.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: interviews
    });
  } catch (error) {
    next(error);
  }
};

exports.getInterview = async (req, res, next) => {
  try {
    const { interviewId } = req.params;

    const interview = await Interview.findById(interviewId)
      .populate('candidateId')
      .populate('jobId')
      .populate('interviewers', 'name email');

    if (!interview) {
      return next(new AppError('面试不存在', 404));
    }

    res.status(200).json({
      success: true,
      data: interview
    });
  } catch (error) {
    next(error);
  }
};

exports.cancelInterview = async (req, res, next) => {
  try {
    const { interviewId } = req.params;
    const { reason } = req.body;

    const interview = await Interview.findById(interviewId)
      .populate('candidateId');

    if (!interview) {
      return next(new AppError('面试不存在', 404));
    }

    interview.status = 'cancelled';
    interview.isTimeLocked = false;
    await interview.save();

    const jobCandidate = await JobCandidate.findById(interview.jobCandidateId);
    if (jobCandidate) {
      jobCandidate.status = 'phone_screen_passed';
      jobCandidate.statusHistory.push({
        status: 'phone_screen_passed',
        changedBy: req.user.id,
        remarks: `面试已取消: ${reason}`
      });
      await jobCandidate.save();
    }

    const candidate = interview.candidateId;
    if (candidate && candidate.email) {
      try {
        await sendEmail({
          email: candidate.email,
          subject: '面试取消通知',
          message: `您好${candidate.name}，\n\n很抱歉通知您，原定于${moment(interview.startTime).format('YYYY-MM-DD HH:mm')}的面试已取消。\n\n原因：${reason || '另行通知'}`
        });
      } catch (emailError) {
        console.error('发送取消通知邮件失败:', emailError);
      }
    }

    res.status(200).json({
      success: true,
      message: '面试已取消',
      data: interview
    });
  } catch (error) {
    next(error);
  }
};

exports.checkConflict = async (req, res, next) => {
  try {
    const { interviewerIds, candidateId, startTime, endTime } = req.body;

    if (!startTime || !endTime) {
      return next(new AppError('请提供开始时间和结束时间', 400));
    }

    const conflicts = [];
    const conflictDetails = [];

    if (interviewerIds && interviewerIds.length > 0) {
      for (const interviewerId of interviewerIds) {
        const interviewerInterviews = await Interview.find({
          interviewers: interviewerId,
          status: { $in: ['scheduled', 'confirmed', 'in_progress'] },
          startTime: { $lt: new Date(endTime) },
          endTime: { $gt: new Date(startTime) }
        }).populate('interviewers', 'name email');

        if (interviewerInterviews.length > 0) {
          const interviewer = await User.findById(interviewerId);
          conflicts.push({
            type: 'interviewer',
            userId: interviewerId,
            userName: interviewer?.name,
            conflictingInterviews: interviewerInterviews.map(i => ({
              id: i._id,
              startTime: i.startTime,
              endTime: i.endTime,
              type: i.type,
              round: i.round
            }))
          });
          conflictDetails.push(...interviewerInterviews.map(i => ({
            interviewer: interviewer?.name,
            start: i.startTime,
            end: i.endTime
          })));
        }
      }
    }

    if (candidateId) {
      const candidateInterviews = await Interview.find({
        candidateId,
        status: { $in: ['scheduled', 'confirmed', 'in_progress'] },
        startTime: { $lt: new Date(endTime) },
        endTime: { $gt: new Date(startTime) }
      });

      if (candidateInterviews.length > 0) {
        const candidate = await Candidate.findById(candidateId);
        conflicts.push({
          type: 'candidate',
          userId: candidateId,
          userName: candidate?.name,
          conflictingInterviews: candidateInterviews.map(i => ({
            id: i._id,
            startTime: i.startTime,
            endTime: i.endTime,
            type: i.type,
            round: i.round
          }))
        });
        conflictDetails.push(...candidateInterviews.map(i => ({
          candidate: candidate?.name,
          start: i.startTime,
          end: i.endTime
        })));
      }
    }

    res.status(200).json({
      success: true,
      hasConflict: conflicts.length > 0,
      conflictCount: conflicts.length,
      conflicts,
      conflictDetails,
      requestedSlot: {
        startTime: new Date(startTime),
        endTime: new Date(endTime)
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.scoreDifference = async (req, res, next) => {
  try {
    const { interviewId, evaluations: inputEvaluations } = req.body;

    let evaluations = inputEvaluations;

    if (interviewId && !evaluations) {
      evaluations = await InterviewEvaluation.find({ interviewId })
        .populate('interviewerId', 'name email role');
    }

    if (!evaluations || evaluations.length === 0) {
      return next(new AppError('未找到面试评价数据', 404));
    }

    if (evaluations.length < 2) {
      return res.status(200).json({
        success: true,
        message: '评价人数不足，无法进行分歧检测',
        evaluationCount: evaluations.length,
        hasSignificantDisagreement: false,
        stdDevThreshold: 2
      });
    }

    const scoreDimensions = ['technicalSkills', 'communication', 'problemSolving', 'teamwork', 'culturalFit'];
    const allOverallScores = evaluations.map(e => {
      if (e.overallScore) return e.overallScore;
      if (e.scores) {
        const vals = Object.values(e.scores);
        return vals.reduce((a, b) => a + b, 0) / vals.length;
      }
      return 0;
    });

    const overallStats = getStatistics(allOverallScores);

    const dimensionAnalysis = {};
    for (const dim of scoreDimensions) {
      const scores = evaluations.map(e => {
        if (e.scores && e.scores[dim] !== undefined) return e.scores[dim];
        if (e.ratings && e.ratings[dim] !== undefined) return e.ratings[dim];
        return null;
      }).filter(s => s !== null);

      if (scores.length >= 2) {
        const stats = getStatistics(scores);
        dimensionAnalysis[dim] = {
          scores,
          ...stats,
          hasDisagreement: stats.stdDev > 2
        };
      }
    }

    const hasSignificantDisagreement = overallStats.stdDev > 2 ||
      Object.values(dimensionAnalysis).some(d => d.hasDisagreement);

    const result = {
      success: true,
      evaluationCount: evaluations.length,
      overallStats: {
        mean: overallStats.mean,
        stdDev: overallStats.stdDev,
        min: overallStats.min,
        max: overallStats.max,
        range: overallStats.range
      },
      dimensionAnalysis,
      hasSignificantDisagreement,
      stdDevThreshold: 2,
      needsReReview: hasSignificantDisagreement,
      reReviewReason: hasSignificantDisagreement
        ? `评分标准差(${overallStats.stdDev.toFixed(2)})超过阈值(2)，建议复评`
        : null
    };

    if (hasSignificantDisagreement && interviewId) {
      const interview = await Interview.findById(interviewId);
      if (interview) {
        const report = await InterviewReport.findOneAndUpdate(
          { interviewId },
          {
            $set: {
              hasSignificantDisagreement: true,
              disagreementDetails: {
                overallStdDev: overallStats.stdDev,
                dimensionAnalysis
              },
              reReviewTriggered: true,
              reReviewReason: result.reReviewReason
            }
          },
          { upsert: true, new: true }
        );
        result.reportId = report._id;
      }
    }

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
