const ViolationRecord = require('../models/ViolationRecord');
const Notification = require('../models/Notification');
const Joi = require('joi');

let io;

exports.setSocketIO = (socketIO) => {
  io = socketIO;
};

exports.getMyViolations = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    const violations = await ViolationRecord.getUserViolations(
      req.user.id,
      status
    );

    const startIndex = (page - 1) * limit;
    const paginatedViolations = violations.slice(startIndex, startIndex + parseInt(limit));

    res.status(200).json({
      success: true,
      count: paginatedViolations.length,
      total: violations.length,
      totalPages: Math.ceil(violations.length / limit),
      currentPage: parseInt(page),
      data: paginatedViolations
    });
  } catch (err) {
    next(err);
  }
};

exports.getViolation = async (req, res, next) => {
  try {
    const violation = await ViolationRecord.findById(req.params.id)
      .populate('userId', 'name phone')
      .populate('spaceId')
      .populate('parkingRecordId');
    
    if (!violation) {
      return res.status(404).json({
        success: false,
        message: '违规记录不存在'
      });
    }

    if (violation.userId._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权查看此违规记录'
      });
    }

    res.status(200).json({
      success: true,
      data: violation
    });
  } catch (err) {
    next(err);
  }
};

exports.appealViolation = async (req, res, next) => {
  const schema = Joi.object({
    appeal: Joi.string().required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  try {
    const violation = await ViolationRecord.findById(req.params.id);
    
    if (!violation) {
      return res.status(404).json({
        success: false,
        message: '违规记录不存在'
      });
    }

    if (violation.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '无权操作此违规记录'
      });
    }

    if (violation.status === 'appealed') {
      return res.status(400).json({
        success: false,
        message: '该违规记录已申诉，等待处理'
      });
    }

    await violation.appeal(req.body.appeal);

    await Notification.broadcastToAdmins({
      type: 'admin',
      title: '违规申诉待处理',
      message: `用户 ${req.user.name} 对违规记录提出申诉，请及时处理。`,
      data: { violationId: violation._id, userId: req.user.id, licensePlate: violation.licensePlate }
    }, io);

    res.status(200).json({
      success: true,
      message: '申诉已提交，等待管理员处理',
      data: violation
    });
  } catch (err) {
    next(err);
  }
};

exports.payFine = async (req, res, next) => {
  try {
    const violation = await ViolationRecord.findById(req.params.id);
    
    if (!violation) {
      return res.status(404).json({
        success: false,
        message: '违规记录不存在'
      });
    }

    if (violation.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '无权操作此违规记录'
      });
    }

    if (violation.isPaid) {
      return res.status(400).json({
        success: false,
        message: '该违规罚款已缴纳'
      });
    }

    await violation.payFine();

    await Notification.createAndPush({
      userId: req.user.id,
      type: 'payment',
      title: '罚款缴纳成功',
      message: `违规罚款 ${violation.fineAmount} 元缴纳成功。`,
      data: { violationId: violation._id, amount: violation.fineAmount }
    }, io);

    res.status(200).json({
      success: true,
      message: '罚款缴纳成功',
      data: violation
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllViolations = async (req, res, next) => {
  try {
    const { status, type, userId, licensePlate, page = 1, limit = 50 } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (userId) query.userId = userId;
    if (licensePlate) query.licensePlate = new RegExp(licensePlate, 'i');

    const skip = (page - 1) * limit;
    
    const violations = await ViolationRecord.find(query)
      .sort({ detectedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'name phone')
      .populate('spaceId');

    const total = await ViolationRecord.countDocuments(query);

    res.status(200).json({
      success: true,
      count: violations.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: violations
    });
  } catch (err) {
    next(err);
  }
};

exports.handleViolation = async (req, res, next) => {
  try {
    const violation = await ViolationRecord.findById(req.params.id);
    
    if (!violation) {
      return res.status(404).json({
        success: false,
        message: '违规记录不存在'
      });
    }

    const { action, notes } = req.body;

    if (action === 'dismiss') {
      violation.status = 'dismissed';
      violation.handledBy = req.user.id;
      violation.handledAt = new Date();
      violation.handlingNotes = notes || '管理员撤销违规';
      await violation.save();

      await Notification.createAndPush({
        userId: violation.userId,
        type: 'system',
        title: '违规记录已撤销',
        message: `您的违规记录（${violation.typeName}）已被管理员撤销。`,
        data: { violationId: violation._id }
      }, io);
    } else if (action === 'confirm') {
      violation.status = 'confirmed';
      violation.handledBy = req.user.id;
      violation.handledAt = new Date();
      violation.handlingNotes = notes || '违规确认';
      await violation.save();
    }

    res.status(200).json({
      success: true,
      message: action === 'dismiss' ? '违规已撤销' : '违规已确认',
      data: violation
    });
  } catch (err) {
    next(err);
  }
};

exports.clearUserViolations = async (req, res, next) => {
  try {
    const { userId, reason } = req.body;

    await ViolationRecord.clearViolations(userId, req.user.id, reason);

    res.status(200).json({
      success: true,
      message: '用户违规记录已清除，预约权限已恢复'
    });
  } catch (err) {
    next(err);
  }
};

exports.createViolation = async (req, res, next) => {
  const schema = Joi.object({
    userId: Joi.string().required(),
    licensePlate: Joi.string().required(),
    type: Joi.string().valid('overtime', 'wrong_zone', 'no_reservation', 'disabled_abuse', 'other').required(),
    description: Joi.string().optional(),
    severity: Joi.string().valid('minor', 'moderate', 'severe').optional(),
    fineAmount: Joi.number().optional(),
    parkingRecordId: Joi.string().optional(),
    spaceId: Joi.string().optional()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  try {
    const violation = await ViolationRecord.checkAndAddViolation(
      req.body.userId,
      req.body.licensePlate,
      req.body.type,
      {
        description: req.body.description,
        severity: req.body.severity || 'minor',
        fineAmount: req.body.fineAmount || 0,
        parkingRecordId: req.body.parkingRecordId,
        spaceId: req.body.spaceId
      }
    );

    res.status(201).json({
      success: true,
      message: '违规记录已创建',
      data: violation
    });
  } catch (err) {
    next(err);
  }
};
