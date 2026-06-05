const User = require('../models/User');
const PointsRecord = require('../models/PointsRecord');

const pointsService = {
  calculatePoints: (amount, memberLevel) => {
    const multipliers = {
      normal: 1,
      silver: 1.2,
      gold: 1.5
    };
    const multiplier = multipliers[memberLevel] || 1;
    return Math.floor(amount * multiplier);
  },

  addPoints: async (userId, points, source, sourceId, description) => {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    const balanceBefore = user.availablePoints;
    const balanceAfter = balanceBefore + points;

    const now = new Date();
    const expireAt = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    if (expireAt <= now) {
      expireAt.setFullYear(expireAt.getFullYear() + 1);
    }

    const record = new PointsRecord({
      userId,
      type: 'earn',
      points,
      remainingPoints: points,
      balanceBefore,
      balanceAfter,
      source,
      sourceId,
      description,
      expireAt
    });

    await record.save();

    user.availablePoints = balanceAfter;
    user.totalPoints += points;
    await user.save();

    return { user, record };
  },

  deductPoints: async (userId, points, source, sourceId, description) => {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    if (user.availablePoints < points) {
      throw new Error('积分不足');
    }

    const earnRecords = await PointsRecord.find({
      userId,
      type: 'earn',
      remainingPoints: { $gt: 0 }
    }).sort({ createdAt: 1 });

    let pointsToDeduct = points;
    for (const record of earnRecords) {
      if (pointsToDeduct <= 0) break;
      const deductFromThis = Math.min(record.remainingPoints, pointsToDeduct);
      record.remainingPoints -= deductFromThis;
      pointsToDeduct -= deductFromThis;
      await record.save();
    }

    const balanceBefore = user.availablePoints;
    const balanceAfter = balanceBefore - points;

    const spendRecord = new PointsRecord({
      userId,
      type: 'spend',
      points,
      remainingPoints: 0,
      balanceBefore,
      balanceAfter,
      source,
      sourceId,
      description
    });

    await spendRecord.save();

    user.availablePoints = balanceAfter;
    await user.save();

    return { user, record: spendRecord };
  },

  expirePoints: async (userId, points, sourceId) => {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    const balanceBefore = user.availablePoints;
    const actualExpirePoints = Math.min(points, balanceBefore);
    const balanceAfter = balanceBefore - actualExpirePoints;

    if (actualExpirePoints <= 0) {
      return null;
    }

    const record = new PointsRecord({
      userId,
      type: 'expire',
      points: actualExpirePoints,
      remainingPoints: 0,
      balanceBefore,
      balanceAfter,
      source: 'expire',
      sourceId,
      description: '积分过期自动扣除'
    });

    await record.save();

    user.availablePoints = balanceAfter;
    await user.save();

    return { user, record };
  },

  getUserPointsRecords: async (userId, page = 1, limit = 20) => {
    const skip = (page - 1) * limit;
    const records = await PointsRecord.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await PointsRecord.countDocuments({ userId });

    return {
      records,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  },

  getExpiringPoints: async (userId) => {
    const now = new Date();
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

    const expiringRecords = await PointsRecord.find({
      userId,
      type: 'earn',
      remainingPoints: { $gt: 0 },
      expireAt: { $lte: endOfYear, $gt: now }
    });

    const expiringPoints = expiringRecords.reduce(
      (sum, record) => sum + record.remainingPoints, 0
    );

    return {
      expiringPoints,
      expireDate: endOfYear
    };
  },

  getExpiredPointsForUser: async (userId) => {
    const now = new Date();
    const expiredRecords = await PointsRecord.find({
      userId,
      type: 'earn',
      remainingPoints: { $gt: 0 },
      expireAt: { $lte: now }
    });

    const expiredPoints = expiredRecords.reduce(
      (sum, record) => sum + record.remainingPoints, 0
    );

    return { expiredPoints, expiredRecords };
  },

  getMonthlyPointsStats: async (year, month) => {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const stats = await PointsRecord.aggregate([
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
        $unwind: '$user'
      },
      {
        $group: {
          _id: {
            type: '$type',
            memberLevel: '$user.memberLevel'
          },
          totalPoints: { $sum: '$points' },
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      earn: { normal: 0, silver: 0, gold: 0 },
      spend: { normal: 0, silver: 0, gold: 0 },
      expire: { normal: 0, silver: 0, gold: 0 }
    };

    stats.forEach(stat => {
      const type = stat._id.type;
      const level = stat._id.memberLevel;
      if (result[type] && result[type][level] !== undefined) {
        result[type][level] = stat.totalPoints;
      }
    });

    return result;
  },

  getMonthlyPointsDetails: async (year, month) => {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const details = await PointsRecord.aggregate([
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
        $unwind: '$user'
      },
      {
        $group: {
          _id: {
            type: '$type',
            source: '$source',
            memberLevel: '$user.memberLevel'
          },
          totalPoints: { $sum: '$points' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.type': 1, '_id.memberLevel': 1, '_id.source': 1 }
      }
    ]);

    return details;
  }
};

module.exports = pointsService;
