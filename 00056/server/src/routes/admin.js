const express = require('express');
const dayjs = require('dayjs');
const path = require('path');
const fs = require('fs');
const store = require('../models/store');
const ResponseUtil = require('../utils/response');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/log/error', auth, (req, res) => {
  const { message, stack, url, line, column, userAgent, timestamp } = req.body;
  const logDir = path.join(__dirname, '../../logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const logEntry = {
    message,
    stack: stack || '',
    url: url || '',
    line: line || '',
    column: column || '',
    userAgent: userAgent || '',
    timestamp: timestamp || new Date().toISOString(),
    reportedAt: new Date().toISOString(),
    reportedBy: req.user?.id || 'unknown'
  };
  const logFile = path.join(logDir, `error-${dayjs().format('YYYY-MM-DD')}.json`);
  let logs = [];
  if (fs.existsSync(logFile)) {
    try { logs = JSON.parse(fs.readFileSync(logFile, 'utf-8')); } catch {}
  }
  logs.push(logEntry);
  fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
  return ResponseUtil.success(res, null, '错误已记录');
});

router.use(auth, adminAuth);

function filterByCity(items, city) {
  if (!city) return items;
  return items.filter(item => item.city === city);
}

function filterByDateRange(items, startDate, endDate, dateField = 'createdAt') {
  let filtered = items;
  if (startDate) {
    const start = dayjs(startDate).startOf('day');
    filtered = filtered.filter(item => dayjs(item[dateField]).isAfter(start) || dayjs(item[dateField]).isSame(start));
  }
  if (endDate) {
    const end = dayjs(endDate).endOf('day');
    filtered = filtered.filter(item => dayjs(item[dateField]).isBefore(end) || dayjs(item[dateField]).isSame(end));
  }
  return filtered;
}

function filterByStore(items, storeId) {
  if (!storeId) return items;
  return items.filter(item => item.storeId === storeId);
}

router.get('/dashboard', (req, res) => {
  try {
    const { city, startDate, endDate, storeId } = req.query;
    let orders = store.findAll('orders');
    let rescues = store.findAll('rescues');
    let stores = store.findAll('stores');
    orders = filterByCity(orders, city);
    orders = filterByDateRange(orders, startDate, endDate);
    orders = filterByStore(orders, storeId);
    rescues = filterByCity(rescues, city);
    rescues = filterByDateRange(rescues, startDate, endDate);
    rescues = filterByStore(rescues, storeId);
    const today = dayjs().format('YYYY-MM-DD');
    const todayOrders = orders.filter(o => dayjs(o.createdAt).format('YYYY-MM-DD') === today);
    const todayRescues = rescues.filter(r => dayjs(r.createdAt).format('YYYY-MM-DD') === today);
    const completedRescues = rescues.filter(r => r.status === 'completed' && r.dispatchTime && r.arrivalTime);
    const avgResponseTime = completedRescues.length > 0
      ? Math.round(completedRescues.reduce((sum, r) => sum + (new Date(r.arrivalTime) - new Date(r.dispatchTime)), 0) / completedRescues.length / 60000)
      : 0;
    const completedOrders = orders.filter(o => o.status === 'completed');
    const completionRate = orders.length > 0 ? Math.round(completedOrders.length / orders.length * 100) : 0;
    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const ratedOrders = orders.filter(o => o.rating != null);
    const customerSatisfaction = ratedOrders.length > 0
      ? Math.round(ratedOrders.reduce((sum, o) => sum + o.rating, 0) / ratedOrders.length * 10) / 10
      : 0;
    const storeOrderMap = {};
    orders.forEach(o => {
      if (!storeOrderMap[o.storeId]) {
        storeOrderMap[o.storeId] = { storeId: o.storeId, orderCount: 0, revenue: 0 };
      }
      storeOrderMap[o.storeId].orderCount++;
      storeOrderMap[o.storeId].revenue += o.totalAmount || 0;
    });
    const storeRanking = Object.values(storeOrderMap)
      .map(s => {
        const storeInfo = store.findById('stores', s.storeId);
        return { ...s, storeName: storeInfo?.name || '未知门店' };
      })
      .sort((a, b) => b.orderCount - a.orderCount);
    return ResponseUtil.success(res, {
      totalOrders: orders.length,
      todayOrders: todayOrders.length,
      totalRescues: rescues.length,
      todayRescues: todayRescues.length,
      avgResponseTime,
      completionRate,
      totalRevenue,
      customerSatisfaction,
      stores: storeRanking
    });
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.get('/dashboard/realtime-stats', (req, res) => {
  try {
    const { city, storeId } = req.query;
    let orders = store.findAll('orders');
    let rescues = store.findAll('rescues');
    orders = filterByCity(orders, city);
    orders = filterByStore(orders, storeId);
    rescues = filterByCity(rescues, city);
    rescues = filterByStore(rescues, storeId);
    const today = dayjs().format('YYYY-MM-DD');
    const todayOrders = orders.filter(o => dayjs(o.createdAt).format('YYYY-MM-DD') === today);
    const activeRescues = rescues.filter(r => r.status === 'in_progress' || r.status === 'dispatched');
    const pendingOrders = orders.filter(o => o.status === 'pending');
    const completedRescues = rescues.filter(r => r.status === 'completed' && r.dispatchTime && r.arrivalTime);
    const avgResponseTime = completedRescues.length > 0
      ? Math.round(completedRescues.reduce((sum, r) => sum + (new Date(r.arrivalTime) - new Date(r.dispatchTime)), 0) / completedRescues.length / 60000)
      : 0;
    const completedOrders = orders.filter(o => o.status === 'completed' && o.createdAt && o.completedAt);
    const avgCompletionTime = completedOrders.length > 0
      ? Math.round(completedOrders.reduce((sum, o) => sum + (new Date(o.completedAt) - new Date(o.createdAt)), 0) / completedOrders.length / 60000)
      : 0;
    const hourlyOrderData = [];
    for (let h = 0; h <= dayjs().hour(); h++) {
      const hourStr = String(h).padStart(2, '0');
      hourlyOrderData.push({
        hour: hourStr,
        count: todayOrders.filter(o => dayjs(o.createdAt).hour() === h).length
      });
    }
    const realtimeOrderStream = todayOrders
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);
    return ResponseUtil.success(res, {
      totalOrders: orders.length,
      todayOrders: todayOrders.length,
      activeRescues: activeRescues.length,
      pendingOrders: pendingOrders.length,
      avgResponseTime,
      avgCompletionTime,
      hourlyOrderData,
      realtimeOrderStream
    });
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.get('/dashboard/store-ranking', (req, res) => {
  try {
    const { city, startDate, endDate, sortBy = 'orderCount' } = req.query;
    let orders = store.findAll('orders');
    let rescues = store.findAll('rescues');
    let storesList = store.findAll('stores');
    orders = filterByCity(orders, city);
    orders = filterByDateRange(orders, startDate, endDate);
    rescues = filterByCity(rescues, city);
    rescues = filterByDateRange(rescues, startDate, endDate);
    const ranking = storesList
      .filter(s => !city || s.city === city)
      .map(s => {
        const storeOrders = orders.filter(o => o.storeId === s.id);
        const storeRescues = rescues.filter(r => r.storeId === s.id);
        const completedOrders = storeOrders.filter(o => o.status === 'completed');
        const completedRescues = storeRescues.filter(r => r.status === 'completed' && r.dispatchTime && r.arrivalTime);
        const revenue = storeOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        const avgRespTime = completedRescues.length > 0
          ? Math.round(completedRescues.reduce((sum, r) => sum + (new Date(r.arrivalTime) - new Date(r.dispatchTime)), 0) / completedRescues.length / 60000)
          : 0;
        const completionRate = storeOrders.length > 0 ? Math.round(completedOrders.length / storeOrders.length * 100) : 0;
        const ratedOrders = storeOrders.filter(o => o.rating != null);
        const customerSatisfaction = ratedOrders.length > 0
          ? Math.round(ratedOrders.reduce((sum, o) => sum + o.rating, 0) / ratedOrders.length * 10) / 10
          : 0;
        return {
          storeId: s.id,
          storeName: s.name,
          orderCount: storeOrders.length,
          rescueCount: storeRescues.length,
          revenue,
          avgResponseTime: avgRespTime,
          completionRate,
          customerSatisfaction,
          trend: storeOrders.length > 0 ? 'up' : 'stable'
        };
      })
      .sort((a, b) => {
        if (sortBy === 'revenue') return b.revenue - a.revenue;
        if (sortBy === 'avgResponseTime') return a.avgResponseTime - b.avgResponseTime;
        if (sortBy === 'completionRate') return b.completionRate - a.completionRate;
        if (sortBy === 'customerSatisfaction') return b.customerSatisfaction - a.customerSatisfaction;
        return b.orderCount - a.orderCount;
      });
    return ResponseUtil.success(res, ranking);
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.get('/dashboard/completion-rate-trend', (req, res) => {
  try {
    const { city, startDate, endDate, granularity = 'day' } = req.query;
    let orders = store.findAll('orders');
    orders = filterByCity(orders, city);
    const start = startDate ? dayjs(startDate) : dayjs().subtract(30, 'day');
    const end = endDate ? dayjs(endDate) : dayjs();
    const result = [];
    let current = start;
    while (current.isBefore(end) || current.isSame(end, 'day')) {
      let next;
      if (granularity === 'month') {
        next = current.add(1, 'month').startOf('month');
      } else if (granularity === 'week') {
        next = current.add(1, 'week');
      } else {
        next = current.add(1, 'day');
      }
      const periodOrders = orders.filter(o => {
        const d = dayjs(o.createdAt);
        return (d.isAfter(current) || d.isSame(current, 'day')) && d.isBefore(next);
      });
      const completed = periodOrders.filter(o => o.status === 'completed');
      const rate = periodOrders.length > 0 ? Math.round(completed.length / periodOrders.length * 100) : 0;
      const label = granularity === 'month'
        ? current.format('YYYY-MM')
        : granularity === 'week'
          ? `${current.format('MM-DD')}~${next.subtract(1, 'day').format('MM-DD')}`
          : current.format('YYYY-MM-DD');
      result.push({ date: label, completionRate: rate, totalOrders: periodOrders.length, completedOrders: completed.length });
      current = next;
    }
    return ResponseUtil.success(res, result);
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.get('/dashboard/response-time-distribution', (req, res) => {
  try {
    const { city, startDate, endDate } = req.query;
    let rescues = store.findAll('rescues');
    rescues = filterByCity(rescues, city);
    rescues = filterByDateRange(rescues, startDate, endDate);
    const completed = rescues.filter(r => r.status === 'completed' && r.dispatchTime && r.arrivalTime);
    const ranges = [
      { range: '0-5min', min: 0, max: 5 },
      { range: '5-10min', min: 5, max: 10 },
      { range: '10-20min', min: 10, max: 20 },
      { range: '20-30min', min: 20, max: 30 },
      { range: '30+min', min: 30, max: Infinity }
    ];
    const total = completed.length || 1;
    const distribution = ranges.map(r => {
      const count = completed.filter(res => {
        const mins = (new Date(res.arrivalTime) - new Date(res.dispatchTime)) / 60000;
        return mins >= r.min && mins < r.max;
      }).length;
      return { range: r.range, count, percentage: Math.round(count / total * 10000) / 100 };
    });
    return ResponseUtil.success(res, distribution);
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.get('/reports/monthly', (req, res) => {
  try {
    const { month, city, storeId } = req.query;
    const targetMonth = month || dayjs().format('YYYY-MM');
    const monthStart = dayjs(targetMonth).startOf('month');
    const monthEnd = dayjs(targetMonth).endOf('month');
    let orders = store.findAll('orders');
    let rescues = store.findAll('rescues');
    orders = filterByCity(orders, city);
    orders = filterByStore(orders, storeId);
    orders = orders.filter(o => {
      const d = dayjs(o.createdAt);
      return (d.isAfter(monthStart) || d.isSame(monthStart)) && (d.isBefore(monthEnd) || d.isSame(monthEnd));
    });
    rescues = filterByCity(rescues, city);
    rescues = filterByStore(rescues, storeId);
    rescues = rescues.filter(r => {
      const d = dayjs(r.createdAt);
      return (d.isAfter(monthStart) || d.isSame(monthStart)) && (d.isBefore(monthEnd) || d.isSame(monthEnd));
    });
    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalCost = orders.reduce((sum, o) => sum + (o.cost || 0), 0);
    const totalProfit = totalRevenue - totalCost;
    const profitRate = totalRevenue > 0 ? Math.round(totalProfit / totalRevenue * 10000) / 100 : 0;
    const completedRescues = rescues.filter(r => r.status === 'completed' && r.dispatchTime && r.arrivalTime);
    const avgResponseTime = completedRescues.length > 0
      ? Math.round(completedRescues.reduce((sum, r) => sum + (new Date(r.arrivalTime) - new Date(r.dispatchTime)), 0) / completedRescues.length / 60000)
      : 0;
    const completedOrders = orders.filter(o => o.status === 'completed');
    const completionRate = orders.length > 0 ? Math.round(completedOrders.length / orders.length * 100) : 0;
    const ratedOrders = orders.filter(o => o.rating != null);
    const customerSatisfaction = ratedOrders.length > 0
      ? Math.round(ratedOrders.reduce((sum, o) => sum + o.rating, 0) / ratedOrders.length * 10) / 10
      : 0;
    const typeMap = {};
    orders.forEach(o => {
      const type = o.serviceType || o.type || '其他';
      if (!typeMap[type]) typeMap[type] = { type, count: 0, revenue: 0 };
      typeMap[type].count++;
      typeMap[type].revenue += o.totalAmount || 0;
    });
    const serviceTypeDistribution = Object.values(typeMap);
    const storesList = store.findAll('stores');
    const storeRanking = storesList
      .filter(s => !city || s.city === city)
      .map(s => {
        const storeOrders = orders.filter(o => o.storeId === s.id);
        return {
          storeId: s.id,
          storeName: s.name,
          revenue: storeOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
          orderCount: storeOrders.length
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
    const dailyData = [];
    let d = monthStart;
    while (d.isBefore(monthEnd) || d.isSame(monthEnd, 'day')) {
      const dayStr = d.format('YYYY-MM-DD');
      const dayOrders = orders.filter(o => dayjs(o.createdAt).format('YYYY-MM-DD') === dayStr);
      dailyData.push({
        date: dayStr,
        orderCount: dayOrders.length,
        revenue: dayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
      });
      d = d.add(1, 'day');
    }
    return ResponseUtil.success(res, {
      month: targetMonth,
      totalRevenue,
      totalCost,
      totalProfit,
      profitRate,
      rescueCount: rescues.length,
      avgResponseTime,
      completionRate,
      customerSatisfaction,
      serviceTypeDistribution,
      storeRanking,
      dailyData
    });
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.post('/reports/export', async (req, res) => {
  try {
    const { month, city, storeId, format = 'excel' } = req.body;
    const targetMonth = month || dayjs().format('YYYY-MM');
    const monthStart = dayjs(targetMonth).startOf('month');
    const monthEnd = dayjs(targetMonth).endOf('month');
    let orders = store.findAll('orders');
    let rescues = store.findAll('rescues');
    orders = filterByCity(orders, city);
    orders = filterByStore(orders, storeId);
    orders = orders.filter(o => {
      const d = dayjs(o.createdAt);
      return (d.isAfter(monthStart) || d.isSame(monthStart)) && (d.isBefore(monthEnd) || d.isSame(monthEnd));
    });
    rescues = filterByCity(rescues, city);
    rescues = filterByStore(rescues, storeId);
    rescues = rescues.filter(r => {
      const d = dayjs(r.createdAt);
      return (d.isAfter(monthStart) || d.isSame(monthStart)) && (d.isBefore(monthEnd) || d.isSame(monthEnd));
    });
    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalCost = orders.reduce((sum, o) => sum + (o.cost || 0), 0);
    const totalProfit = totalRevenue - totalCost;
    const profitRate = totalRevenue > 0 ? Math.round(totalProfit / totalRevenue * 10000) / 100 : 0;
    const completedRescues = rescues.filter(r => r.status === 'completed' && r.dispatchTime && r.arrivalTime);
    const avgResponseTime = completedRescues.length > 0
      ? Math.round(completedRescues.reduce((sum, r) => sum + (new Date(r.arrivalTime) - new Date(r.dispatchTime)), 0) / completedRescues.length / 60000)
      : 0;
    const completedOrders = orders.filter(o => o.status === 'completed');
    const completionRate = orders.length > 0 ? Math.round(completedOrders.length / orders.length * 100) : 0;
    const ratedOrders = orders.filter(o => o.rating != null);
    const customerSatisfaction = ratedOrders.length > 0
      ? Math.round(ratedOrders.reduce((sum, o) => sum + o.rating, 0) / ratedOrders.length * 10) / 10
      : 0;
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const fileName = `report-${targetMonth}-${Date.now()}`;
    let filePath, downloadFileName;
    if (format === 'pdf') {
      const PDFDocument = require('pdfkit');
      filePath = path.join(uploadDir, `${fileName}.pdf`);
      downloadFileName = `${fileName}.pdf`;
      const doc = new PDFDocument();
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);
      doc.fontSize(20).text(`${targetMonth} 月度报表`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12)
        .text(`总营收: ${totalRevenue}`)
        .text(`总成本: ${totalCost}`)
        .text(`总利润: ${totalProfit}`)
        .text(`利润率: ${profitRate}%`)
        .text(`救援数量: ${rescues.length}`)
        .text(`平均响应时长: ${avgResponseTime}分钟`)
        .text(`完成率: ${completionRate}%`)
        .text(`客户满意度: ${customerSatisfaction}`);
      doc.moveDown();
      doc.fontSize(14).text('订单明细');
      doc.fontSize(10);
      orders.forEach(o => {
        doc.text(`${o.id} | ${o.createdAt} | ${o.totalAmount || 0} | ${o.status}`);
      });
      doc.end();
      await new Promise(resolve => stream.on('finish', resolve));
    } else {
      const ExcelJS = require('exceljs');
      filePath = path.join(uploadDir, `${fileName}.xlsx`);
      downloadFileName = `${fileName}.xlsx`;
      const workbook = new ExcelJS.Workbook();
      const summarySheet = workbook.addWorksheet('概览');
      summarySheet.addRow(['指标', '数值']);
      summarySheet.addRow(['月份', targetMonth]);
      summarySheet.addRow(['总营收', totalRevenue]);
      summarySheet.addRow(['总成本', totalCost]);
      summarySheet.addRow(['总利润', totalProfit]);
      summarySheet.addRow(['利润率', `${profitRate}%`]);
      summarySheet.addRow(['救援数量', rescues.length]);
      summarySheet.addRow(['平均响应时长', `${avgResponseTime}分钟`]);
      summarySheet.addRow(['完成率', `${completionRate}%`]);
      summarySheet.addRow(['客户满意度', customerSatisfaction]);
      const orderSheet = workbook.addWorksheet('订单明细');
      orderSheet.addRow(['订单ID', '创建时间', '金额', '状态', '门店ID']);
      orders.forEach(o => {
        orderSheet.addRow([o.id, o.createdAt, o.totalAmount || 0, o.status, o.storeId || '']);
      });
      await workbook.xlsx.writeFile(filePath);
    }
    const stats = fs.statSync(filePath);
    const expiresAt = dayjs().add(7, 'day').toISOString();
    return ResponseUtil.success(res, {
      downloadUrl: `/api/v1/admin/reports/download/${downloadFileName}`,
      fileName: downloadFileName,
      fileSize: stats.size,
      expiresAt
    });
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.get('/reports', (req, res) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      return ResponseUtil.paginate(res, { list: [], total: 0, page: Number(page), pageSize: Number(pageSize) });
    }
    const files = fs.readdirSync(uploadDir)
      .filter(f => f.startsWith('report-'))
      .map(f => {
        const stats = fs.statSync(path.join(uploadDir, f));
        return {
          fileName: f,
          fileSize: stats.size,
          createdAt: stats.mtime.toISOString(),
          downloadUrl: `/api/v1/admin/reports/download/${f}`
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const total = files.length;
    const list = files.slice((page - 1) * pageSize, page * pageSize);
    return ResponseUtil.paginate(res, { list, total, page: Number(page), pageSize: Number(pageSize) });
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.get('/reports/download/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../uploads', filename);
    if (!fs.existsSync(filePath)) {
      return ResponseUtil.error(res, '文件不存在', 404);
    }
    return res.download(filePath, filename);
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

module.exports = router;
