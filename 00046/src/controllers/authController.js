const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, department, position, phone } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('该邮箱已被注册', 400));
    }

    const user = await User.create({
      name, email, password, role, department, position, phone
    });

    user.password = undefined;
    const token = user.getSignedJwtToken();

    res.status(201).json({
      success: true,
      token,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError('请提供邮箱和密码', 400));
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return next(new AppError('邮箱或密码错误', 401));
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return next(new AppError('邮箱或密码错误', 401));
    }

    user.password = undefined;
    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      token,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return next(new AppError('用户不存在', 404));
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: '已登出',
      token: null
    });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, department, position, phone, avatar } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, department, position, phone, avatar },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};
