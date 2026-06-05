const mongoose = require('mongoose');
const moment = require('moment');
const MonthlyCard = require('../../src/models/MonthlyCard');
const User = require('../../src/models/User');
const ParkingSpace = require('../../src/models/ParkingSpace');
const ParkingRecord = require('../../src/models/ParkingRecord');
const { connectDB, disconnectDB, clearDB } = require('../helpers/dbHelper');

describe('MonthlyCard.PLANS - 月卡套餐配置（纯逻辑）', () => {
  test('包含4种套餐', () => {
    const plans = MonthlyCard.PLANS;
    expect(Object.keys(plans)).toHaveLength(4);
    expect(plans.basic).toBeDefined();
    expect(plans.standard).toBeDefined();
    expect(plans.premium).toBeDefined();
    expect(plans.business).toBeDefined();
  });

  test('套餐价格递增', () => {
    const plans = MonthlyCard.PLANS;
    expect(plans.basic.price).toBeLessThan(plans.standard.price);
    expect(plans.standard.price).toBeLessThan(plans.premium.price);
    expect(plans.premium.price).toBeLessThan(plans.business.price);
  });

  test('尊享和商务月卡包含全部区域', () => {
    const plans = MonthlyCard.PLANS;
    expect(plans.premium.zones).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(plans.business.zones).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  test('基础月卡不包含A/B区', () => {
    const plans = MonthlyCard.PLANS;
    expect(plans.basic.zones).not.toContain('A');
    expect(plans.basic.zones).not.toContain('B');
  });

  test('标准月卡不包含A区', () => {
    const plans = MonthlyCard.PLANS;
    expect(plans.standard.zones).not.toContain('A');
    expect(plans.standard.zones).toContain('B');
  });

  test('每个套餐都有名称和描述', () => {
    const plans = MonthlyCard.PLANS;
    for (const [key, plan] of Object.entries(plans)) {
      expect(plan.name).toBeDefined();
      expect(plan.description).toBeDefined();
      expect(plan.price).toBeGreaterThan(0);
      expect(plan.durationDays).toBeGreaterThan(0);
    }
  });

  test('每个套餐都有有效区域配置', () => {
    const plans = MonthlyCard.PLANS;
    for (const [key, plan] of Object.entries(plans)) {
      expect(plan.zones.length).toBeGreaterThan(0);
      for (const zone of plan.zones) {
        expect(['A', 'B', 'C', 'D', 'E']).toContain(zone);
      }
    }
  });
});

describe('MonthlyCard 数据库操作（需MongoDB）', () => {
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

  test('isValid - 有效月卡', async () => {
    const user = await User.create({ phone: '13900004444', password: 'test123456', name: '月卡测试' });
    const card = await MonthlyCard.create({
      userId: user._id, planType: 'standard', planName: '标准月卡', price: 500,
      durationDays: 30, includedZones: ['B', 'C', 'D', 'E'],
      startTime: new Date(), expireAt: moment().add(30, 'days').toDate(), status: 'active'
    });
    expect(card.isValid()).toBe(true);
  });

  test('isValid - 过期月卡无效', async () => {
    const user = await User.create({ phone: '13900004445', password: 'test123456', name: '月卡测试' });
    const card = await MonthlyCard.create({
      userId: user._id, planType: 'basic', planName: '基础月卡', price: 300,
      durationDays: 30, includedZones: ['C', 'D', 'E'],
      startTime: moment().subtract(60, 'days').toDate(),
      expireAt: moment().subtract(30, 'days').toDate(), status: 'active'
    });
    expect(card.isValid()).toBe(false);
  });

  test('isValid - 待审批月卡无效', async () => {
    const user = await User.create({ phone: '13900004446', password: 'test123456', name: '月卡测试' });
    const card = await MonthlyCard.create({
      userId: user._id, planType: 'basic', planName: '基础月卡', price: 300,
      durationDays: 30, includedZones: ['C', 'D', 'E'],
      startTime: new Date(), expireAt: moment().add(30, 'days').toDate(), status: 'pending'
    });
    expect(card.isValid()).toBe(false);
  });

  test('canUseZone - 检查区域权限', async () => {
    const user = await User.create({ phone: '13900004447', password: 'test123456', name: '月卡测试' });
    const card = await MonthlyCard.create({
      userId: user._id, planType: 'basic', planName: '基础月卡', price: 300,
      durationDays: 30, includedZones: ['C', 'D', 'E'],
      startTime: new Date(), expireAt: moment().add(30, 'days').toDate(), status: 'active'
    });
    expect(card.canUseZone('C')).toBe(true);
    expect(card.canUseZone('A')).toBe(false);
  });

  test('deductUsage - 扣减使用量', async () => {
    const user = await User.create({ phone: '13900004448', password: 'test123456', name: '月卡测试' });
    const card = await MonthlyCard.create({
      userId: user._id, planType: 'standard', planName: '标准月卡', price: 500,
      durationDays: 30, includedZones: ['B', 'C', 'D', 'E'],
      startTime: new Date(), expireAt: moment().add(30, 'days').toDate(), status: 'active'
    });
    await card.deductUsage(5);
    const updated = await MonthlyCard.findById(card._id);
    expect(updated.totalUsageHours).toBe(5);
    expect(updated.totalParkings).toBe(1);
    expect(updated.lastUsedAt).toBeDefined();
  });

  test('renew - 续费月卡', async () => {
    const user = await User.create({ phone: '13900004449', password: 'test123456', name: '月卡测试' });
    const card = await MonthlyCard.create({
      userId: user._id, planType: 'standard', planName: '标准月卡', price: 500,
      durationDays: 30, includedZones: ['B', 'C', 'D', 'E'],
      startTime: moment().subtract(15, 'days').toDate(),
      expireAt: moment().add(15, 'days').toDate(), status: 'active'
    });
    await card.renew();
    const updated = await MonthlyCard.findById(card._id);
    expect(updated.status).toBe('active');
    expect(new Date(updated.expireAt) > new Date()).toBe(true);
  });

  test('recommendPlan - 无停车记录推荐基础月卡', async () => {
    const user = await User.create({ phone: '13900005555', password: 'test123456', name: '推荐测试' });
    const result = await MonthlyCard.recommendPlan(user._id);
    expect(result.recommended).toBe('basic');
  });

  test('recommendPlan - 高频停车推荐尊享月卡', async () => {
    const user = await User.create({ phone: '13900005556', password: 'test123456', name: '推荐测试' });
    const space = await ParkingSpace.create({ spaceNumber: 'C002', zone: 'C', type: 'standard' });
    const records = [];
    for (let i = 0; i < 22; i++) {
      records.push({
        userId: user._id, spaceId: space._id, licensePlate: '京A12345', vehicleType: 'standard',
        entryTime: moment().subtract(30 - i, 'days').toDate(),
        exitTime: moment().subtract(30 - i, 'days').add(10, 'hours').toDate(),
        status: 'completed', totalFee: 48
      });
    }
    await ParkingRecord.create(records);
    const result = await MonthlyCard.recommendPlan(user._id);
    expect(result.recommended).toBe('premium');
  });
});
