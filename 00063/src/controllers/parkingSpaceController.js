const ParkingSpace = require('../models/ParkingSpace');
const Reservation = require('../models/Reservation');
const Joi = require('joi');

exports.getParkingSpaces = async (req, res, next) => {
  try {
    const { zone, type, status, page = 1, limit = 50 } = req.query;
    
    const query = {};
    if (zone) query.zone = zone;
    if (type) query.type = type;
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    
    const spaces = await ParkingSpace.find(query)
      .sort({ zone: 1, spaceNumber: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ParkingSpace.countDocuments(query);

    res.status(200).json({
      success: true,
      count: spaces.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: spaces
    });
  } catch (err) {
    next(err);
  }
};

exports.getParkingSpace = async (req, res, next) => {
  try {
    const space = await ParkingSpace.findById(req.params.id)
      .populate('activeReservations');
    
    if (!space) {
      return res.status(404).json({
        success: false,
        message: '车位不存在'
      });
    }

    res.status(200).json({
      success: true,
      data: space
    });
  } catch (err) {
    next(err);
  }
};

exports.createParkingSpace = async (req, res, next) => {
  const schema = Joi.object({
    spaceNumber: Joi.string().required(),
    zone: Joi.string().valid('A', 'B', 'C', 'D', 'E').required(),
    type: Joi.string().valid('compact', 'standard', 'large', 'disabled').required(),
    floor: Joi.number().optional(),
    sensorId: Joi.string().optional()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  try {
    const existing = await ParkingSpace.findOne({ spaceNumber: req.body.spaceNumber });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: '车位编号已存在'
      });
    }

    const space = await ParkingSpace.create(req.body);

    res.status(201).json({
      success: true,
      message: '车位创建成功',
      data: space
    });
  } catch (err) {
    next(err);
  }
};

exports.updateParkingSpace = async (req, res, next) => {
  try {
    const space = await ParkingSpace.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!space) {
      return res.status(404).json({
        success: false,
        message: '车位不存在'
      });
    }

    res.status(200).json({
      success: true,
      message: '车位更新成功',
      data: space
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteParkingSpace = async (req, res, next) => {
  try {
    const space = await ParkingSpace.findById(req.params.id);
    if (!space) {
      return res.status(404).json({
        success: false,
        message: '车位不存在'
      });
    }

    const activeReservations = await Reservation.find({
      spaceId: req.params.id,
      status: { $in: ['pending', 'confirmed', 'locked', 'checked_in'] }
    });

    if (activeReservations.length > 0) {
      return res.status(400).json({
        success: false,
        message: '该车位有活跃预约，无法删除'
      });
    }

    await space.deleteOne();

    res.status(200).json({
      success: true,
      message: '车位删除成功'
    });
  } catch (err) {
    next(err);
  }
};

exports.getSpaceAvailability = async (req, res, next) => {
  const schema = Joi.object({
    startTime: Joi.date().required(),
    endTime: Joi.date().required(),
    zone: Joi.string().valid('A', 'B', 'C', 'D', 'E').optional(),
    type: Joi.string().valid('compact', 'standard', 'large', 'disabled').optional()
  });

  const { error } = schema.validate(req.query);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  try {
    const { startTime, endTime, zone, type } = req.query;
    
    const query = { status: 'available' };
    if (zone) query.zone = zone;
    if (type) query.type = type;

    const spaces = await ParkingSpace.find(query);
    const availableSpaces = [];

    for (const space of spaces) {
      const isAvailable = await space.isAvailableAt(new Date(startTime), new Date(endTime));
      if (isAvailable) {
        availableSpaces.push(space);
      }
    }

    res.status(200).json({
      success: true,
      count: availableSpaces.length,
      data: availableSpaces
    });
  } catch (err) {
    next(err);
  }
};

exports.getSpaceAvailableSlots = async (req, res, next) => {
  try {
    const { date, durationHours = 2 } = req.query;
    
    const slots = await Reservation.findAvailableSlots(
      req.params.id,
      date ? new Date(date) : new Date(),
      parseInt(durationHours)
    );

    res.status(200).json({
      success: true,
      count: slots.length,
      data: slots
    });
  } catch (err) {
    next(err);
  }
};

exports.getParkingStats = async (req, res, next) => {
  try {
    const totalSpaces = await ParkingSpace.countDocuments();
    const occupiedSpaces = await ParkingSpace.countDocuments({ status: 'occupied' });
    const reservedSpaces = await ParkingSpace.countDocuments({ status: 'reserved' });
    const availableSpaces = await ParkingSpace.countDocuments({ status: 'available' });
    const maintenanceSpaces = await ParkingSpace.countDocuments({ status: 'maintenance' });

    const zoneStats = await ParkingSpace.aggregate([
      {
        $group: {
          _id: '$zone',
          total: { $sum: 1 },
          occupied: { $sum: { $cond: [{ $eq: ['$status', 'occupied'] }, 1, 0] } },
          available: { $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] } }
        }
      },
      {
        $project: {
          zone: '$_id',
          total: 1,
          occupied: 1,
          available: 1,
          utilizationRate: { $round: [{ $multiply: [{ $divide: ['$occupied', '$total'] }, 100] }, 2] }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        total: totalSpaces,
        occupied: occupiedSpaces,
        reserved: reservedSpaces,
        available: availableSpaces,
        maintenance: maintenanceSpaces,
        utilizationRate: totalSpaces > 0 
          ? Math.round((occupiedSpaces / totalSpaces) * 10000) / 100 
          : 0,
        zoneStats
      }
    });
  } catch (err) {
    next(err);
  }
};
