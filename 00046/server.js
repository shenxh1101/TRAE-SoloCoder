require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const connectDB = require('./src/config/database');
const { errorHandler } = require('./src/middleware/errorHandler');

const authRoutes = require('./src/routes/auth');
const jobRoutes = require('./src/routes/jobs');
const screeningRoutes = require('./src/routes/screening');
const interviewRoutes = require('./src/routes/interviews');
const offerRoutes = require('./src/routes/offers');
const backgroundCheckRoutes = require('./src/routes/backgroundChecks');
const reportRoutes = require('./src/routes/reports');
const userRoutes = require('./src/routes/users');
const candidateRoutes = require('./src/routes/candidates');

const app = express();

if (require.main === module) {
  connectDB();
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/jobs', jobRoutes);
app.use('/api/v1/candidates', candidateRoutes);
app.use('/api/v1/screening', screeningRoutes);
app.use('/api/v1/interviews', interviewRoutes);
app.use('/api/v1/offers', offerRoutes);
app.use('/api/v1/background-checks', backgroundCheckRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/users', userRoutes);

app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: '智能人才招聘与筛选系统API运行正常',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `路由 ${req.originalUrl} 不存在`
  });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

let server;
if (require.main === module) {
  server = app.listen(PORT, () => {
    console.log(`🚀 服务器运行在端口 ${PORT}`);
    console.log(`📡 API健康检查: http://localhost:${PORT}/api/v1/health`);
  });
}

process.on('unhandledRejection', (err, promise) => {
  console.error(`错误: ${err.message}`);
  console.error(err.stack);
  if (server) server.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
  console.log('👋 SIGTERM 收到，正在关闭服务器');
  if (server) {
    server.close(() => {
      console.log('💤 服务器已关闭');
      mongoose.connection.close(false, () => {
        console.log('💤 MongoDB 连接已关闭');
        process.exit(0);
      });
    });
  }
});

module.exports = app;
