import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import './config/db.js';
import { startReminderJob } from './jobs/reminderJob.js';

import authRoutes from './routes/authRoutes.js';
import petRoutes from './routes/petRoutes.js';
import packageRoutes from './routes/packageRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import caregiverRoutes from './routes/caregiverRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/caregivers', caregiverRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '宠物寄养系统API运行正常' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || '服务器内部错误',
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '路由不存在',
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
  console.log(`环境: ${process.env.NODE_ENV}`);
  
  startReminderJob();
});

process.on('unhandledRejection', (err) => {
  console.error(`错误: ${err.message}`);
  server.close(() => process.exit(1));
});

export default app;
