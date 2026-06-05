const Gift = require('../models/Gift');
const ExchangeRecord = require('../models/ExchangeRecord');
const pointsService = require('./pointsService');

const giftService = {
  createGift: async (giftData) => {
    const gift = new Gift(giftData);
    await gift.save();
    return gift;
  },

  getGiftList: async (page = 1, limit = 20, category = null) => {
    const query = category ? { category, status: 'active' } : { status: 'active' };
    const skip = (page - 1) * limit;
    
    const gifts = await Gift.find(query)
      .sort({ pointsRequired: 1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Gift.countDocuments(query);

    return {
      gifts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  },

  getGiftById: async (giftId) => {
    return await Gift.findById(giftId);
  },

  findAlternativeGifts: async (gift, userPoints) => {
    const alternatives = await Gift.find({
      _id: { $ne: gift._id },
      status: 'active',
      stock: { $gt: 0 },
      category: gift.category,
      pointsRequired: { $lte: userPoints }
    })
    .sort({ pointsRequired: 1 })
    .limit(5);

    return alternatives;
  },

  exchangeGift: async (userId, giftId, quantity = 1) => {
    const gift = await Gift.findById(giftId);
    if (!gift) {
      throw new Error('礼品不存在');
    }

    if (!gift.isAvailable()) {
      const alternatives = await giftService.findAlternativeGifts(gift, 999999);
      return {
        success: false,
        error: '礼品不可兑换',
        alternatives
      };
    }

    if (gift.stock < quantity) {
      const alternatives = await giftService.findAlternativeGifts(gift, 999999);
      return {
        success: false,
        error: '库存不足',
        alternatives
      };
    }

    const totalPoints = gift.pointsRequired * quantity;

    const User = require('../models/User');
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    if (user.availablePoints < totalPoints) {
      const alternatives = await giftService.findAlternativeGifts(gift, user.availablePoints);
      return {
        success: false,
        error: '积分不足',
        alternatives
      };
    }

    const { record } = await pointsService.deductPoints(
      userId,
      totalPoints,
      'exchange',
      giftId,
      `兑换礼品: ${gift.name} x${quantity}`
    );

    await gift.decreaseStock(quantity);

    const exchangeRecord = new ExchangeRecord({
      userId,
      giftId,
      giftName: gift.name,
      pointsSpent: totalPoints,
      quantity,
      status: 'completed',
      pointsRecordId: record._id
    });
    await exchangeRecord.save();

    return {
      success: true,
      exchangeRecord,
      gift,
      pointsSpent: totalPoints,
      userPoints: user.availablePoints - totalPoints
    };
  },

  getUserExchangeRecords: async (userId, page = 1, limit = 20) => {
    const skip = (page - 1) * limit;
    const records = await ExchangeRecord.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await ExchangeRecord.countDocuments({ userId });

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

  updateGift: async (giftId, updateData) => {
    return await Gift.findByIdAndUpdate(giftId, updateData, { new: true });
  },

  deleteGift: async (giftId) => {
    return await Gift.findByIdAndUpdate(
      giftId,
      { status: 'inactive' },
      { new: true }
    );
  }
};

module.exports = giftService;
