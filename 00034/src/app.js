require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB, checkDBConnection, gracefulShutdown } = require('./config/database');
const { scheduleTasks } = require('./tasks/scheduler');

const userRoutes = require('./routes/userRoutes');
const pointsRoutes = require('./routes/pointsRoutes');
const giftRoutes = require('./routes/giftRoutes');
const couponRoutes = require('./routes/couponRoutes');
const orderRoutes = require('./routes/orderRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', async (req, res) => {
  const dbStatus = await checkDBConnection();
  const isHealthy = dbStatus.connected;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    message: '会员积分与优惠券管理系统',
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

app.use('/api/users', userRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/gifts', giftRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reports', reportRoutes);

const startServer = async () => {
  try {
    console.log('正在连接数据库...');
    await connectDB();
    console.log('数据库连接成功');

    scheduleTasks();

    const PORT = process.env.PORT || 3000;
    const server = app.listen(PORT, () => {
      console.log(`========================================`);
      console.log(`  服务器启动成功`);
      console.log(`  端口: ${PORT}`);
      console.log(`  环境: ${process.env.NODE_ENV || 'development'}`);
      console.log(`  健康检查: http://localhost:${PORT}/health`);
      console.log(`========================================`);
    });

    const shutdown = async (signal) => {
      console.log(`\n收到 ${signal} 信号，正在关闭服务器...`);
      server.close(async () => {
        await gracefulShutdown();
        console.log('服务器已关闭');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('服务器启动失败:', error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;
