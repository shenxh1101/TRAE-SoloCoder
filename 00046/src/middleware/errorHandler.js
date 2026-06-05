class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  console.error('❌ 错误:', err);

  if (err.name === 'CastError') {
    const message = `资源未找到，无效的 ${err.path}`;
    error = new AppError(message, 404);
  }

  if (err.code === 11000) {
    const message = `重复的字段值: ${Object.keys(err.keyValue).join(', ')}`;
    error = new AppError(message, 400);
  }

  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new AppError(message, 400);
  }

  if (err.name === 'JsonWebTokenError') {
    error = new AppError('无效的Token，请重新登录', 401);
  }

  if (err.name === 'TokenExpiredError') {
    error = new AppError('Token已过期，请重新登录', 401);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = { AppError, errorHandler };
