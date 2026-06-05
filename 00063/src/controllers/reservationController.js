const Reservation = require('../models/Reservation');
const ParkingSpace = require('../models/ParkingSpace');
const Notification = require('../models/Notification');
const moment = require('moment');
const Joi = require('joi');

let io;

exports.setSocketIO = (socketIO) => {
  io = socketIO;
};

exports.calculateFee = async (req, res, next) => {
  const schema = Joi.object({
    vehicleType: Joi.string().valid('compact', 'standard', 'large').required(),
    startTime: Joi.date().required(),
    endTime: Joi.date().required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  try {
    const { vehicleType, startTime, endTime } = req.body;
    
    if (new Date(endTime) <= new Date(startTime)) {
      return res.status(400).json({
        success: false,
        message: '结束时间必须大于开始时间'
      });
    }

    const fee = Reservation.calculateFee(vehicleType, new Date(startTime), new Date(endTime));
    const durationHours = moment(endTime).diff(moment(startTime), 'hours', true);

    res.status(200).json({
      success: true,
      data: {
        vehicleType,
        startTime,
        endTime,
        durationHours: Math.round(durationHours * 100) / 100,
        calculatedFee: fee
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.createReservation = async (req, res, next) => {
  const schema = Joi.object({
    spaceId: Joi.string().required(),
    licensePlate: Joi.string().required(),
    vehicleType: Joi.string().valid('compact', 'standard', 'large').required(),
    startTime: Joi.date().required(),
    endTime: Joi.date().required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  try {
    const { spaceId, licensePlate, vehicleType, startTime, endTime } = req.body;
    const userId = req.user.id;

    if (new Date(endTime) <= new Date(startTime)) {
      return res.status(400).json({
        success: false,
        message: '结束时间必须大于开始时间'
      });
    }

    if (new Date(startTime) < new Date()) {
      return res.status(400).json({
        success: false,
        message: '预约开始时间不能早于当前时间'
      });
    }

    const space = await ParkingSpace.findById(spaceId);
    if (!space) {
      return res.status(404).json({
        success: false,
        message: '车位不存在'
      });
    }

    if (space.status === 'maintenance') {
      return res.status(400).json({
        success: false,
        message: '该车位正在维护中'
      });
    }

    const conflicts = await Reservation.findConflictReservations(
      spaceId,
      new Date(startTime),
      new Date(endTime)
    );

    if (conflicts.length > 0) {
      const availableSlots = await Reservation.findAvailableSlots(
        spaceId,
        new Date(startTime),
        moment(endTime).diff(moment(startTime), 'hours')
      );

      return res.status(409).json({
        success: false,
        message: '该时段车位已被预约',
        conflictReservations: conflicts,
        recommendedSlots: availableSlots
      });
    }

    const calculatedFee = Reservation.calculateFee(
      vehicleType,
      new Date(startTime),
      new Date(endTime)
    );

    const durationHours = moment(endTime).diff(moment(startTime), 'hours', true);

    const reservation = await Reservation.create({
      userId,
      spaceId,
      licensePlate,
      vehicleType,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      durationHours: Math.round(durationHours * 100) / 100,
      calculatedFee,
      status: 'pending'
    });

    reservation.status = 'locked';
    reservation.lockExpiresAt = moment().add(15, 'minutes').toDate();
    await reservation.save();

    await Notification.createAndPush({
      userId,
      type: 'reservation',
      title: '预约已锁定',
      message: `您的车位预约已锁定，请在15分钟内确认。车位：${space.spaceNumber}，时段：${moment(startTime).format('MM-DD HH:mm')} - ${moment(endTime).format('MM-DD HH:mm')}`,
      data: { reservationId: reservation._id, spaceNumber: space.spaceNumber }
    }, io);

    await Notification.broadcastToAdmins({
      type: 'admin',
      title: '新预约申请',
      message: `用户 ${req.user.name} 申请预约车位 ${space.spaceNumber}`,
      data: { reservationId: reservation._id, userId, spaceNumber: space.spaceNumber }
    }, io);

    res.status(201).json({
      success: true,
      message: '预约已锁定，请在15分钟内确认',
      data: reservation
    });
  } catch (err) {
    next(err);
  }
};

exports.confirmReservation = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: '预约不存在'
      });
    }

    if (reservation.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权操作此预约'
      });
    }

    if (reservation.status !== 'locked') {
      return res.status(400).json({
        success: false,
        message: '该预约状态不允许确认'
      });
    }

    if (new Date() > new Date(reservation.lockExpiresAt)) {
      reservation.status = 'cancelled';
      reservation.cancellationReason = '锁定超时未确认';
      await reservation.save();
      
      return res.status(400).json({
        success: false,
        message: '预约锁定已超时，请重新预约'
      });
    }

    reservation.status = 'confirmed';
    reservation.lockExpiresAt = undefined;
    await reservation.save();

    const space = await ParkingSpace.findById(reservation.spaceId);
    space.status = 'reserved';
    space.currentReservation = reservation._id;
    await space.save();

    await Notification.createAndPush({
      userId: reservation.userId,
      type: 'reservation',
      title: '预约已确认',
      message: `您的车位预约已确认！车位：${space.spaceNumber}，时段：${moment(reservation.startTime).format('MM-DD HH:mm')} - ${moment(reservation.endTime).format('MM-DD HH:mm')}，费用：${reservation.calculatedFee}元`,
      data: { reservationId: reservation._id, spaceNumber: space.spaceNumber }
    }, io);

    res.status(200).json({
      success: true,
      message: '预约确认成功',
      data: reservation
    });
  } catch (err) {
    next(err);
  }
};

exports.cancelReservation = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: '预约不存在'
      });
    }

    if (reservation.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权操作此预约'
      });
    }

    if (!['pending', 'locked', 'confirmed'].includes(reservation.status)) {
      return res.status(400).json({
        success: false,
        message: '该预约状态不允许取消'
      });
    }

    reservation.status = 'cancelled';
    reservation.cancellationReason = req.body.reason || '用户主动取消';
    await reservation.save();

    const space = await ParkingSpace.findById(reservation.spaceId);
    if (space && space.currentReservation?.toString() === reservation._id.toString()) {
      space.status = 'available';
      space.currentReservation = undefined;
      await space.save();
    }

    await Notification.createAndPush({
      userId: reservation.userId,
      type: 'reservation',
      title: '预约已取消',
      message: `您的车位预约已取消。原因：${reservation.cancellationReason}`,
      data: { reservationId: reservation._id }
    }, io);

    res.status(200).json({
      success: true,
      message: '预约取消成功',
      data: reservation
    });
  } catch (err) {
    next(err);
  }
};

exports.getMyReservations = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    const query = { userId: req.user.id };
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    
    const reservations = await Reservation.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('spaceId');

    const total = await Reservation.countDocuments(query);

    res.status(200).json({
      success: true,
      count: reservations.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: reservations
    });
  } catch (err) {
    next(err);
  }
};

exports.getReservation = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('spaceId')
      .populate('userId', 'name phone');
    
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: '预约不存在'
      });
    }

    if (reservation.userId._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权查看此预约'
      });
    }

    res.status(200).json({
      success: true,
      data: reservation
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllReservations = async (req, res, next) => {
  try {
    const { status, userId, startDate, endDate, page = 1, limit = 50 } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (userId) query.userId = userId;
    if (startDate && endDate) {
      query.startTime = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const skip = (page - 1) * limit;
    
    const reservations = await Reservation.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('spaceId')
      .populate('userId', 'name phone');

    const total = await Reservation.countDocuments(query);

    res.status(200).json({
      success: true,
      count: reservations.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: reservations
    });
  } catch (err) {
    next(err);
  }
};
