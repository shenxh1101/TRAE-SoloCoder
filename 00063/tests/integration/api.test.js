const request = require('supertest');
const mongoose = require('mongoose');
const { createApp } = require('../../src/server');
const User = require('../../src/models/User');
const ParkingSpace = require('../../src/models/ParkingSpace');
const { connectDB, disconnectDB, clearDB } = require('../helpers/dbHelper');

describe('API 集成测试（需MongoDB）', () => {
  let app, server, userToken, adminToken, testUser, testAdmin;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test_jwt_secret';
    process.env.JWT_EXPIRE = '1h';
    process.env.NODE_ENV = 'test';
    const ok = await connectDB();
    if (!ok) throw new Error('MongoDB connection failed');

    const result = createApp();
    app = result.app;
    server = result.server;

    testUser = await User.create({ phone: '13900012000', password: 'test123456', name: 'API测试用户', licensePlates: ['京A99999'], defaultPlate: '京A99999' });
    userToken = testUser.getSignedJwtToken();

    testAdmin = await User.create({ phone: '13800012000', password: 'admin123456', name: '管理员', role: 'admin' });
    adminToken = testAdmin.getSignedJwtToken();
  });

  afterAll(async () => {
    if (server) server.close();
    await disconnectDB();
  });

  afterEach(async () => {
    await clearDB();
    testUser = await User.create({ phone: '13900012000', password: 'test123456', name: 'API测试用户', licensePlates: ['京A99999'], defaultPlate: '京A99999' });
    userToken = testUser.getSignedJwtToken();
    testAdmin = await User.create({ phone: '13800012000', password: 'admin123456', name: '管理员', role: 'admin' });
    adminToken = testAdmin.getSignedJwtToken();
  });

  describe('Auth API', () => {
    test('POST /api/auth/register - 注册新用户', async () => {
      const res = await request(app).post('/api/auth/register').send({ phone: '13900013000', password: 'newuser123', name: '新注册用户', licensePlate: '京B88888' });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });

    test('POST /api/auth/login - 登录成功', async () => {
      const res = await request(app).post('/api/auth/login').send({ phone: '13900012000', password: 'test123456' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });

    test('POST /api/auth/login - 错误密码登录失败', async () => {
      const res = await request(app).post('/api/auth/login').send({ phone: '13900012000', password: 'wrongpassword' });
      expect(res.status).toBe(401);
    });

    test('GET /api/auth/me - 获取个人信息', async () => {
      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.phone).toBe('13900012000');
    });

    test('GET /api/auth/me - 未认证返回401', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('Parking Space API', () => {
    test('POST /api/parking-spaces - 管理员创建车位', async () => {
      const res = await request(app).post('/api/parking-spaces').set('Authorization', `Bearer ${adminToken}`).send({ spaceNumber: 'T001', zone: 'A', type: 'standard' });
      expect(res.status).toBe(201);
      expect(res.body.data.spaceNumber).toBe('T001');
    });

    test('POST /api/parking-spaces - 普通用户无权创建', async () => {
      const res = await request(app).post('/api/parking-spaces').set('Authorization', `Bearer ${userToken}`).send({ spaceNumber: 'T002', zone: 'A', type: 'standard' });
      expect(res.status).toBe(403);
    });

    test('GET /api/parking-spaces/stats - 车位统计', async () => {
      const res = await request(app).get('/api/parking-spaces/stats').set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('available');
    });
  });

  describe('Reservation API', () => {
    let spaceId;

    beforeEach(async () => {
      const space = await ParkingSpace.create({ spaceNumber: 'R001', zone: 'A', type: 'standard', status: 'available' });
      spaceId = space._id;
    });

    test('POST /api/reservations/calculate-fee - 计算费用', async () => {
      const res = await request(app).post('/api/reservations/calculate-fee').set('Authorization', `Bearer ${userToken}`).send({ vehicleType: 'standard', startTime: '2024-06-01T09:00:00', endTime: '2024-06-01T12:00:00' });
      expect(res.status).toBe(200);
      expect(res.body.data.calculatedFee).toBe(18);
    });

    test('POST /api/reservations - 创建预约', async () => {
      const start = new Date(); start.setHours(start.getHours() + 2);
      const end = new Date(start); end.setHours(end.getHours() + 3);
      const res = await request(app).post('/api/reservations').set('Authorization', `Bearer ${userToken}`).send({ spaceId: spaceId.toString(), licensePlate: '京A99999', vehicleType: 'standard', startTime: start.toISOString(), endTime: end.toISOString() });
      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('locked');
    });
  });

  describe('Monthly Card API', () => {
    test('GET /api/monthly-cards/plans - 获取套餐列表', async () => {
      const res = await request(app).get('/api/monthly-cards/plans').set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('basic');
      expect(res.body.data).toHaveProperty('business');
    });

    test('POST /api/monthly-cards/apply - 申请月卡', async () => {
      const res = await request(app).post('/api/monthly-cards/apply').set('Authorization', `Bearer ${userToken}`).send({ planType: 'basic' });
      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('pending');
    });
  });

  describe('Root endpoint', () => {
    test('GET / - 返回API信息', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.endpoints).toBeDefined();
    });
  });
});
