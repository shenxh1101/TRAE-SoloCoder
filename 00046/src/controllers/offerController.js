const Offer = require('../models/Offer');
const JobCandidate = require('../models/JobCandidate');
const Job = require('../models/Job');
const { AppError } = require('../middleware/errorHandler');
const { calculateCompensationPackage } = require('../utils/budgetValidator');
const { sendEmail } = require('../utils/emailService');

exports.calculateCompensation = async (req, res, next) => {
  try {
    const { jobCandidateId, level, baseSalary, performanceRating = 1.0 } = req.body;

    if (!baseSalary || baseSalary <= 0) {
      return next(new AppError('请提供有效的基本工资', 400));
    }

    const package = calculateCompensationPackage(level, baseSalary, performanceRating);

    let budgetCheck = null;
    if (jobCandidateId) {
      const jobCandidate = await JobCandidate.findById(jobCandidateId).populate('jobId');
      if (jobCandidate && jobCandidate.jobId) {
        const budget = jobCandidate.jobId.budget;
        const exceedsBudget = budget && package.totalCompensation > budget;

        budgetCheck = {
          jobBudget: budget,
          totalCompensation: package.totalCompensation,
          exceedsBudget,
          bufferAmount: budget ? budget - package.totalCompensation : null,
          bufferPercentage: budget
            ? ((budget - package.totalCompensation) / budget * 100).toFixed(1) + '%'
            : null
        };
      }
    }

    res.status(200).json({
      success: true,
      data: {
        package,
        budgetCheck
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.createOffer = async (req, res, next) => {
  try {
    const {
      jobCandidateId,
      baseSalary,
      annualBonus,
      stockOptions,
      signOnBonus,
      level,
      startDate,
      probationMonths,
      validUntil,
      remarks
    } = req.body;

    const jobCandidate = await JobCandidate.findById(jobCandidateId)
      .populate('candidateId')
      .populate('jobId');

    if (!jobCandidate) {
      return next(new AppError('候选记录不存在', 404));
    }

    const job = jobCandidate.jobId;
    const candidate = jobCandidate.candidateId;

    const totalCompensation = baseSalary * 14 + (annualBonus || 0) + (stockOptions || 0) + (signOnBonus || 0);
    const exceedsBudget = job.budget && totalCompensation > job.budget;

    let approvalStatus = 'draft';
    let approvalRequired = false;

    if (exceedsBudget) {
      approvalRequired = true;
      approvalStatus = 'pending_approval';
    }

    const offer = await Offer.create({
      jobId: job._id,
      jobCandidateId,
      candidateId: candidate._id,
      candidateName: candidate.name,
      position: job.title,
      level,
      baseSalary,
      annualBonus: annualBonus || 0,
      stockOptions: stockOptions || 0,
      signOnBonus: signOnBonus || 0,
      totalCompensation,
      startDate: startDate ? new Date(startDate) : null,
      probationMonths: probationMonths || 3,
      validUntil: validUntil ? new Date(validUntil) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      issuedBy: req.user.id,
      status: approvalStatus,
      approvalRequired,
      approvalStatus: approvalRequired ? 'pending' : 'approved',
      budgetCheck: {
        jobBudget: job.budget,
        totalCompensation,
        exceedsBudget,
        budgetDifference: job.budget ? totalCompensation - job.budget : 0
      },
      remarks
    });

    jobCandidate.status = exceedsBudget ? 'offer_preparing' : 'offer_sent';
    jobCandidate.statusHistory.push({
      status: jobCandidate.status,
      changedBy: req.user.id,
      remarks: exceedsBudget ? 'Offer待审批' : 'Offer已发送'
    });
    await jobCandidate.save();

    if (!exceedsBudget && candidate.email) {
      try {
        await sendEmail({
          email: candidate.email,
          subject: `Offer - ${job.title}`,
          message: `您好${candidate.name}，\n\n恭喜您通过面试！\n\n职位：${job.title}\n薪资：${baseSalary.toLocaleString()}/月\n\n请在7日内回复。`
        });
      } catch (emailError) {
        console.error('发送Offer邮件失败:', emailError);
      }
    }

    res.status(201).json({
      success: true,
      message: exceedsBudget ? 'Offer已创建，等待审批' : 'Offer已发送',
      data: offer
    });
  } catch (error) {
    next(error);
  }
};

exports.submitForApproval = async (req, res, next) => {
  try {
    const { offerId } = req.params;

    const offer = await Offer.findById(offerId)
      .populate('jobId')
      .populate('candidateId');

    if (!offer) {
      return next(new AppError('Offer不存在', 404));
    }

    offer.approvalStatus = 'pending';
    offer.approvalRequired = true;
    offer.status = 'pending_approval';
    offer.approvalRequestedAt = Date.now();
    offer.approvalRequestedBy = req.user.id;

    await offer.save();

    res.status(200).json({
      success: true,
      message: 'Offer已提交审批',
      data: offer
    });
  } catch (error) {
    next(error);
  }
};

exports.approveOffer = async (req, res, next) => {
  try {
    const { offerId } = req.params;
    const { approvalNotes } = req.body;

    const offer = await Offer.findById(offerId)
      .populate('jobId')
      .populate('candidateId');

    if (!offer) {
      return next(new AppError('Offer不存在', 404));
    }

    if (offer.approvalStatus === 'approved') {
      return next(new AppError('Offer已审批', 400));
    }

    offer.approvalStatus = 'approved';
    offer.approvedBy = req.user.id;
    offer.approvedAt = Date.now();
    offer.approvalNotes = approvalNotes;
    offer.status = 'issued';
    offer.issuedAt = Date.now();
    offer.issuedBy = req.user.id;

    offer.approvalHistory.push({
      approvedBy: req.user.id,
      approvedAt: Date.now(),
      approvalNotes,
      decision: 'approve'
    });

    await offer.save();

    const jobCandidate = await JobCandidate.findById(offer.jobCandidateId);
    if (jobCandidate) {
      jobCandidate.status = 'offer_sent';
      jobCandidate.statusHistory.push({
        status: 'offer_sent',
        changedBy: req.user.id,
        remarks: 'Offer审批通过，已发送'
      });
      await jobCandidate.save();
    }

    const candidate = offer.candidateId;
    if (candidate && candidate.email) {
      try {
        await sendEmail({
          email: candidate.email,
          subject: `Offer - ${offer.jobId?.title}`,
          message: `您好${candidate.name}，\n\n恭喜您通过面试！\n\n职位：${offer.jobId?.title}\n薪资：${offer.baseSalary.toLocaleString()}/月\n\n请在7日内回复。`
        });
      } catch (emailError) {
        console.error('发送Offer邮件失败:', emailError);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Offer审批通过并已发送',
      data: offer
    });
  } catch (error) {
    next(error);
  }
};

exports.rejectOfferApproval = async (req, res, next) => {
  try {
    const { offerId } = req.params;
    const { rejectionReason } = req.body;

    const offer = await Offer.findById(offerId);
    if (!offer) {
      return next(new AppError('Offer不存在', 404));
    }

    offer.approvalStatus = 'rejected';
    offer.rejectedBy = req.user.id;
    offer.rejectedAt = Date.now();
    offer.rejectionReason = rejectionReason;
    offer.status = 'rejected';

    offer.approvalHistory.push({
      approvedBy: req.user.id,
      approvedAt: Date.now(),
      approvalNotes: rejectionReason,
      decision: 'reject'
    });

    await offer.save();

    res.status(200).json({
      success: true,
      message: 'Offer审批已拒绝',
      data: offer
    });
  } catch (error) {
    next(error);
  }
};

exports.acceptOffer = async (req, res, next) => {
  try {
    const { offerId } = req.params;
    const { acceptanceNotes } = req.body;

    const offer = await Offer.findById(offerId)
      .populate('candidateId')
      .populate('jobId');

    if (!offer) {
      return next(new AppError('Offer不存在', 404));
    }

    if (offer.status === 'withdrawn') {
      return next(new AppError('Offer已撤回', 400));
    }

    const now = Date.now();
    if (offer.validUntil && new Date(offer.validUntil) < new Date(now)) {
      return next(new AppError('Offer已过期', 400));
    }

    offer.candidateResponse = 'accepted';
    offer.respondedAt = now;
    offer.acceptanceNotes = acceptanceNotes;
    offer.status = 'accepted';
    offer.acceptedAt = now;

    await offer.save();

    const jobCandidate = await JobCandidate.findById(offer.jobCandidateId);
    if (jobCandidate) {
      jobCandidate.status = 'offer_accepted';
      jobCandidate.statusHistory.push({
        status: 'offer_accepted',
        changedBy: req.user.id,
        remarks: '候选人接受Offer'
      });
      await jobCandidate.save();
    }

    res.status(200).json({
      success: true,
      message: 'Offer已接受',
      data: offer
    });
  } catch (error) {
    next(error);
  }
};

exports.declineOffer = async (req, res, next) => {
  try {
    const { offerId } = req.params;
    const { declineReason, counterOffer } = req.body;

    const offer = await Offer.findById(offerId);
    if (!offer) {
      return next(new AppError('Offer不存在', 404));
    }

    offer.candidateResponse = 'rejected';
    offer.respondedAt = Date.now();
    offer.declineReason = declineReason;
    offer.counterOffer = counterOffer;
    offer.status = 'declined';
    offer.declinedAt = Date.now();

    await offer.save();

    const jobCandidate = await JobCandidate.findById(offer.jobCandidateId);
    if (jobCandidate) {
      jobCandidate.status = 'offer_rejected';
      jobCandidate.statusHistory.push({
        status: 'offer_rejected',
        changedBy: req.user.id,
        remarks: `候选人拒绝Offer: ${declineReason}`
      });
      await jobCandidate.save();
    }

    res.status(200).json({
      success: true,
      message: 'Offer已拒绝',
      data: offer
    });
  } catch (error) {
    next(error);
  }
};

exports.negotiateOffer = async (req, res, next) => {
  try {
    const { offerId } = req.params;
    const { counterOffer, negotiationNotes } = req.body;

    const offer = await Offer.findById(offerId);
    if (!offer) {
      return next(new AppError('Offer不存在', 404));
    }

    offer.candidateResponse = 'negotiating';
    offer.respondedAt = Date.now();
    offer.negotiationNotes = negotiationNotes;
    offer.counterOffer = counterOffer;
    offer.status = 'negotiating';
    offer.isNegotiating = true;

    offer.negotiationHistory.push({
      fromCandidate: true,
      counterOffer,
      negotiationNotes,
      timestamp: Date.now()
    });

    await offer.save();

    const jobCandidate = await JobCandidate.findById(offer.jobCandidateId);
    if (jobCandidate) {
      jobCandidate.status = 'offer_negotiating';
      jobCandidate.statusHistory.push({
        status: 'offer_negotiating',
        changedBy: req.user.id,
        remarks: '候选人协商中'
      });
      await jobCandidate.save();
    }

    res.status(200).json({
      success: true,
      message: '已进入协商阶段',
      data: offer
    });
  } catch (error) {
    next(error);
  }
};

exports.updateOffer = async (req, res, next) => {
  try {
    const { offerId } = req.params;
    const updateData = req.body;

    const offer = await Offer.findById(offerId);
    if (!offer) {
      return next(new AppError('Offer不存在', 404));
    }

    if (offer.candidateResponse && offer.candidateResponse !== 'negotiating') {
      return next(new AppError('候选人已回复，无法修改Offer', 400));
    }

    if (updateData.baseSalary !== undefined) {
      updateData.totalCompensation =
        updateData.baseSalary * 14 +
        (updateData.annualBonus || offer.annualBonus || 0) +
        (updateData.stockOptions || offer.stockOptions || 0) +
        (updateData.signOnBonus || offer.signOnBonus || 0);
    }

    Object.assign(offer, updateData);
    offer.version = (offer.version || 1) + 1;
    offer.updatedAt = Date.now();

    await offer.save();

    res.status(200).json({
      success: true,
      message: 'Offer已更新',
      data: offer
    });
  } catch (error) {
    next(error);
  }
};

exports.withdrawOffer = async (req, res, next) => {
  try {
    const { offerId } = req.params;
    const { withdrawReason } = req.body;

    const offer = await Offer.findById(offerId);
    if (!offer) {
      return next(new AppError('Offer不存在', 404));
    }

    offer.status = 'withdrawn';
    offer.withdrawnAt = Date.now();
    offer.withdrawnBy = req.user.id;
    offer.withdrawReason = withdrawReason;

    await offer.save();

    res.status(200).json({
      success: true,
      message: 'Offer已撤回',
      data: offer
    });
  } catch (error) {
    next(error);
  }
};

exports.getOffer = async (req, res, next) => {
  try {
    const { offerId } = req.params;

    const offer = await Offer.findById(offerId)
      .populate('jobId', 'title department budget')
      .populate('candidateId', 'name email phone');

    if (!offer) {
      return next(new AppError('Offer不存在', 404));
    }

    res.status(200).json({
      success: true,
      data: offer
    });
  } catch (error) {
    next(error);
  }
};

exports.getOffers = async (req, res, next) => {
  try {
    const { status, jobId, candidateId, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (jobId) query.jobId = jobId;
    if (candidateId) query.candidateId = candidateId;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const offers = await Offer.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('jobId', 'title department')
      .populate('candidateId', 'name email');

    const total = await Offer.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: offers
    });
  } catch (error) {
    next(error);
  }
};
