const MonthlyCard = require('../models/MonthlyCard');
const User = require('../models/User');
const Notification = require('../models/Notification');
const moment = require('moment');
const Joi = require('joi');

let io;

exports.setSocketIO = (socketIO) => {
  io = socketIO;
};

exports.getPlans = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: MonthlyCard.PLANS
    });
  } catch (err) {
    next(err);
  }
};

exports.getRecommendedPlan = async (req, res, next) => {
  try {
    const recommendation = await MonthlyCard.recommendPlan(req.user.id);

    res.status(200).json({
      success: true,
      data: recommendation
    });
  } catch (err) {
    next(err);
  }
};

exports.applyMonthlyCard = async (req, res, next) => {
  const schema = Joi.object({
    planType: Joi.string().valid('basic', 'standard', 'premium', 'business').required(),
    licensePlates: Joi.array().items(Joi.string()).optional(),
    autoRenew: Joi.boolean().optional()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  try {
    const { planType, licensePlates, autoRenew = false } = req.body;
    const plan = MonthlyCard.PLANS[planType];

    const pendingCards = await MonthlyCard.countDocuments({
      userId: req.user.id,
      status: 'pending'
    });

    if (pendingCards > 0) {
      return res.status(400).json({
        success: false,
        message: '您有待审批的月卡申请，请等待审批后再申请'
      });
    }

    const activeCards = await MonthlyCard.countDocuments({
      userId: req.user.id,
      status: 'active'
    });

    const userLicensePlates = licensePlates || req.user.licensePlates || [];
    
    const monthlyCard = await MonthlyCard.create({
      userId: req.user.id,
      planType,
      planName: plan.name,
      price: plan.price,
      durationDays: plan.durationDays,
      maxParkingHoursPerDay: plan.maxParkingHoursPerDay,
      includedZones: plan.zones,
      startTime: moment().toDate(),
      expireAt: moment().add(plan.durationDays, 'days').toDate(),
      status: activeCards === 0 ? 'pending' : 'active',
      autoRenew,
      licensePlates: userLicensePlates,
      approvedAt: activeCards > 0 ? new Date() : undefined,
      approvedBy: activeCards > 0 ? req.user.id : undefined
    });

    await Notification.createAndPush({
      userId: req.user.id,
      type: 'monthly_card',
      title: '月卡申请已提交',
      message: `您的${plan.name}申请已提交${activeCards > 0 ? '并自动激活' : '，请等待管理员审批'}。`,
      data: { monthlyCardId: monthlyCard._id, planType, status: monthlyCard.status }
    }, io);

    if (monthlyCard.status === 'pending') {
      await Notification.broadcastToAdmins({
        type: 'admin',
        title: '新月卡申请待审批',
        message: `用户 ${req.user.name} 申请${plan.name}，请及时审批。`,
        data: { monthlyCardId: monthlyCard._id, userId: req.user.id, planType }
      }, io);
    }

    res.status(201).json({
      success: true,
      message: activeCards > 0 ? '月卡申请成功并已激活' : '月卡申请已提交，等待审批',
      data: monthlyCard
    });
  } catch (err) {
    next(err);
  }
};

exports.getMyMonthlyCards = async (req, res, next) => {
  try {
    const { status } = req.query;
    
    const query = { userId: req.user.id };
    if (status) query.status = status;

    const cards = await MonthlyCard.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: cards.length,
      data: cards
    });
  } catch (err) {
    next(err);
  }
};

exports.getMonthlyCard = async (req, res, next) => {
  try {
    const card = await MonthlyCard.findById(req.params.id)
      .populate('userId', 'name phone');
    
    if (!card) {
      return res.status(404).json({
        success: false,
        message: '月卡不存在'
      });
    }

    if (card.userId._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权查看此月卡'
      });
    }

    res.status(200).json({
      success: true,
      data: card
    });
  } catch (err) {
    next(err);
  }
};

exports.renewMonthlyCard = async (req, res, next) => {
  try {
    const card = await MonthlyCard.findById(req.params.id);
    
    if (!card) {
      return res.status(404).json({
        success: false,
        message: '月卡不存在'
      });
    }

    if (card.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '无权操作此月卡'
      });
    }

    if (!['active', 'expired'].includes(card.status)) {
      return res.status(400).json({
        success: false,
        message: '该月卡状态不允许续费'
      });
    }

    const plan = MonthlyCard.PLANS[card.planType];
    card.startTime = moment.max(moment(card.expireAt), moment()).toDate();
    card.expireAt = moment(card.startTime).add(plan.durationDays, 'days').toDate();
    card.status = 'active';
    
    await card.save();

    await Notification.createAndPush({
      userId: req.user.id,
      type: 'monthly_card',
      title: '月卡续费成功',
      message: `您的${card.planName}已续费成功，有效期至${moment(card.expireAt).format('YYYY-MM-DD')}。`,
      data: { monthlyCardId: card._id, expireAt: card.expireAt }
    }, io);

    res.status(200).json({
      success: true,
      message: '月卡续费成功',
      data: card
    });
  } catch (err) {
    next(err);
  }
};

exports.approveMonthlyCard = async (req, res, next) => {
  try {
    const card = await MonthlyCard.findById(req.params.id);
    
    if (!card) {
      return res.status(404).json({
        success: false,
        message: '月卡不存在'
      });
    }

    if (card.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '该月卡不处于待审批状态'
      });
    }

    const { approved, notes } = req.body;

    if (approved) {
      card.status = 'active';
      card.approvedBy = req.user.id;
      card.approvedAt = new Date();
      card.approvalNotes = notes;
      await card.save();

      await Notification.createAndPush({
        userId: card.userId,
        type: 'monthly_card',
        title: '月卡申请已通过',
        message: `您的${card.planName}申请已通过审批，有效期至${moment(card.expireAt).format('YYYY-MM-DD')}。`,
        data: { monthlyCardId: card._id, expireAt: card.expireAt }
      }, io);
    } else {
      card.status = 'cancelled';
      card.approvalNotes = notes || '申请未通过';
      await card.save();

      await Notification.createAndPush({
        userId: card.userId,
        type: 'monthly_card',
        title: '月卡申请未通过',
        message: `您的${card.planName}申请未通过审批。原因：${notes || '未说明'}`,
        data: { monthlyCardId: card._id }
      }, io);
    }

    res.status(200).json({
      success: true,
      message: approved ? '月卡已批准激活' : '月卡申请已驳回',
      data: card
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllMonthlyCards = async (req, res, next) => {
  try {
    const { status, userId, planType, page = 1, limit = 50 } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (userId) query.userId = userId;
    if (planType) query.planType = planType;

    const skip = (page - 1) * limit;
    
    const cards = await MonthlyCard.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'name phone');

    const total = await MonthlyCard.countDocuments(query);

    res.status(200).json({
      success: true,
      count: cards.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: cards
    });
  } catch (err) {
    next(err);
  }
};
