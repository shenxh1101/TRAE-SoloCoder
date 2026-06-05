const express = require('express');
const router = express.Router();
const orderService = require('../services/orderService');

router.post('/', async (req, res) => {
  try {
    const { userId, items, couponId } = req.body;
    const order = await orderService.createOrder(userId, items, couponId);
    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/auto-coupon', async (req, res) => {
  try {
    const { userId, items } = req.body;
    const result = await orderService.createOrderWithBestCoupon(userId, items);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/preview', async (req, res) => {
  try {
    const { userId, items, couponId } = req.body;
    const preview = await orderService.calculateOrderPreview(userId, items, couponId);
    res.json(preview);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:orderId/pay', async (req, res) => {
  try {
    const order = await orderService.payOrder(req.params.orderId);
    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:orderId/cancel', async (req, res) => {
  try {
    const order = await orderService.cancelOrder(req.params.orderId);
    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/:orderId', async (req, res) => {
  try {
    const order = await orderService.getOrderById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }
    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/user/:userId', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await orderService.getUserOrders(
      req.params.userId,
      parseInt(page),
      parseInt(limit)
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
