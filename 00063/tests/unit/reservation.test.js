const mongoose = require('mongoose');
const moment = require('moment');
const Reservation = require('../../src/models/Reservation');
const ParkingSpace = require('../../src/models/ParkingSpace');
const User = require('../../src/models/User');
const { connectDB, disconnectDB, clearDB, isConnected } = require('../helpers/dbHelper');

describe('Reservation.calculateFee - 预约费用计算（纯逻辑）', () => {
  test('标准车型1小时费用', () => {
    const start = new Date('2024-01-01T09:00:00');
    const end = new Date('2024-01-01T10:00:00');
    const fee = Reservation.calculateFee('standard', start, end);
    expect(fee).toBe(8);
  });

  test('标准车型3小时费用', () => {
    const start = new Date('2024-01-01T09:00:00');
    const end = new Date('2024-01-01T12:00:00');
    const fee = Reservation.calculateFee('standard', start, end);
    expect(fee).toBe(8 + 2 * 5);
  });

  test('紧凑车型2小时费用', () => {
    const start = new Date('2024-01-01T09:00:00');
    const end = new Date('2024-01-01T11:00:00');
    const fee = Reservation.calculateFee('compact', start, end);
    expect(fee).toBe(5 + 1 * 3);
  });

  test('大型车型2小时费用', () => {
    const start = new Date('2024-01-01T09:00:00');
    const end = new Date('2024-01-01T11:00:00');
    const fee = Reservation.calculateFee('large', start, end);
    expect(fee).toBe(12 + 1 * 8);
  });

  test('标准车型24小时费用不超过日封顶80', () => {
    const start = new Date('2024-01-01T09:00:00');
    const end = new Date('2024-01-02T09:00:00');
    const fee = Reservation.calculateFee('standard', start, end);
    expect(fee).toBe(80);
  });

  test('紧凑车型24小时费用不超过日封顶50', () => {
    const start = new Date('2024-01-01T09:00:00');
    const end = new Date('2024-01-02T09:00:00');
    const fee = Reservation.calculateFee('compact', start, end);
    expect(fee).toBe(50);
  });

  test('大型车型24小时费用不超过日封顶120', () => {
    const start = new Date('2024-01-01T09:00:00');
    const end = new Date('2024-01-02T09:00:00');
    const fee = Reservation.calculateFee('large', start, end);
    expect(fee).toBe(120);
  });

  test('不足1小时按1小时计算', () => {
    const start = new Date('2024-01-01T09:00:00');
    const end = new Date('2024-01-01T09:30:00');
    const fee = Reservation.calculateFee('standard', start, end);
    expect(fee).toBe(8);
  });

  test('1小时30分钟按2小时计算', () => {
    const start = new Date('2024-01-01T09:00:00');
    const end = new Date('2024-01-01T10:30:00');
    const fee = Reservation.calculateFee('standard', start, end);
    expect(fee).toBe(8 + 5);
  });

  test('未知车型使用标准费率', () => {
    const start = new Date('2024-01-01T09:00:00');
    const end = new Date('2024-01-01T10:00:00');
    const fee = Reservation.calculateFee('unknown', start, end);
    expect(fee).toBe(8);
  });

  test('标准车型5小时费用', () => {
    const start = new Date('2024-01-01T09:00:00');
    const end = new Date('2024-01-01T14:00:00');
    const fee = Reservation.calculateFee('standard', start, end);
    expect(fee).toBe(8 + 4 * 5);
  });
});

describe('Reservation 数据库操作（需MongoDB）', () => {
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

  describe('findConflictReservations - 预约冲突检测', () => {
    let spaceId, userId;

    beforeEach(async () => {
      const space = await ParkingSpace.create({ spaceNumber: 'A001', zone: 'A', type: 'standard', status: 'available' });
      spaceId = space._id;
      const user = await User.create({ phone: '13900001111', password: 'test123456', name: '冲突测试' });
      userId = user._id;
    });

    test('无冲突时返回空数组', async () => {
      const conflicts = await Reservation.findConflictReservations(spaceId, new Date('2024-01-01T09:00:00'), new Date('2024-01-01T12:00:00'));
      expect(conflicts).toHaveLength(0);
    });

    test('完全重叠的时段有冲突', async () => {
      await Reservation.create({ userId, spaceId, licensePlate: '京A12345', vehicleType: 'standard', startTime: new Date('2024-01-01T09:00:00'), endTime: new Date('2024-01-01T12:00:00'), durationHours: 3, calculatedFee: 18, status: 'confirmed' });
      const conflicts = await Reservation.findConflictReservations(spaceId, new Date('2024-01-01T09:00:00'), new Date('2024-01-01T12:00:00'));
      expect(conflicts).toHaveLength(1);
    });

    test('部分重叠（开始时间在已有预约中）有冲突', async () => {
      await Reservation.create({ userId, spaceId, licensePlate: '京A12345', vehicleType: 'standard', startTime: new Date('2024-01-01T09:00:00'), endTime: new Date('2024-01-01T12:00:00'), durationHours: 3, calculatedFee: 18, status: 'confirmed' });
      const conflicts = await Reservation.findConflictReservations(spaceId, new Date('2024-01-01T10:00:00'), new Date('2024-01-01T14:00:00'));
      expect(conflicts).toHaveLength(1);
    });

    test('不重叠的时段无冲突', async () => {
      await Reservation.create({ userId, spaceId, licensePlate: '京A12345', vehicleType: 'standard', startTime: new Date('2024-01-01T09:00:00'), endTime: new Date('2024-01-01T12:00:00'), durationHours: 3, calculatedFee: 18, status: 'confirmed' });
      const conflicts = await Reservation.findConflictReservations(spaceId, new Date('2024-01-01T12:00:00'), new Date('2024-01-01T18:00:00'));
      expect(conflicts).toHaveLength(0);
    });

    test('已取消的预约不产生冲突', async () => {
      await Reservation.create({ userId, spaceId, licensePlate: '京A12345', vehicleType: 'standard', startTime: new Date('2024-01-01T09:00:00'), endTime: new Date('2024-01-01T12:00:00'), durationHours: 3, calculatedFee: 18, status: 'cancelled' });
      const conflicts = await Reservation.findConflictReservations(spaceId, new Date('2024-01-01T09:00:00'), new Date('2024-01-01T12:00:00'));
      expect(conflicts).toHaveLength(0);
    });

    test('排除指定预约ID', async () => {
      const existing = await Reservation.create({ userId, spaceId, licensePlate: '京A12345', vehicleType: 'standard', startTime: new Date('2024-01-01T09:00:00'), endTime: new Date('2024-01-01T12:00:00'), durationHours: 3, calculatedFee: 18, status: 'confirmed' });
      const conflicts = await Reservation.findConflictReservations(spaceId, new Date('2024-01-01T09:00:00'), new Date('2024-01-01T12:00:00'), existing._id);
      expect(conflicts).toHaveLength(0);
    });
  });

  describe('findAvailableSlots - 推荐空闲时段', () => {
    let spaceId, userId;

    beforeEach(async () => {
      const space = await ParkingSpace.create({ spaceNumber: 'A002', zone: 'A', type: 'standard', status: 'available' });
      spaceId = space._id;
      const user = await User.create({ phone: '13900002222', password: 'test123456', name: '时段测试' });
      userId = user._id;
    });

    test('无预约时全天可用', async () => {
      const slots = await Reservation.findAvailableSlots(spaceId, new Date('2024-01-01'), 2);
      expect(slots.length).toBeGreaterThanOrEqual(1);
      expect(slots[0].durationMinutes).toBeGreaterThanOrEqual(120);
    });

    test('有一个预约时产生两个空闲时段', async () => {
      await Reservation.create({ userId, spaceId, licensePlate: '京B12345', vehicleType: 'standard', startTime: new Date('2024-01-01T12:00:00'), endTime: new Date('2024-01-01T14:00:00'), durationHours: 2, calculatedFee: 13, status: 'confirmed' });
      const slots = await Reservation.findAvailableSlots(spaceId, new Date('2024-01-01'), 2);
      expect(slots.length).toBe(2);
    });
  });

  describe('ParkingSpace.isAvailableAt - 车位可用性', () => {
    let space, userId;

    beforeEach(async () => {
      space = await ParkingSpace.create({ spaceNumber: 'A003', zone: 'A', type: 'standard', status: 'available' });
      const user = await User.create({ phone: '13900003333', password: 'test123456', name: '可用性测试' });
      userId = user._id;
    });

    test('无预约时车位可用', async () => {
      const available = await space.isAvailableAt(new Date('2024-01-01T09:00:00'), new Date('2024-01-01T12:00:00'));
      expect(available).toBe(true);
    });

    test('有冲突预约时车位不可用', async () => {
      await Reservation.create({ userId, spaceId: space._id, licensePlate: '京C12345', vehicleType: 'standard', startTime: new Date('2024-01-01T09:00:00'), endTime: new Date('2024-01-01T12:00:00'), durationHours: 3, calculatedFee: 18, status: 'confirmed' });
      const available = await space.isAvailableAt(new Date('2024-01-01T10:00:00'), new Date('2024-01-01T14:00:00'));
      expect(available).toBe(false);
    });
  });
});
