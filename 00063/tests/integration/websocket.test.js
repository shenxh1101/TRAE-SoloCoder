const { Server } = require('socket.io');
const { io: ioClient } = require('socket.io-client');
const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Notification = require('../../src/models/Notification');
const User = require('../../src/models/User');
const { connectDB, disconnectDB, clearDB } = require('../helpers/dbHelper');

describe('WebSocket 实时推送（需MongoDB）', () => {
  let ioServer, server, clientSocket, userId, userToken;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test_jwt_secret';
    process.env.JWT_EXPIRE = '1h';
    process.env.NODE_ENV = 'test';
    const ok = await connectDB();
    if (!ok) throw new Error('MongoDB connection failed');

    const user = await User.create({ phone: '13900015000', password: 'test123456', name: 'WS测试' });
    userId = user._id;
    userToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1h' });

    server = http.createServer();
    ioServer = new Server(server);
    ioServer.use((socket, next) => {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error'));
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        next();
      } catch (err) {
        next(new Error('Authentication error'));
      }
    });
    ioServer.on('connection', (socket) => { socket.join(`user:${socket.userId}`); });

    await new Promise((resolve) => { server.listen(0, resolve); });
    const port = server.address().port;
    clientSocket = ioClient(`http://localhost:${port}`, { auth: { token: userToken }, transports: ['websocket'] });
    await new Promise((resolve) => { clientSocket.on('connect', resolve); });
  });

  afterAll(async () => {
    if (clientSocket) clientSocket.disconnect();
    if (ioServer) ioServer.close();
    if (server) server.close();
    await disconnectDB();
  });

  afterEach(async () => {
    await clearDB();
  });

  test('客户端成功连接', () => {
    expect(clientSocket.connected).toBe(true);
  });

  test('接收个人通知推送', async () => {
    const notificationPromise = new Promise((resolve) => { clientSocket.on('notification', resolve); });
    await Notification.createAndPush({ userId, type: 'reservation', title: '测试通知', message: '测试推送', data: { test: true } }, ioServer);
    const data = await notificationPromise;
    expect(data.title).toBe('测试通知');
    expect(data.message).toBe('测试推送');
    expect(data.type).toBe('reservation');
    clientSocket.off('notification');
  });

  test('多条通知依次推送', async () => {
    const received = [];
    const allReceived = new Promise((resolve) => {
      let count = 0;
      clientSocket.on('notification', (data) => { received.push(data); if (++count === 3) resolve(); });
    });
    await Notification.createAndPush({ userId, type: 'parking', title: '通知1', message: 'm1', data: {} }, ioServer);
    await Notification.createAndPush({ userId, type: 'payment', title: '通知2', message: 'm2', data: {} }, ioServer);
    await Notification.createAndPush({ userId, type: 'violation', title: '通知3', message: 'm3', data: {} }, ioServer);
    await allReceived;
    expect(received).toHaveLength(3);
    expect(received[0].title).toBe('通知1');
    clientSocket.off('notification');
  });

  test('通知在数据库中持久化', async () => {
    await Notification.createAndPush({ userId, type: 'system', title: '持久化测试', message: '存储测试', data: {} }, ioServer);
    const saved = await Notification.findOne({ userId, title: '持久化测试' });
    expect(saved).not.toBeNull();
    expect(saved.isPushed).toBe(true);
    expect(saved.pushChannels).toContain('websocket');
  });

  test('管理员广播通知', async () => {
    const admin = await User.create({ phone: '13800015000', password: 'admin123456', name: 'WS管理员', role: 'admin' });
    const adminToken = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const adminSocket = ioClient(`http://localhost:${server.address().port}`, { auth: { token: adminToken }, transports: ['websocket'] });
    await new Promise((resolve) => { adminSocket.on('connect', resolve); });
    const adminNotif = new Promise((resolve) => { adminSocket.on('notification', resolve); });
    await Notification.broadcastToAdmins({ type: 'admin', title: '管理员广播', message: '紧急通知' }, ioServer);
    const data = await adminNotif;
    expect(data.title).toBe('管理员广播');
    adminSocket.disconnect();
  });

  test('无WebSocket连接时通知仍保存到数据库', async () => {
    const disconnectedUserId = new mongoose.Types.ObjectId();
    const notification = await Notification.createAndPush({ userId: disconnectedUserId, type: 'system', title: '离线通知', message: '用户不在线', data: {} }, ioServer);
    expect(notification.title).toBe('离线通知');
    const saved = await Notification.findById(notification._id);
    expect(saved).not.toBeNull();
  });

  test('标记通知已读', async () => {
    const notification = await Notification.create({ userId, type: 'reservation', title: '已读测试', message: '标记已读' });
    await Notification.markAsRead(userId, notification._id);
    const updated = await Notification.findById(notification._id);
    expect(updated.isRead).toBe(true);
    expect(updated.readAt).toBeDefined();
  });

  test('获取未读数量', async () => {
    await Notification.create([
      { userId, type: 'reservation', title: '未读1', message: 'm1', isRead: false },
      { userId, type: 'reservation', title: '未读2', message: 'm2', isRead: false },
      { userId, type: 'reservation', title: '已读', message: 'm3', isRead: true }
    ]);
    const count = await Notification.getUnreadCount(userId);
    expect(count).toBe(2);
  });
});
