require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const errorHandler = require('./middleware/errorHandler');
const { setupSocketIO } = require('./socket');
const { startScheduledTasks } = require('./tasks/scheduledTasks');

const reservationController = require('./controllers/reservationController');
const parkingController = require('./controllers/parkingController');
const monthlyCardController = require('./controllers/monthlyCardController');
const violationController = require('./controllers/violationController');

const authRoutes = require('./routes/auth');
const parkingSpaceRoutes = require('./routes/parkingSpaces');
const reservationRoutes = require('./routes/reservations');
const parkingRoutes = require('./routes/parking');
const monthlyCardRoutes = require('./routes/monthlyCards');
const violationRoutes = require('./routes/violations');
const reportRoutes = require('./routes/reports');
const notificationRoutes = require('./routes/notifications');

function createApp() {
  const app = express();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  app.set('io', io);

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  }

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000
  });
  app.use(limiter);

  reservationController.setSocketIO(io);
  parkingController.setSocketIO(io);
  monthlyCardController.setSocketIO(io);
  violationController.setSocketIO(io);

  setupSocketIO(io);

  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: '智能停车场综合管理系统 API',
      version: '1.0.0',
      endpoints: {
        auth: '/api/auth',
        parkingSpaces: '/api/parking-spaces',
        reservations: '/api/reservations',
        parking: '/api/parking',
        monthlyCards: '/api/monthly-cards',
        violations: '/api/violations',
        reports: '/api/reports',
        notifications: '/api/notifications'
      }
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/parking-spaces', parkingSpaceRoutes);
  app.use('/api/reservations', reservationRoutes);
  app.use('/api/parking', parkingRoutes);
  app.use('/api/monthly-cards', monthlyCardRoutes);
  app.use('/api/violations', violationRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/notifications', notificationRoutes);

  app.use(errorHandler);

  app.all('*', (req, res) => {
    res.status(404).json({
      success: false,
      message: `未找到 ${req.method} ${req.originalUrl}`
    });
  });

  return { app, server, io };
}

let serverInstance;

async function startServer() {
  const { connectDB } = require('./config/database');
  await connectDB();

  const { app, server, io } = createApp();

  startScheduledTasks(io);

  const PORT = process.env.PORT || 3000;

  serverInstance = server.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`Server running on port ${PORT}`);
    console.log(`API: http://localhost:${PORT}`);
    console.log(`WebSocket enabled`);
    console.log(`========================================\n`);
  });

  process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err.message);
  });

  return { app, server, io };
}

if (require.main === module) {
  startServer();
}

module.exports = { createApp, startServer };
