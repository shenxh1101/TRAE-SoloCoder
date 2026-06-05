const ParkingRecord = require('../models/ParkingRecord');
const ParkingSpace = require('../models/ParkingSpace');
const Reservation = require('../models/Reservation');
const User = require('../models/User');
const MonthlyCard = require('../models/MonthlyCard');
const ViolationRecord = require('../models/ViolationRecord');
const Notification = require('../models/Notification');
const moment = require('moment');
const Joi = require('joi');

let io;

exports.setSocketIO = (socketIO) => {
  io = socketIO;
};

exports.vehicleEntry = async (req, res, next) => {
  const schema = Joi.object({
    licensePlate: Joi.string().required(),
    entryGate: Joi.string().optional(),
    entryImage: Joi.string().optional()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  try {
    const { licensePlate, entryGate, entryImage } = req.body;

    const existingRecord = await ParkingRecord.getActiveParkingByPlate(licensePlate);
    if (existingRecord) {
      return res.status(400).json({
        success: false,
        message: '该车辆已在场内',
        data: existingRecord
      });
    }

    const user = await User.findOne({ licensePlates: licensePlate }).populate('monthlyCards');
    const validMonthlyCard = user?.getValidMonthlyCard();

    const activeReservation = await Reservation.findOne({
      licensePlate,
      status: 'confirmed',
      startTime: { $lte: moment().add(30, 'minutes').toDate() },
      endTime: { $gte: new Date() }
    }).populate('spaceId');

    let assignedSpace = activeReservation?.spaceId;
    let isReservationMatched = !!activeReservation;

    if (!assignedSpace) {
      const availableSpaces = await ParkingSpace.find({ status: 'available' });
      if (availableSpaces.length === 0) {
        return res.status(503).json({
          success: false,
          message: '停车场已满，暂无空闲车位'
        });
      }

      if (validMonthlyCard) {
        assignedSpace = availableSpaces.find(s => 
          validMonthlyCard.includedZones.includes(s.zone)
        ) || availableSpaces[0];
      } else {
        assignedSpace = availableSpaces[0];
      }
    }

    let isLocked = false;
    if (user && validMonthlyCard) {
      const daysRemaining = moment(validMonthlyCard.expireAt).diff(moment(), 'days');
      if (daysRemaining < 3) {
        await Notification.createAndPush({
          userId: user._id,
          type: 'monthly_card',
          title: '月卡即将到期',
          message: `您的月卡将于 ${daysRemaining} 天后到期，请及时充值续费。`,
          data: { monthlyCardId: validMonthlyCard._id, daysRemaining }
        }, io);
      }
    } else if (user && !validMonthlyCard) {
      const recentParkings = await ParkingRecord.countDocuments({
        userId: user._id,
        entryTime: { $gte: moment().subtract(7, 'days').toDate() }
      });
      if (recentParkings >= 3) {
        isLocked = true;
        await Notification.createAndPush({
          userId: user._id,
          type: 'system',
          title: '车辆临时锁定',
          message: '检测到您近期高频使用停车场但未办理月卡，车辆已临时锁定。建议办理月卡或线上支付后解锁。',
          data: { licensePlate, suggestion: '办理月卡更优惠' }
        }, io);
      }
    }

    const parkingRecord = await ParkingRecord.create({
      userId: user?._id,
      spaceId: assignedSpace._id,
      reservationId: activeReservation?._id,
      licensePlate,
      vehicleType: 'standard',
      entryTime: new Date(),
      entryGate,
      entryImage,
      status: isLocked ? 'locked' : 'parking',
      isMonthlyCard: !!validMonthlyCard,
      monthlyCardId: validMonthlyCard?._id,
      isReservationMatched
    });

    assignedSpace.status = 'occupied';
    assignedSpace.currentVehicle = licensePlate;
    if (activeReservation) {
      assignedSpace.currentReservation = activeReservation._id;
    }
    await assignedSpace.save();

    if (activeReservation) {
      activeReservation.status = 'checked_in';
      activeReservation.checkedInAt = new Date();
      await activeReservation.save();
    }

    if (user) {
      await Notification.createAndPush({
        userId: user._id,
        type: 'parking',
        title: '车辆入场通知',
        message: `您的车辆 ${licensePlate} 已入场。车位：${assignedSpace.spaceNumber}，区域：${assignedSpace.zone}区${isLocked ? '。车辆已临时锁定，请办理月卡或支付解锁' : ''}`,
        data: { 
          parkingRecordId: parkingRecord._id, 
          spaceNumber: assignedSpace.spaceNumber,
          isLocked,
          isReservationMatched
        }
      }, io);
    }

    await Notification.broadcastToAdmins({
      type: 'admin',
      title: '车辆入场',
      message: `车辆 ${licensePlate} 已入场，车位：${assignedSpace.spaceNumber}`,
      data: { parkingRecordId: parkingRecord._id, licensePlate, spaceNumber: assignedSpace.spaceNumber }
    }, io);

    res.status(200).json({
      success: true,
      message: isLocked ? '车辆已入场但临时锁定' : '车辆入场成功',
      data: {
        parkingRecord,
        space: assignedSpace,
        isReservationMatched,
        isLocked,
        hasMonthlyCard: !!validMonthlyCard
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.vehicleExit = async (req, res, next) => {
  const schema = Joi.object({
    licensePlate: Joi.string().required(),
    exitGate: Joi.string().optional(),
    exitImage: Joi.string().optional(),
    paymentMethod: Joi.string().valid('wechat', 'alipay', 'cash', 'monthly_card').optional()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  try {
    const { licensePlate, exitGate, exitImage, paymentMethod } = req.body;

    const parkingRecord = await ParkingRecord.getActiveParkingByPlate(licensePlate);
    if (!parkingRecord) {
      return res.status(404).json({
        success: false,
        message: '未找到该车辆的停车记录'
      });
    }

    const exitTime = new Date();
    const reservation = parkingRecord.reservationId;
    
    const feeCalculation = ParkingRecord.calculateParkingFee(
      parkingRecord.vehicleType,
      parkingRecord.entryTime,
      exitTime,
      reservation
    );

    let totalFee = feeCalculation.totalFee;
    let discountAmount = 0;
    let paidAmount = 0;

    const user = parkingRecord.userId;
    let monthlyCard = null;
    if (user) {
      const userWithCards = await User.findById(user._id).populate('monthlyCards');
      monthlyCard = userWithCards?.getValidMonthlyCard();
    }

    if (monthlyCard && parkingRecord.isMonthlyCard) {
      discountAmount = totalFee;
      totalFee = 0;
      paidAmount = 0;
      
      await monthlyCard.deductUsage(feeCalculation.durationMinutes / 60);
    } else if (parkingRecord.status === 'locked') {
      totalFee += 50;
    }

    parkingRecord.exitTime = exitTime;
    parkingRecord.exitGate = exitGate;
    parkingRecord.exitImage = exitImage;
    parkingRecord.baseFee = feeCalculation.baseFee;
    parkingRecord.overtimeFee = feeCalculation.overtimeFee;
    parkingRecord.discountAmount = discountAmount;
    parkingRecord.totalFee = totalFee;
    parkingRecord.paidAmount = paidAmount;
    parkingRecord.paymentMethod = paymentMethod || (monthlyCard ? 'monthly_card' : 'unpaid');
    parkingRecord.paymentTime = totalFee === 0 ? new Date() : null;
    parkingRecord.status = totalFee > 0 ? 'locked' : 'completed';

    await parkingRecord.save();

    const space = await ParkingSpace.findById(parkingRecord.spaceId);
    if (space) {
      space.status = 'available';
      space.currentVehicle = undefined;
      space.currentReservation = undefined;
      await space.save();
    }

    if (reservation) {
      reservation.status = 'completed';
      reservation.checkedOutAt = exitTime;
      reservation.actualFee = totalFee;
      await reservation.save();

      if (moment(exitTime).isAfter(moment(reservation.endTime).add(30, 'minutes')) && user) {
        await ViolationRecord.checkAndAddViolation(
          user._id,
          licensePlate,
          'overtime',
          {
            parkingRecordId: parkingRecord._id,
            reservationId: reservation._id,
            spaceId: space?._id,
            description: `超时占位 ${Math.round(moment(exitTime).diff(moment(reservation.endTime), 'minutes'))} 分钟`,
            severity: 'minor',
            fineAmount: feeCalculation.overtimeFee
          }
        );
      }
    }

    if (user) {
      await Notification.createAndPush({
        userId: user._id,
        type: 'parking',
        title: '车辆出场结算',
        message: `您的车辆 ${licensePlate} 已出场。停车时长：${Math.floor(feeCalculation.durationMinutes / 60)}小时${feeCalculation.durationMinutes % 60}分钟，费用：${totalFee > 0 ? totalFee + '元' : '免费' + (discountAmount > 0 ? `（月卡抵扣${discountAmount}元）` : '')}`,
        data: { 
          parkingRecordId: parkingRecord._id,
          totalFee,
          discountAmount,
          durationMinutes: feeCalculation.durationMinutes,
          needPayment: totalFee > 0
        }
      }, io);
    }

    await Notification.broadcastToAdmins({
      type: 'admin',
      title: '车辆出场',
      message: `车辆 ${licensePlate} 已出场，费用：${totalFee}元`,
      data: { parkingRecordId: parkingRecord._id, licensePlate, totalFee }
    }, io);

    res.status(200).json({
      success: true,
      message: totalFee > 0 ? '请支付停车费后放行' : '车辆出场成功',
      data: {
        parkingRecord,
        feeDetails: feeCalculation,
        totalFee,
        discountAmount,
        needPayment: totalFee > 0,
        monthlyCardUsed: !!monthlyCard && parkingRecord.isMonthlyCard
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.payParkingFee = async (req, res, next) => {
  try {
    const parkingRecord = await ParkingRecord.findById(req.params.id);
    
    if (!parkingRecord) {
      return res.status(404).json({
        success: false,
        message: '停车记录不存在'
      });
    }

    if (parkingRecord.status !== 'locked' || parkingRecord.totalFee <= 0) {
      return res.status(400).json({
        success: false,
        message: '该停车记录无需支付'
      });
    }

    parkingRecord.paidAmount = parkingRecord.totalFee;
    parkingRecord.paymentMethod = req.body.paymentMethod || 'wechat';
    parkingRecord.paymentTime = new Date();
    parkingRecord.status = 'completed';
    await parkingRecord.save();

    if (parkingRecord.userId) {
      await Notification.createAndPush({
        userId: parkingRecord.userId,
        type: 'payment',
        title: '支付成功',
        message: `停车费 ${parkingRecord.totalFee} 元支付成功，车辆已解锁放行。`,
        data: { parkingRecordId: parkingRecord._id, amount: parkingRecord.totalFee }
      }, io);
    }

    res.status(200).json({
      success: true,
      message: '支付成功，车辆已解锁',
      data: parkingRecord
    });
  } catch (err) {
    next(err);
  }
};

exports.getParkingHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, startDate, endDate } = req.query;
    
    const query = { userId: req.user.id };
    if (startDate && endDate) {
      query.entryTime = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const skip = (page - 1) * limit;
    
    const records = await ParkingRecord.find(query)
      .sort({ entryTime: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('spaceId');

    const total = await ParkingRecord.countDocuments(query);

    const totalAmount = await ParkingRecord.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$totalFee' } } }
    ]);

    res.status(200).json({
      success: true,
      count: records.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      totalAmount: totalAmount[0]?.total || 0,
      data: records
    });
  } catch (err) {
    next(err);
  }
};

exports.getCurrentParking = async (req, res, next) => {
  try {
    const licensePlate = req.user.defaultPlate || req.user.licensePlates?.[0];
    
    if (!licensePlate) {
      return res.status(400).json({
        success: false,
        message: '请先绑定车牌号'
      });
    }

    const parking = await ParkingRecord.getActiveParkingByPlate(licensePlate);

    res.status(200).json({
      success: true,
      data: parking
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllParkingRecords = async (req, res, next) => {
  try {
    const { status, licensePlate, userId, page = 1, limit = 50 } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (licensePlate) query.licensePlate = new RegExp(licensePlate, 'i');
    if (userId) query.userId = userId;

    const skip = (page - 1) * limit;
    
    const records = await ParkingRecord.find(query)
      .sort({ entryTime: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('spaceId')
      .populate('userId', 'name phone');

    const total = await ParkingRecord.countDocuments(query);

    res.status(200).json({
      success: true,
      count: records.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: records
    });
  } catch (err) {
    next(err);
  }
};
