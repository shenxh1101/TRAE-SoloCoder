const express = require('express');
const router = express.Router();
const giftService = require('../services/giftService');

router.post('/', async (req, res) => {
  try {
    const gift = await giftService.createGift(req.body);
    res.status(201).json(gift);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, category } = req.query;
    const result = await giftService.getGiftList(
      parseInt(page),
      parseInt(limit),
      category
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/:giftId', async (req, res) => {
  try {
    const gift = await giftService.getGiftById(req.params.giftId);
    if (!gift) {
      return res.status(404).json({ error: '礼品不存在' });
    }
    res.json(gift);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/exchange', async (req, res) => {
  try {
    const { userId, giftId, quantity = 1 } = req.body;
    const result = await giftService.exchangeGift(userId, giftId, parseInt(quantity));
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/exchange/user/:userId', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await giftService.getUserExchangeRecords(
      req.params.userId,
      parseInt(page),
      parseInt(limit)
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:giftId', async (req, res) => {
  try {
    const gift = await giftService.updateGift(req.params.giftId, req.body);
    if (!gift) {
      return res.status(404).json({ error: '礼品不存在' });
    }
    res.json(gift);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:giftId', async (req, res) => {
  try {
    const gift = await giftService.deleteGift(req.params.giftId);
    if (!gift) {
      return res.status(404).json({ error: '礼品不存在' });
    }
    res.json({ message: '礼品已下架', gift });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
