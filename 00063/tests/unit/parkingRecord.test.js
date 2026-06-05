const moment = require('moment');
const ParkingRecord = require('../../src/models/ParkingRecord');

describe('ParkingRecord.calculateParkingFee - 出场结算费用计算（纯逻辑）', () => {
  test('30分钟内免费', () => {
    const entry = new Date('2024-01-01T09:00:00');
    const exit = new Date('2024-01-01T09:25:00');
    const result = ParkingRecord.calculateParkingFee('standard', entry, exit);
    expect(result.baseFee).toBe(0);
    expect(result.totalFee).toBe(0);
    expect(result.durationMinutes).toBe(25);
  });

  test('恰好30分钟免费', () => {
    const entry = new Date('2024-01-01T09:00:00');
    const exit = new Date('2024-01-01T09:30:00');
    const result = ParkingRecord.calculateParkingFee('standard', entry, exit);
    expect(result.totalFee).toBe(0);
  });

  test('31分钟按1小时计费', () => {
    const entry = new Date('2024-01-01T09:00:00');
    const exit = new Date('2024-01-01T09:31:00');
    const result = ParkingRecord.calculateParkingFee('standard', entry, exit);
    expect(result.baseFee).toBe(8);
    expect(result.totalFee).toBe(8);
  });

  test('标准车型1小时费用', () => {
    const entry = new Date('2024-01-01T09:00:00');
    const exit = new Date('2024-01-01T10:00:00');
    const result = ParkingRecord.calculateParkingFee('standard', entry, exit);
    expect(result.baseFee).toBe(8);
    expect(result.totalFee).toBe(8);
  });

  test('标准车型3小时费用', () => {
    const entry = new Date('2024-01-01T09:00:00');
    const exit = new Date('2024-01-01T12:00:00');
    const result = ParkingRecord.calculateParkingFee('standard', entry, exit);
    expect(result.baseFee).toBe(8 + 2 * 5);
    expect(result.totalFee).toBe(18);
  });

  test('紧凑车型3小时费用', () => {
    const entry = new Date('2024-01-01T09:00:00');
    const exit = new Date('2024-01-01T12:00:00');
    const result = ParkingRecord.calculateParkingFee('compact', entry, exit);
    expect(result.baseFee).toBe(5 + 2 * 3);
    expect(result.totalFee).toBe(11);
  });

  test('大型车型3小时费用', () => {
    const entry = new Date('2024-01-01T09:00:00');
    const exit = new Date('2024-01-01T12:00:00');
    const result = ParkingRecord.calculateParkingFee('large', entry, exit);
    expect(result.baseFee).toBe(12 + 2 * 8);
    expect(result.totalFee).toBe(28);
  });

  test('超过30分钟后1小时按1小时计算', () => {
    const entry = new Date('2024-01-01T09:00:00');
    const exit = new Date('2024-01-01T09:45:00');
    const result = ParkingRecord.calculateParkingFee('standard', entry, exit);
    expect(result.baseFee).toBe(8);
    expect(result.totalFee).toBe(8);
  });

  test('24小时费用不超过日封顶', () => {
    const entry = new Date('2024-01-01T09:00:00');
    const exit = new Date('2024-01-02T09:00:00');
    const result = ParkingRecord.calculateParkingFee('standard', entry, exit);
    expect(result.totalFee).toBe(80);
  });

  test('超时费用按1.5倍费率计算', () => {
    const entry = new Date('2024-01-01T09:00:00');
    const exit = new Date('2024-01-01T14:00:00');
    const reservation = { endTime: new Date('2024-01-01T12:00:00') };
    const result = ParkingRecord.calculateParkingFee('standard', entry, exit, reservation);
    expect(result.baseFee).toBe(8 + 4 * 5);
    expect(result.overtimeFee).toBe(2 * 5 * 1.5);
    expect(result.overtimeFee).toBe(15);
    expect(result.totalFee).toBe(28 + 15);
  });

  test('无预约超时费为0', () => {
    const entry = new Date('2024-01-01T09:00:00');
    const exit = new Date('2024-01-01T14:00:00');
    const result = ParkingRecord.calculateParkingFee('standard', entry, exit, null);
    expect(result.overtimeFee).toBe(0);
  });

  test('1小时超时费计算', () => {
    const entry = new Date('2024-01-01T09:00:00');
    const exit = new Date('2024-01-01T13:00:00');
    const reservation = { endTime: new Date('2024-01-01T12:00:00') };
    const result = ParkingRecord.calculateParkingFee('standard', entry, exit, reservation);
    expect(result.overtimeFee).toBe(1 * 5 * 1.5);
    expect(result.overtimeFee).toBe(7.5);
  });

  test('紧凑车型日封顶50', () => {
    const entry = new Date('2024-01-01T09:00:00');
    const exit = new Date('2024-01-02T09:00:00');
    const result = ParkingRecord.calculateParkingFee('compact', entry, exit);
    expect(result.totalFee).toBe(50);
  });

  test('大型车型日封顶120', () => {
    const entry = new Date('2024-01-01T09:00:00');
    const exit = new Date('2024-01-02T09:00:00');
    const result = ParkingRecord.calculateParkingFee('large', entry, exit);
    expect(result.totalFee).toBe(120);
  });

  test('费用保留两位小数', () => {
    const entry = new Date('2024-01-01T09:00:00');
    const exit = new Date('2024-01-01T14:00:00');
    const reservation = { endTime: new Date('2024-01-01T12:00:00') };
    const result = ParkingRecord.calculateParkingFee('standard', entry, exit, reservation);
    expect(Number.isInteger(result.baseFee * 100)).toBe(true);
    expect(Number.isInteger(result.overtimeFee * 100)).toBe(true);
    expect(Number.isInteger(result.totalFee * 100)).toBe(true);
  });
});
