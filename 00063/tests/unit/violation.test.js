const mongoose = require('mongoose');
const ViolationRecord = require('../../src/models/ViolationRecord');
const User = require('../../src/models/User');
const Notification = require('../../src/models/Notification');
const ParkingSpace = require('../../src/models/ParkingSpace');
const { connectDB, disconnectDB, clearDB } = require('../helpers/dbHelper');

describe('ViolationRecord 静态属性（纯逻辑）', () => {
  test('TYPE_DESCRIPTIONS 包含5种违规类型', () => {
    const types = ViolationRecord.TYPE_DESCRIPTIONS;
    expect(Object.keys(types)).toHaveLength(5);
    expect(types.overtime).toBe('超时占位');
    expect(types.wrong_zone).toBe('违规停放区域');
    expect(types.no_reservation).toBe('无预约占用');
    expect(types.disabled_abuse).toBe('滥用残疾人车位');
    expect(types.other).toBe('其他违规');
  });
});

describe('ViolationRecord 数据库操作（需MongoDB）', () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = 'test_jwt_secret';
    process.env.JWT_EXPIRE = '1h';
    process.env.NODE_ENV = 'test';
    const ok = await connectDB();
    if (!ok) throw new Error('MongoDB connection failed');
  });

  afterAll(async () => {
    await disconnectDB();
  });

  afterEach(async () => {
    await clearDB();
  });

  describe('checkAndAddViolation', () => {
    let userId, spaceId;

    beforeEach(async () => {
      const user = await User.create({ phone: '13900006666', password: 'test123456', name: '违约测试', violationCount: 0, isBookingRestricted: false });
      userId = user._id;
      const space = await ParkingSpace.create({ spaceNumber: 'D001', zone: 'D', type: 'standard', status: 'available' });
      spaceId = space._id;
    });

    test('创建超时占位违规记录', async () => {
      const violation = await ViolationRecord.checkAndAddViolation(userId, '京A12345', 'overtime', { spaceId, description: '超时30分钟', severity: 'minor' });
      expect(violation.type).toBe('overtime');
      expect(violation.typeName).toBe('超时占位');
      expect(violation.severity).toBe('minor');
      expect(violation.status).toBe('pending');
    });

    test('第一次违约不限制预约权限', async () => {
      await ViolationRecord.checkAndAddViolation(userId, '京A12345', 'overtime', { spaceId });
      const user = await User.findById(userId);
      expect(user.violationCount).toBe(1);
      expect(user.isBookingRestricted).toBe(false);
    });

    test('累计3次违约限制预约权限', async () => {
      await ViolationRecord.checkAndAddViolation(userId, '京A12345', 'overtime', { spaceId });
      await ViolationRecord.checkAndAddViolation(userId, '京A12345', 'wrong_zone', { spaceId });
      await ViolationRecord.checkAndAddViolation(userId, '京A12345', 'no_reservation', { spaceId });
      const user = await User.findById(userId);
      expect(user.violationCount).toBe(3);
      expect(user.isBookingRestricted).toBe(true);
    });

    test('创建违规时自动发送通知', async () => {
      await ViolationRecord.checkAndAddViolation(userId, '京A12345', 'overtime', { spaceId });
      const notifications = await Notification.find({ userId, type: 'violation' });
      expect(notifications).toHaveLength(1);
      expect(notifications[0].title).toBe('违规停车通知');
    });

    test('第3次违约通知包含限制提示', async () => {
      await ViolationRecord.checkAndAddViolation(userId, '京A12345', 'overtime', { spaceId });
      await ViolationRecord.checkAndAddViolation(userId, '京A12345', 'wrong_zone', { spaceId });
      await ViolationRecord.checkAndAddViolation(userId, '京A12345', 'no_reservation', { spaceId });
      const notifications = await Notification.find({ userId, type: 'violation' });
      const last = notifications[notifications.length - 1];
      expect(last.message).toContain('预约权限已被限制');
    });
  });

  describe('instance methods', () => {
    let violation;

    beforeEach(async () => {
      const user = await User.create({ phone: '13900007777', password: 'test123456', name: '实例测试' });
      violation = await ViolationRecord.create({ userId: user._id, licensePlate: '京A12345', type: 'overtime', typeName: '超时占位', fineAmount: 50, status: 'pending' });
    });

    test('payFine - 缴纳罚款', async () => {
      await violation.payFine();
      const updated = await ViolationRecord.findById(violation._id);
      expect(updated.isPaid).toBe(true);
      expect(updated.paidAt).toBeDefined();
      expect(updated.status).toBe('resolved');
    });

    test('appeal - 违规申诉', async () => {
      await violation.appeal('因紧急情况导致超时');
      const updated = await ViolationRecord.findById(violation._id);
      expect(updated.status).toBe('appealed');
      expect(updated.userAppeal).toBe('因紧急情况导致超时');
    });
  });

  describe('clearViolations', () => {
    let userId, adminId;

    beforeEach(async () => {
      const user = await User.create({ phone: '13900008888', password: 'test123456', name: '清除测试', violationCount: 3, isBookingRestricted: true });
      userId = user._id;
      const admin = await User.create({ phone: '13800008888', password: 'admin123456', name: '管理员', role: 'admin' });
      adminId = admin._id;
      await ViolationRecord.create([
        { userId, licensePlate: '京A12345', type: 'overtime', typeName: '超时占位', status: 'pending' },
        { userId, licensePlate: '京A12345', type: 'wrong_zone', typeName: '违规停放区域', status: 'confirmed' }
      ]);
    });

    test('清除违约记录重置用户状态', async () => {
      await ViolationRecord.clearViolations(userId, adminId, '表现良好');
      const user = await User.findById(userId);
      expect(user.violationCount).toBe(0);
      expect(user.isBookingRestricted).toBe(false);
    });

    test('清除违约后发送通知', async () => {
      await ViolationRecord.clearViolations(userId, adminId);
      const notifications = await Notification.find({ userId, type: 'system', title: '违规记录已清除' });
      expect(notifications).toHaveLength(1);
    });
  });
});
