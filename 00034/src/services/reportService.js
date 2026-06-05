const { Parser } = require('json2csv');
const pointsService = require('./pointsService');
const couponService = require('./couponService');
const PointsRecord = require('../models/PointsRecord');
const Coupon = require('../models/Coupon');
const User = require('../models/User');
const Order = require('../models/Order');

const LEVEL_MAP = { normal: '普通会员', silver: '银卡会员', gold: '金卡会员' };
const TYPE_MAP = { earn: '获得', spend: '消耗', expire: '过期', adjust: '调整' };
const SOURCE_MAP = { order: '订单消费', exchange: '礼品兑换', expire: '过期扣除', admin: '管理员操作', activity: '活动赠送' };
const COUPON_TYPE_MAP = { fixed: '满减券', discount: '折扣券' };

const reportService = {
  exportPointsReport: async (year, month, memberLevel = null) => {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const matchStage = {
      createdAt: { $gte: startDate, $lte: endDate }
    };

    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' }
    ];

    if (memberLevel) {
      pipeline.push({ $match: { 'user.memberLevel': memberLevel } });
    }

    pipeline.push({
      $project: {
        _id: 0,
        日期: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        时间: { $dateToString: { format: '%H:%M:%S', date: '$createdAt' } },
        用户ID: { $toString: '$userId' },
        用户名: '$user.username',
        会员等级: {
          $switch: {
            branches: [
              { case: { $eq: ['$user.memberLevel', 'normal'] }, then: '普通会员' },
              { case: { $eq: ['$user.memberLevel', 'silver'] }, then: '银卡会员' },
              { case: { $eq: ['$user.memberLevel', 'gold'] }, then: '金卡会员' }
            ],
            default: '普通会员'
          }
        },
        变动类型: {
          $switch: {
            branches: Object.entries(TYPE_MAP).map(([k, v]) => ({ case: { $eq: ['$type', k] }, then: v })),
            default: '其他'
          }
        },
        来源: {
          $switch: {
            branches: Object.entries(SOURCE_MAP).map(([k, v]) => ({ case: { $eq: ['$source', k] }, then: v })),
            default: '其他'
          }
        },
        积分: '$points',
        剩余可用: '$remainingPoints',
        变动前余额: '$balanceBefore',
        变动后余额: '$balanceAfter',
        过期时间: { $dateToString: { format: '%Y-%m-%d', date: '$expireAt' } },
        描述: '$description'
      }
    });

    const records = await PointsRecord.aggregate(pipeline);

    const fields = ['日期', '时间', '用户ID', '用户名', '会员等级', '变动类型', '来源', '积分', '剩余可用', '变动前余额', '变动后余额', '过期时间', '描述'];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(records);

    const levelSuffix = memberLevel ? `_${LEVEL_MAP[memberLevel] || memberLevel}` : '';
    return {
      csv,
      filename: `积分明细报表_${year}年${month}月${levelSuffix}.csv`,
      data: records
    };
  },

  exportPointsSummary: async (year, month) => {
    const stats = await pointsService.getMonthlyPointsStats(year, month);
    const details = await pointsService.getMonthlyPointsDetails(year, month);

    const summaryData = [
      {
        统计项目: '积分发放',
        普通会员: stats.earn.normal,
        银卡会员: stats.earn.silver,
        金卡会员: stats.earn.gold,
        合计: stats.earn.normal + stats.earn.silver + stats.earn.gold
      },
      {
        统计项目: '积分消耗',
        普通会员: stats.spend.normal,
        银卡会员: stats.spend.silver,
        金卡会员: stats.spend.gold,
        合计: stats.spend.normal + stats.spend.silver + stats.spend.gold
      },
      {
        统计项目: '积分过期',
        普通会员: stats.expire.normal,
        银卡会员: stats.expire.silver,
        金卡会员: stats.expire.gold,
        合计: stats.expire.normal + stats.expire.silver + stats.expire.gold
      },
      {
        统计项目: '净增积分',
        普通会员: stats.earn.normal - stats.spend.normal - stats.expire.normal,
        银卡会员: stats.earn.silver - stats.spend.silver - stats.expire.silver,
        金卡会员: stats.earn.gold - stats.spend.gold - stats.expire.gold,
        合计: (stats.earn.normal + stats.earn.silver + stats.earn.gold)
            - (stats.spend.normal + stats.spend.silver + stats.spend.gold)
            - (stats.expire.normal + stats.expire.silver + stats.expire.gold)
      }
    ];

    const detailData = details.map(d => ({
      变动类型: TYPE_MAP[d._id.type] || d._id.type,
      来源: SOURCE_MAP[d._id.source] || d._id.source,
      会员等级: LEVEL_MAP[d._id.memberLevel] || d._id.memberLevel,
      积分总额: d.totalPoints,
      笔数: d.count
    }));

    const summaryFields = ['统计项目', '普通会员', '银卡会员', '金卡会员', '合计'];
    const json2csvParser = new Parser({ fields: summaryFields });
    const csv = json2csvParser.parse(summaryData);

    return {
      csv,
      filename: `积分统计汇总_${year}年${month}月.csv`,
      data: summaryData,
      detailBySourceAndLevel: detailData
    };
  },

  exportPointsSummaryByLevel: async (year, month) => {
    const stats = await pointsService.getMonthlyPointsStats(year, month);
    const levels = ['normal', 'silver', 'gold'];
    const result = [];

    for (const level of levels) {
      const earned = stats.earn[level];
      const spent = stats.spend[level];
      const expired = stats.expire[level];
      result.push({
        会员等级: LEVEL_MAP[level],
        积分发放: earned,
        积分消耗: spent,
        积分过期: expired,
        净增积分: earned - spent - expired,
        发放占比: stats.earn.normal + stats.earn.silver + stats.earn.gold > 0
          ? ((earned / (stats.earn.normal + stats.earn.silver + stats.earn.gold)) * 100).toFixed(2) + '%'
          : '0%'
      });
    }

    const fields = ['会员等级', '积分发放', '积分消耗', '积分过期', '净增积分', '发放占比'];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(result);

    return {
      csv,
      filename: `积分会员等级汇总_${year}年${month}月.csv`,
      data: result
    };
  },

  exportCouponReport: async (year, month) => {
    const stats = await couponService.getMonthlyCouponStats(year, month);

    const summaryData = [];

    stats.issued.forEach(stat => {
      const usedStat = stats.used.find(u => 
        u._id.type === stat._id.type && 
        u._id.memberLevel === stat._id.memberLevel
      );

      const totalIssued = stat.totalIssued;
      const totalUsed = usedStat ? usedStat.totalUsed : 0;
      const usageRate = totalIssued > 0 ? ((totalUsed / totalIssued) * 100).toFixed(2) + '%' : '0%';

      summaryData.push({
        月份: `${year}年${month}月`,
        券类型: COUPON_TYPE_MAP[stat._id.type] || stat._id.type,
        会员等级: LEVEL_MAP[stat._id.memberLevel] || stat._id.memberLevel,
        发放数量: totalIssued,
        核销数量: totalUsed,
        核销率: usageRate,
        发放总面额: stat.totalValue
      });
    });

    const fields = ['月份', '券类型', '会员等级', '发放数量', '核销数量', '核销率', '发放总面额'];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(summaryData);

    return {
      csv,
      filename: `优惠券核销率报表_${year}年${month}月.csv`,
      data: summaryData
    };
  },

  exportCouponDetails: async (year, month) => {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const coupons = await Coupon.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: { path: '$user', preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          _id: 0,
          券码: '$code',
          券名称: '$name',
          券类型: {
            $switch: {
              branches: Object.entries(COUPON_TYPE_MAP).map(([k, v]) => ({ case: { $eq: ['$type', k] }, then: v })),
              default: '其他'
            }
          },
          面值: '$value',
          使用门槛: '$minPurchase',
          会员等级: {
            $switch: {
              branches: Object.entries(LEVEL_MAP).map(([k, v]) => ({ case: { $eq: ['$user.memberLevel', k] }, then: v })),
              default: '全体用户'
            }
          },
          状态: {
            $switch: {
              branches: [
                { case: { $eq: ['$status', 'available'] }, then: '未使用' },
                { case: { $eq: ['$status', 'used'] }, then: '已使用' },
                { case: { $eq: ['$status', 'expired'] }, then: '已过期' }
              ],
              default: '未知'
            }
          },
          发放日期: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          有效期开始: { $dateToString: { format: '%Y-%m-%d', date: '$validFrom' } },
          有效期结束: { $dateToString: { format: '%Y-%m-%d', date: '$validUntil' } },
          使用日期: { $dateToString: { format: '%Y-%m-%d', date: '$usedAt' } },
          发放原因: '$issuedReason'
        }
      }
    ]);

    const fields = ['券码', '券名称', '券类型', '面值', '使用门槛', '会员等级', '状态', '发放日期', '有效期开始', '有效期结束', '使用日期', '发放原因'];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(coupons);

    return {
      csv,
      filename: `优惠券明细报表_${year}年${month}月.csv`,
      data: coupons
    };
  },

  getDashboardStats: async () => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalUsers = await User.countDocuments();
    const totalPointsIssued = await PointsRecord.aggregate([
      { $match: { type: 'earn' } },
      { $group: { _id: null, total: { $sum: '$points' } } }
    ]);

    const totalCouponsIssued = await Coupon.countDocuments();
    const totalCouponsUsed = await Coupon.countDocuments({ status: 'used' });

    const thisMonthOrders = await Order.countDocuments({
      createdAt: { $gte: thisMonth }
    });

    return {
      totalUsers,
      totalPointsIssued: totalPointsIssued[0]?.total || 0,
      totalCouponsIssued,
      totalCouponsUsed,
      couponUsageRate: totalCouponsIssued > 0 
        ? ((totalCouponsUsed / totalCouponsIssued) * 100).toFixed(2) + '%' 
        : '0%',
      thisMonthOrders
    };
  }
};

module.exports = reportService;
