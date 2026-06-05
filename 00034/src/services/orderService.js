const Order = require('../models/Order');
const User = require('../models/User');
const pointsService = require('./pointsService');
const couponService = require('./couponService');

const orderService = {
  createOrder: async (userId, items, couponId = null) => {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    const totalAmount = items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    let couponDiscount = 0;
    let usedCoupon = null;

    if (couponId) {
      const result = await couponService.useCoupon(couponId, null, totalAmount);
      couponDiscount = result.discount;
      usedCoupon = result.coupon;
    }

    const finalAmount = Math.max(0, totalAmount - couponDiscount);

    const pointsEarned = pointsService.calculatePoints(finalAmount, user.memberLevel);

    const order = new Order({
      userId,
      totalAmount,
      pointsEarned,
      couponId: usedCoupon ? usedCoupon._id : null,
      couponDiscount,
      finalAmount,
      items
    });

    await order.save();

    if (usedCoupon) {
      usedCoupon.orderId = order._id;
      await usedCoupon.save();
    }

    return order;
  },

  createOrderWithBestCoupon: async (userId, items) => {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    const totalAmount = items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    const bestCouponResult = await couponService.findBestCoupon(userId, totalAmount);
    
    let couponDiscount = 0;
    let usedCoupon = null;

    if (bestCouponResult) {
      const result = await couponService.useCoupon(
        bestCouponResult.coupon._id,
        null,
        totalAmount
      );
      couponDiscount = result.discount;
      usedCoupon = result.coupon;
    }

    const finalAmount = Math.max(0, totalAmount - couponDiscount);

    const pointsEarned = pointsService.calculatePoints(finalAmount, user.memberLevel);

    const order = new Order({
      userId,
      totalAmount,
      pointsEarned,
      couponId: usedCoupon ? usedCoupon._id : null,
      couponDiscount,
      finalAmount,
      items
    });

    await order.save();

    if (usedCoupon) {
      usedCoupon.orderId = order._id;
      await usedCoupon.save();
    }

    return {
      order,
      appliedCoupon: usedCoupon,
      couponDiscount,
      message: usedCoupon ? `已自动应用最优优惠券: ${usedCoupon.name}` : '无可用优惠券'
    };
  },

  payOrder: async (orderId) => {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('订单不存在');
    }

    if (order.status !== 'pending') {
      throw new Error('订单状态不正确');
    }

    order.status = 'paid';
    order.paidAt = new Date();
    await order.save();

    await pointsService.addPoints(
      order.userId,
      order.pointsEarned,
      'order',
      orderId,
      `订单消费获得积分: ${order.orderNo}`
    );

    const user = await User.findById(order.userId);
    user.totalOrders += 1;
    user.totalSpent += order.finalAmount;
    await user.save();

    return order;
  },

  getOrderById: async (orderId) => {
    return await Order.findById(orderId).populate('userId', 'username memberLevel');
  },

  getUserOrders: async (userId, page = 1, limit = 20) => {
    const skip = (page - 1) * limit;
    const orders = await Order.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Order.countDocuments({ userId });

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  },

  cancelOrder: async (orderId) => {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('订单不存在');
    }

    if (order.status !== 'pending') {
      throw new Error('只能取消待支付订单');
    }

    order.status = 'cancelled';
    await order.save();

    if (order.couponId) {
      const Coupon = require('../models/Coupon');
      const coupon = await Coupon.findById(order.couponId);
      if (coupon) {
        coupon.status = 'available';
        coupon.usedAt = null;
        coupon.orderId = null;
        await coupon.save();
      }
    }

    return order;
  },

  calculateOrderPreview: async (userId, items, couponId = null) => {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    const totalAmount = items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    let couponDiscount = 0;
    let appliedCoupon = null;
    let availableCoupons = [];

    if (couponId) {
      const Coupon = require('../models/Coupon');
      const coupon = await Coupon.findById(couponId);
      if (coupon && coupon.isValid() && totalAmount >= coupon.minPurchase) {
        couponDiscount = coupon.type === 'fixed' 
          ? coupon.value 
          : totalAmount * (coupon.value / 100);
        appliedCoupon = coupon;
      }
    } else {
      const validCoupons = await couponService.getValidUserCoupons(userId);
      availableCoupons = validCoupons.filter(c => totalAmount >= c.minPurchase);
      
      let maxDiscount = 0;
      for (const coupon of availableCoupons) {
        const discount = coupon.type === 'fixed'
          ? coupon.value
          : totalAmount * (coupon.value / 100);
        if (discount > maxDiscount) {
          maxDiscount = discount;
          appliedCoupon = coupon;
          couponDiscount = discount;
        }
      }
    }

    const finalAmount = Math.max(0, totalAmount - couponDiscount);
    const pointsEarned = pointsService.calculatePoints(finalAmount, user.memberLevel);

    return {
      totalAmount,
      couponDiscount,
      finalAmount,
      pointsEarned,
      appliedCoupon,
      availableCoupons,
      memberLevel: user.memberLevel,
      pointsMultiplier: user.getPointsMultiplier()
    };
  }
};

module.exports = orderService;
