const User = require('../models/User');
const Joi = require('joi');

exports.register = async (req, res, next) => {
  const schema = Joi.object({
    phone: Joi.string().pattern(/^1[3-9]\d{9}$/).required(),
    password: Joi.string().min(6).required(),
    name: Joi.string().required(),
    licensePlate: Joi.string().optional()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  try {
    const { phone, password, name, licensePlate } = req.body;

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '该手机号已注册'
      });
    }

    const userData = {
      phone,
      password,
      name,
      licensePlates: licensePlate ? [licensePlate] : [],
      defaultPlate: licensePlate
    };

    const user = await User.create(userData);

    const token = user.getSignedJwtToken();

    res.status(201).json({
      success: true,
      message: '注册成功',
      token,
      data: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  const schema = Joi.object({
    phone: Joi.string().pattern(/^1[3-9]\d{9}$/).required(),
    password: Joi.string().required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  try {
    const { phone, password } = req.body;

    const user = await User.findOne({ phone }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '手机号或密码错误'
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: '手机号或密码错误'
      });
    }

    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      message: '登录成功',
      token,
      data: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        violationCount: user.violationCount,
        isBookingRestricted: user.isBookingRestricted
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('monthlyCards');

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().optional(),
    defaultPlate: Joi.string().optional(),
    licensePlates: Joi.array().items(Joi.string()).optional()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  try {
    const updateData = {};
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.defaultPlate !== undefined) updateData.defaultPlate = req.body.defaultPlate;
    if (req.body.licensePlates !== undefined) updateData.licensePlates = req.body.licensePlates;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: '更新成功',
      data: user
    });
  } catch (err) {
    next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  const schema = Joi.object({
    oldPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  try {
    const user = await User.findById(req.user.id).select('+password');

    const isMatch = await user.matchPassword(req.body.oldPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: '原密码错误'
      });
    }

    user.password = req.body.newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: '密码修改成功'
    });
  } catch (err) {
    next(err);
  }
};
