const Coupon = require('../models/Coupon');
const User = require('../models/User');

const couponService = {
  generateCouponCode: () => {
    return 'CPN' + Date.now().toString(36).toUpperCase() + 
           Math.random().toString(36).substr(2, 4).toUpperCase();
  },

  createCoupon: async (couponData) => {
    const code = couponData.code || couponService.generateCouponCode();
    const coupon = new Coupon({
      ...couponData,
      code
    });
    await coupon.save();
    return coupon;
  },

  issueCouponToUser: async (userId, couponTemplate, reason) => {
    const code = couponService.generateCouponCode();
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + (couponTemplate.validDays || 30));

    const coupon = new Coupon({
      code,
      name: couponTemplate.name,
      type: couponTemplate.type,
      value: couponTemplate.value,
      minPurchase: couponTemplate.minPurchase || 0,
      userId,
      targetLevel: 'all',
      validFrom: new Date(),
      validUntil,
      issuedReason: reason
    });

    await coupon.save();
    return coupon;
  },

  issueCouponsToUserGroup: async (userIds, couponTemplate, reason) => {
    const coupons = [];
    for (const userId of userIds) {
      const coupon = await couponService.issueCouponToUser(userId, couponTemplate, reason);
      coupons.push(coupon);
    }
    return coupons;
  },

  findInactiveUsers: async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return await User.find({
      lastLoginAt: { $lt: thirtyDaysAgo }
    });
  },

  findHighActivityUsers: async () => {
    return await User.find({
      totalOrders: { $gte: 10 },
      totalSpent: { $gte: 5000 }
    });
  },

  issueInactiveUserCoupons: async () => {
    const inactiveUsers = await couponService.findInactiveUsers();
    const userIds = inactiveUsers.map(u => u._id);
    
    const couponTemplate = {
      name: '回归专享券',
      type: 'fixed',
      value: 50,
      minPurchase: 200,
      validDays: 15
    };

    const coupons = await couponService.issueCouponsToUserGroup(
      userIds,
      couponTemplate,
      '30天未登录用户定向发放'
    );

    return {
      issuedCount: coupons.length,
      coupons
    };
  },

  issueHighActivityCoupons: async () => {
    const highActivityUsers = await couponService.findHighActivityUsers();
    const userIds = highActivityUsers.map(u => u._id);
    
    const couponTemplate = {
      name: '活跃用户专享折扣券',
      type: 'discount',
      value: 10,
      minPurchase: 500,
      validDays: 30
    };

    const coupons = await couponService.issueCouponsToUserGroup(
      userIds,
      couponTemplate,
      '高活跃度用户定向发放'
    );

    return {
      issuedCount: coupons.length,
      coupons
    };
  },

  getUserCoupons: async (userId, status = null) => {
    const query = { userId };
    if (status) {
      query.status = status;
    }
    return await Coupon.find(query).sort({ createdAt: -1 });
  },

  getValidUserCoupons: async (userId) => {
    const now = new Date();
    return await Coupon.find({
      userId,
      status: 'available',
      validFrom: { $lte: now },
      validUntil: { $gte: now }
    }).sort({ validUntil: 1 });
  },

  getCouponById: async (couponId) => {
    return await Coupon.findById(couponId);
  },

  useCoupon: async (couponId, orderId, orderAmount) => {
    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      throw new Error('优惠券不存在');
    }

    if (!coupon.isValid()) {
      throw new Error('优惠券不可用');
    }

    if (orderAmount < coupon.minPurchase) {
      throw new Error('订单金额未达到使用门槛');
    }

    coupon.status = 'used';
    coupon.usedAt = new Date();
    coupon.orderId = orderId;
    await coupon.save();

    const discount = coupon.type === 'fixed' 
      ? coupon.value 
      : orderAmount * (coupon.value / 100);

    return {
      coupon,
      discount: Math.min(discount, orderAmount)
    };
  },

  getMonthlyCouponStats: async (year, month) => {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const issuedCoupons = await Coupon.aggregate([
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
        $group: {
          _id: {
            type: '$type',
            memberLevel: { $ifNull: ['$user.memberLevel', 'unknown'] }
          },
          totalIssued: { $sum: 1 },
          totalValue: { $sum: '$value' }
        }
      }
    ]);

    const usedCoupons = await Coupon.aggregate([
      {
        $match: {
          usedAt: { $gte: startDate, $lte: endDate },
          status: 'used'
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
        $group: {
          _id: {
            type: '$type',
            memberLevel: { $ifNull: ['$user.memberLevel', 'unknown'] }
          },
          totalUsed: { $sum: 1 }
        }
      }
    ]);

    return {
      issued: issuedCoupons,
      used: usedCoupons
    };
  },

  findBestCoupon: async (userId, orderAmount) => {
    const validCoupons = await couponService.getValidUserCoupons(userId);
    
    if (validCoupons.length === 0) {
      return null;
    }

    let bestCoupon = null;
    let maxDiscount = 0;

    for (const coupon of validCoupons) {
      if (orderAmount >= coupon.minPurchase) {
        const discount = coupon.type === 'fixed'
          ? coupon.value
          : orderAmount * (coupon.value / 100);
        
        if (discount > maxDiscount) {
          maxDiscount = discount;
          bestCoupon = coupon;
        }
      }
    }

    return bestCoupon ? { coupon: bestCoupon, discount: maxDiscount } : null;
  }
};

module.exports = couponService;
