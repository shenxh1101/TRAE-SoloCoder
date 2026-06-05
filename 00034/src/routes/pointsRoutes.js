const express = require('express');
const router = express.Router();
const pointsService = require('../services/pointsService');

router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const result = await pointsService.getUserPointsRecords(
      userId,
      parseInt(page),
      parseInt(limit)
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/expiring/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pointsService.getExpiringPoints(userId);
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
    const stats = await pointsService.getMonthlyPointsStats(
      parseInt(year),
      parseInt(month)
    );
    res.json(stats);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
