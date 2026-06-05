const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  console.error('Error:', err);

  if (err.name === 'CastError') {
    const message = `资源不存在，ID: ${err.value}`;
    error = { statusCode: 404, message };
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    const message = `重复的字段值: ${field}`;
    error = { statusCode: 400, message };
  }

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    error = { statusCode: 400, message: messages.join(', ') };
  }

  if (err.name === 'JsonWebTokenError') {
    error = { statusCode: 401, message: '无效的token' };
  }

  if (err.name === 'TokenExpiredError') {
    error = { statusCode: 401, message: 'token已过期' };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || '服务器内部错误',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorHandler;
