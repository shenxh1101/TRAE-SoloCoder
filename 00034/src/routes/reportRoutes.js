const express = require('express');
const router = express.Router();
const reportService = require('../services/reportService');

const sendReport = (res, result, format) => {
  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.filename)}"`);
    res.send('\uFEFF' + result.csv);
  } else {
    res.json(result);
  }
};

router.get('/points/details', async (req, res) => {
  try {
    const { year, month, memberLevel, format = 'json' } = req.query;
    if (!year || !month) {
      return res.status(400).json({ error: '请提供年份和月份' });
    }

    const result = await reportService.exportPointsReport(
      parseInt(year),
      parseInt(month),
      memberLevel || null
    );

    sendReport(res, result, format);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/points/summary', async (req, res) => {
  try {
    const { year, month, format = 'json' } = req.query;
    if (!year || !month) {
      return res.status(400).json({ error: '请提供年份和月份' });
    }

    const result = await reportService.exportPointsSummary(
      parseInt(year),
      parseInt(month)
    );

    sendReport(res, result, format);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/points/summary-by-level', async (req, res) => {
  try {
    const { year, month, format = 'json' } = req.query;
    if (!year || !month) {
      return res.status(400).json({ error: '请提供年份和月份' });
    }

    const result = await reportService.exportPointsSummaryByLevel(
      parseInt(year),
      parseInt(month)
    );

    sendReport(res, result, format);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/coupons/summary', async (req, res) => {
  try {
    const { year, month, format = 'json' } = req.query;
    if (!year || !month) {
      return res.status(400).json({ error: '请提供年份和月份' });
    }

    const result = await reportService.exportCouponReport(
      parseInt(year),
      parseInt(month)
    );

    sendReport(res, result, format);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/coupons/details', async (req, res) => {
  try {
    const { year, month, format = 'json' } = req.query;
    if (!year || !month) {
      return res.status(400).json({ error: '请提供年份和月份' });
    }

    const result = await reportService.exportCouponDetails(
      parseInt(year),
      parseInt(month)
    );

    sendReport(res, result, format);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/dashboard', async (req, res) => {
  try {
    const stats = await reportService.getDashboardStats();
    res.json(stats);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
