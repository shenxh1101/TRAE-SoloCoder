const mongoose = require('mongoose');
const moment = require('moment');
const OperationReport = require('../../src/models/OperationReport');
const ParkingSpace = require('../../src/models/ParkingSpace');
const ParkingRecord = require('../../src/models/ParkingRecord');
const ViolationRecord = require('../../src/models/ViolationRecord');
const User = require('../../src/models/User');
const Reservation = require('../../src/models/Reservation');
const MonthlyCard = require('../../src/models/MonthlyCard');
const { connectDB, disconnectDB, clearDB } = require('../helpers/dbHelper');

describe('OperationReport 数据库操作（需MongoDB）', () => {
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

  test('生成空日报表', async () => {
    await ParkingSpace.create([
      { spaceNumber: 'A001', zone: 'A', type: 'standard', status: 'available' },
      { spaceNumber: 'A002', zone: 'A', type: 'standard', status: 'available' },
      { spaceNumber: 'B001', zone: 'B', type: 'compact', status: 'available' },
      { spaceNumber: 'C001', zone: 'C', type: 'large', status: 'available' }
    ]);
    const report = await OperationReport.generateDailyReport(new Date('2024-01-01'));
    expect(report).toBeDefined();
    expect(report.reportType).toBe('daily');
    expect(report.totalSpaces).toBe(4);
    expect(report.totalParkings).toBe(0);
    expect(report.totalRevenue).toBe(0);
  });

  test('包含区域统计', async () => {
    await ParkingSpace.create([
      { spaceNumber: 'A011', zone: 'A', type: 'standard', status: 'available' },
      { spaceNumber: 'A012', zone: 'A', type: 'standard', status: 'available' }
    ]);
    const report = await OperationReport.generateDailyReport(new Date('2024-01-01'));
    const zoneA = report.zoneStats.find(z => z.zone === 'A');
    expect(zoneA).toBeDefined();
    expect(zoneA.totalSpaces).toBe(2);
  });

  test('包含24小时统计', async () => {
    await ParkingSpace.create([{ spaceNumber: 'A021', zone: 'A', type: 'standard', status: 'available' }]);
    const report = await OperationReport.generateDailyReport(new Date('2024-01-01'));
    expect(report.hourlyStats).toHaveLength(24);
  });

  test('统计停车记录和收入', async () => {
    await ParkingSpace.create([{ spaceNumber: 'A031', zone: 'A', type: 'standard', status: 'available' }]);
    const today = new Date();
    await ParkingRecord.create([
      { licensePlate: '京A12345', vehicleType: 'standard', entryTime: moment(today).hour(9).toDate(), exitTime: moment(today).hour(12).toDate(), status: 'completed', totalFee: 18, paymentTime: new Date() },
      { licensePlate: '京B12345', vehicleType: 'compact', entryTime: moment(today).hour(10).toDate(), exitTime: moment(today).hour(14).toDate(), status: 'completed', totalFee: 14, paymentTime: new Date() }
    ]);
    const report = await OperationReport.generateDailyReport(today);
    expect(report.totalParkings).toBe(2);
    expect(report.totalRevenue).toBe(32);
  });

  test('统计违约事件', async () => {
    await ParkingSpace.create([{ spaceNumber: 'A041', zone: 'A', type: 'standard', status: 'available' }]);
    const user = await User.create({ phone: '13900011111', password: 'test123456', name: '报表测试' });
    const today = new Date();
    await ViolationRecord.create([
      { userId: user._id, licensePlate: '京A12345', type: 'overtime', typeName: '超时占位', detectedAt: moment(today).hour(15).toDate() },
      { userId: user._id, licensePlate: '京A12345', type: 'wrong_zone', typeName: '违规停放区域', detectedAt: moment(today).hour(16).toDate() }
    ]);
    const report = await OperationReport.generateDailyReport(today);
    expect(report.violationCount).toBe(2);
  });

  test('无日报表时周报返回null', async () => {
    const result = await OperationReport.generateWeeklyReport(new Date('2024-01-01'));
    expect(result).toBeNull();
  });
});
