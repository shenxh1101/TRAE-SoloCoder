const express = require('express');
const router = express.Router();
const couponService = require('../services/couponService');

router.post('/', async (req, res) => {
  try {
    const coupon = await couponService.createCoupon(req.body);
    res.status(201).json(coupon);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/issue/inactive-users', async (req, res) => {
  try {
    const result = await couponService.issueInactiveUserCoupons();
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/issue/high-activity', async (req, res) => {
  try {
    const result = await couponService.issueHighActivityCoupons();
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/issue/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { couponTemplate, reason } = req.body;
    const coupon = await couponService.issueCouponToUser(userId, couponTemplate, reason);
    res.json(coupon);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;
    const coupons = await couponService.getUserCoupons(userId, status);
    res.json(coupons);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/user/:userId/valid', async (req, res) => {
  try {
    const { userId } = req.params;
    const coupons = await couponService.getValidUserCoupons(userId);
    res.json(coupons);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/user/:userId/best', async (req, res) => {
  try {
    const { userId } = req.params;
    const { orderAmount } = req.query;
    const bestCoupon = await couponService.findBestCoupon(
      userId,
      parseFloat(orderAmount)
    );
    res.json(bestCoupon || { message: '没有可用优惠券' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/:couponId', async (req, res) => {
  try {
    const coupon = await couponService.getCouponById(req.params.couponId);
    if (!coupon) {
      return res.status(404).json({ error: '优惠券不存在' });
    }
    res.json(coupon);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:couponId/use', async (req, res) => {
  try {
    const { orderId, orderAmount } = req.body;
    const result = await couponService.useCoupon(
      req.params.couponId,
      orderId,
      parseFloat(orderAmount)
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/stats/monthly', async (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) {
      return res.status(400).json({ error: '请提供年份和月份' });
    }
    const stats = await couponService.getMonthlyCouponStats(
      parseInt(year),
      parseInt(month)
    );
    res.json(stats);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
