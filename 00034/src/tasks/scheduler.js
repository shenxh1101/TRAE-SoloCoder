const cron = require('node-cron');
const pointsService = require('../services/pointsService');
const couponService = require('../services/couponService');
const User = require('../models/User');
const PointsRecord = require('../models/PointsRecord');

const scheduler = {
  sendPointsExpiryReminder: async () => {
    console.log('开始执行积分过期提醒任务...');
    
    const now = new Date();
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    const thirtyDaysBefore = new Date(endOfYear);
    thirtyDaysBefore.setDate(thirtyDaysBefore.getDate() - 30);

    if (now >= thirtyDaysBefore && now <= endOfYear) {
      const users = await User.find({ availablePoints: { $gt: 0 } });
      
      const reminderResults = [];
      for (const user of users) {
        const expiringInfo = await pointsService.getExpiringPoints(user._id);
        if (expiringInfo.expiringPoints > 0) {
          reminderResults.push({
            userId: user._id,
            username: user.username,
            expiringPoints: expiringInfo.expiringPoints,
            expireDate: expiringInfo.expireDate
          });
          console.log(`提醒用户 ${user.username}: ${expiringInfo.expiringPoints} 积分将于12月31日过期`);
        }
      }
      
      console.log(`积分过期提醒完成，共提醒 ${reminderResults.length} 位用户`);
      return reminderResults;
    }
    
    console.log('当前不在提醒周期内（12月1日-12月31日）');
    return [];
  },

  expirePoints: async () => {
    console.log('开始执行积分过期扣除任务（12月31日当天）...');
    
    const now = new Date();
    const isLastDayOfYear = now.getMonth() === 11 && now.getDate() === 31;

    if (!isLastDayOfYear) {
      console.log('今天不是12月31日，跳过积分过期扣除');
      return [];
    }

    const users = await User.find({ availablePoints: { $gt: 0 } });

    const expireResults = [];
    for (const user of users) {
      const { expiredPoints, expiredRecords } = await pointsService.getExpiredPointsForUser(user._id);
      
      if (expiredPoints > 0) {
        const result = await pointsService.expirePoints(user._id, expiredPoints, 'yearly-expire');
        if (result) {
          for (const record of expiredRecords) {
            record.remainingPoints = 0;
            await record.save();
          }

          expireResults.push({
            userId: user._id,
            username: user.username,
            expiredPoints
          });
          console.log(`用户 ${user.username} 过期扣除积分: ${expiredPoints}`);
        }
      }
    }

    console.log(`积分过期扣除完成，共扣除 ${expireResults.length} 位用户的过期积分`);
    return expireResults;
  },

  issueBehaviorCoupons: async () => {
    console.log('开始执行用户行为优惠券发放任务...');
    
    const inactiveResult = await couponService.issueInactiveUserCoupons();
    const highActivityResult = await couponService.issueHighActivityCoupons();
    
    console.log(`行为定向优惠券发放完成: 休眠用户 ${inactiveResult.issuedCount} 张, 活跃用户 ${highActivityResult.issuedCount} 张`);
    
    return {
      inactiveUsers: inactiveResult,
      highActivityUsers: highActivityResult
    };
  },

  checkCouponExpiry: async () => {
    console.log('开始检查过期优惠券...');
    
    const Coupon = require('../models/Coupon');
    const now = new Date();
    
    const expiredCoupons = await Coupon.updateMany(
      {
        status: 'available',
        validUntil: { $lt: now }
      },
      { status: 'expired' }
    );
    
    console.log(`已将 ${expiredCoupons.modifiedCount} 张过期优惠券标记为过期`);
    return expiredCoupons;
  }
};

const scheduleTasks = () => {
  cron.schedule('0 9 * * *', async () => {
    await scheduler.sendPointsExpiryReminder();
  });

  cron.schedule('0 2 31 12 *', async () => {
    await scheduler.expirePoints();
  });

  cron.schedule('0 0 1 * *', async () => {
    await scheduler.issueBehaviorCoupons();
  });

  cron.schedule('0 0 * * *', async () => {
    await scheduler.checkCouponExpiry();
  });

  console.log('定时任务已启动:');
  console.log('  - 积分过期提醒: 每天 09:00 (12月1日-31日期间执行)');
  console.log('  - 积分过期扣除: 每年 12月31日 02:00');
  console.log('  - 行为定向发券: 每月 1日 00:00');
  console.log('  - 优惠券过期检查: 每天 00:00');
};

module.exports = { scheduleTasks, scheduler };
