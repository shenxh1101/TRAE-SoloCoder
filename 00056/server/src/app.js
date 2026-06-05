require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const store = require('./models/store');
const websocketService = require('./services/websocketService');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const serviceRoutes = require('./routes/service');
const rescueRoutes = require('./routes/rescue');
const adminRoutes = require('./routes/admin');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/service', serviceRoutes);
app.use('/api/v1/rescue', rescueRoutes);
app.use('/api/v1/admin', adminRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() });
});

app.use((req, res) => {
  res.status(404).json({ code: 404, message: '接口不存在', data: null, timestamp: Date.now() });
});

app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ code: 500, message: err.message || '服务器内部错误', data: null, timestamp: Date.now() });
});

store.init();
const seed = require('./data/seed');
seed(store);

websocketService.attach(server);

server.listen(PORT, () => {
  console.log(`🚗 车护达后端服务已启动`);
  console.log(`📡 HTTP服务: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket服务: ws://localhost:${PORT}`);
  console.log(`📊 健康检查: http://localhost:${PORT}/health`);
});

module.exports = app;
