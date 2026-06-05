const express = require('express');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const store = require('../models/store');
const ResponseUtil = require('../utils/response');
const mapService = require('../services/mapService');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.use(auth);

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getRecommendedPackageTypes(mileage) {
  const km = Number(mileage) || 0;
  if (km < 5000) return ['car_wash'];
  if (km < 10000) return ['maintenance', 'car_wash'];
  if (km < 30000) return ['maintenance'];
  return ['maintenance', 'repair'];
}

function generateTimeSlots(date) {
  const slots = [];
  for (let h = 8; h < 18; h++) {
    slots.push({
      time: `${String(h).padStart(2, '0')}:00-${String(h + 1).padStart(2, '0')}:00`,
      startHour: h,
      available: true
    });
  }
  return slots;
}

router.get('/packages/recommended', async (req, res) => {
  try {
    const { mileage, vehicleId } = req.query;
    const types = getRecommendedPackageTypes(mileage);
    const allPackages = store.findAll('packages');
    const recommended = allPackages.filter((p) => types.includes(p.type));
    if (vehicleId) {
      const vehicle = store.findById('vehicles', vehicleId);
      if (vehicle) {
        recommended.sort((a, b) => {
          const aMatch = a.applicableModels?.includes(vehicle.brand) ? 0 : 1;
          const bMatch = b.applicableModels?.includes(vehicle.brand) ? 0 : 1;
          return aMatch - bMatch;
        });
      }
    }
    return ResponseUtil.success(res, recommended);
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.get('/packages', (req, res) => {
  try {
    const { page = 1, pageSize = 10, type, sortBy } = req.query;
    let list = store.findAll('packages');
    if (type) list = list.filter((p) => p.type === type);
    if (sortBy) {
      list.sort((a, b) => {
        if (sortBy === 'price') return (a.price || 0) - (b.price || 0);
        if (sortBy === 'price_desc') return (b.price || 0) - (a.price || 0);
        if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
        return 0;
      });
    }
    const total = list.length;
    const p = Math.max(1, Number(page));
    const ps = Math.max(1, Number(pageSize));
    const start = (p - 1) * ps;
    return ResponseUtil.paginate(res, { list: list.slice(start, start + ps), total, page: p, pageSize: ps });
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.get('/packages/all', (req, res) => {
  try {
    let list = store.findAll('packages');
    const { type } = req.query;
    if (type) list = list.filter((p) => p.type === type);
    return ResponseUtil.success(res, list);
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.get('/packages/:id', (req, res) => {
  try {
    const item = store.findById('packages', req.params.id);
    if (!item) return ResponseUtil.error(res, '套餐不存在', 404);
    return ResponseUtil.success(res, item);
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.get('/stores', async (req, res) => {
  try {
    const { serviceType, city, latitude, longitude, radius, sortBy } = req.query;
    let list = store.findAll('stores');
    if (serviceType) list = list.filter((s) => s.serviceTypes?.includes(serviceType));
    if (city) list = list.filter((s) => s.city === city);
    if (latitude && longitude) {
      const lat = Number(latitude);
      const lon = Number(longitude);
      list = list.map((s) => ({
        ...s,
        distance: haversineDistance(lat, lon, s.latitude, s.longitude)
      }));
      if (radius) list = list.filter((s) => s.distance <= Number(radius));
    }
    if (sortBy === 'distance' && latitude && longitude) {
      list.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    } else if (sortBy === 'rating') {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'name') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    return ResponseUtil.success(res, list);
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.get('/stores/:id', (req, res) => {
  try {
    const item = store.findById('stores', req.params.id);
    if (!item) return ResponseUtil.error(res, '门店不存在', 404);
    return ResponseUtil.success(res, item);
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.get('/stores/:id/services', (req, res) => {
  try {
    const storeItem = store.findById('stores', req.params.id);
    if (!storeItem) return ResponseUtil.error(res, '门店不存在', 404);
    const allServices = store.findAll('packages');
    const services = allServices.filter(
      (s) => storeItem.serviceTypes?.includes(s.type) || s.storeId === req.params.id
    );
    return ResponseUtil.success(res, services);
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.get('/stores/:id/technicians', (req, res) => {
  try {
    const storeItem = store.findById('stores', req.params.id);
    if (!storeItem) return ResponseUtil.error(res, '门店不存在', 404);
    const technicians = store.query('users', (u) => u.storeId === req.params.id && u.role === 'technician');
    return ResponseUtil.success(res, technicians);
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.get('/bookings/available-slots', (req, res) => {
  try {
    const { storeId, date, packageId } = req.query;
    if (!storeId || !date) return ResponseUtil.error(res, '缺少必要参数');
    const storeItem = store.findById('stores', storeId);
    if (!storeItem) return ResponseUtil.error(res, '门店不存在', 404);
    const slots = generateTimeSlots(date);
    const existingBookings = store.query('bookings', (b) => b.storeId === storeId && b.date === date && b.status !== 'cancelled');
    existingBookings.forEach((b) => {
      const slot = slots.find((s) => s.startHour === b.startHour);
      if (slot) slot.available = false;
    });
    return ResponseUtil.success(res, { storeId, date, slots });
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.post('/bookings', (req, res) => {
  try {
    const { storeId, date, startHour, packageId, vehicleId, remark } = req.body;
    if (!storeId || !date || startHour === undefined || !packageId) {
      return ResponseUtil.error(res, '缺少必要参数');
    }
    const storeItem = store.findById('stores', storeId);
    if (!storeItem) return ResponseUtil.error(res, '门店不存在', 404);
    const packageItem = store.findById('packages', packageId);
    if (!packageItem) return ResponseUtil.error(res, '套餐不存在', 404);
    const conflict = store.query(
      'bookings',
      (b) => b.storeId === storeId && b.date === date && b.startHour === startHour && b.status !== 'cancelled'
    );
    if (conflict.length > 0) return ResponseUtil.error(res, '该时间段已被预约');
    const booking = store.create('bookings', {
      id: uuidv4(),
      userId: req.user.id || req.user.userId,
      storeId,
      date,
      startHour,
      packageId,
      vehicleId: vehicleId || null,
      remark: remark || '',
      status: 'confirmed',
      createdAt: new Date().toISOString()
    });
    return ResponseUtil.success(res, booking, '预约成功');
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.get('/bookings', (req, res) => {
  try {
    const { page = 1, pageSize = 10, status } = req.query;
    let list = store.query('bookings', (b) => (b.userId === req.user.id || b.userId === req.user.userId));
    if (status) list = list.filter((b) => b.status === status);
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const total = list.length;
    const p = Math.max(1, Number(page));
    const ps = Math.max(1, Number(pageSize));
    const start = (p - 1) * ps;
    return ResponseUtil.paginate(res, { list: list.slice(start, start + ps), total, page: p, pageSize: ps });
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.get('/bookings/:id', (req, res) => {
  try {
    const item = store.findById('bookings', req.params.id);
    if (!item) return ResponseUtil.error(res, '预约不存在', 404);
    if (item.userId !== req.user.id && item.userId !== req.user.userId) {
      return ResponseUtil.error(res, '无权查看此预约', 403);
    }
    return ResponseUtil.success(res, item);
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.post('/bookings/:id/cancel', (req, res) => {
  try {
    const item = store.findById('bookings', req.params.id);
    if (!item) return ResponseUtil.error(res, '预约不存在', 404);
    if (item.userId !== req.user.id && item.userId !== req.user.userId) {
      return ResponseUtil.error(res, '无权操作此预约', 403);
    }
    if (item.status === 'cancelled') return ResponseUtil.error(res, '预约已取消');
    if (item.status === 'completed') return ResponseUtil.error(res, '预约已完成，无法取消');
    store.update('bookings', req.params.id, { status: 'cancelled' });
    return ResponseUtil.success(res, null, '取消成功');
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.post('/bookings/:id/reschedule', (req, res) => {
  try {
    const { date, startHour } = req.body;
    if (!date || startHour === undefined) return ResponseUtil.error(res, '缺少必要参数');
    const item = store.findById('bookings', req.params.id);
    if (!item) return ResponseUtil.error(res, '预约不存在', 404);
    if (item.userId !== req.user.id && item.userId !== req.user.userId) {
      return ResponseUtil.error(res, '无权操作此预约', 403);
    }
    if (item.status === 'cancelled') return ResponseUtil.error(res, '预约已取消，无法改期');
    if (item.status === 'completed') return ResponseUtil.error(res, '预约已完成，无法改期');
    const conflict = store.query(
      'bookings',
      (b) => b.storeId === item.storeId && b.date === date && b.startHour === startHour && b.status !== 'cancelled' && b.id !== req.params.id
    );
    if (conflict.length > 0) return ResponseUtil.error(res, '该时间段已被预约');
    store.update('bookings', req.params.id, { date, startHour, status: 'confirmed' });
    return ResponseUtil.success(res, null, '改期成功');
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.post('/work-orders/scan', (req, res) => {
  try {
    const { storeId, vehicleId, qrCode } = req.body;
    if (!storeId || !vehicleId) return ResponseUtil.error(res, '缺少必要参数');
    const storeItem = store.findById('stores', storeId);
    if (!storeItem) return ResponseUtil.error(res, '门店不存在', 404);
    const vehicle = store.findById('vehicles', vehicleId);
    if (!vehicle) return ResponseUtil.error(res, '车辆不存在', 404);
    const workOrder = store.create('workOrders', {
      id: uuidv4(),
      storeId,
      vehicleId,
      userId: req.user.id || req.user.userId,
      qrCode: qrCode || '',
      status: 'pending',
      items: [],
      totalAmount: 0,
      createdAt: new Date().toISOString()
    });
    return ResponseUtil.success(res, workOrder, '工单创建成功');
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.get('/work-orders', (req, res) => {
  try {
    const { page = 1, pageSize = 10, status } = req.query;
    let list = store.query('workOrders', (w) => w.userId === (req.user.id || req.user.userId));
    if (status) list = list.filter((w) => w.status === status);
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const total = list.length;
    const p = Math.max(1, Number(page));
    const ps = Math.max(1, Number(pageSize));
    const start = (p - 1) * ps;
    return ResponseUtil.paginate(res, { list: list.slice(start, start + ps), total, page: p, pageSize: ps });
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.get('/work-orders/:id', (req, res) => {
  try {
    const item = store.findById('workOrders', req.params.id);
    if (!item) return ResponseUtil.error(res, '工单不存在', 404);
    if (item.userId !== req.user.id && item.userId !== req.user.userId) {
      return ResponseUtil.error(res, '无权查看此工单', 403);
    }
    return ResponseUtil.success(res, item);
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.post('/work-orders/:id/confirm', (req, res) => {
  try {
    const item = store.findById('workOrders', req.params.id);
    if (!item) return ResponseUtil.error(res, '工单不存在', 404);
    if (item.status !== 'pending') return ResponseUtil.error(res, '当前状态无法确认');
    store.update('workOrders', req.params.id, { status: 'confirmed' });
    return ResponseUtil.success(res, null, '确认成功');
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.post('/work-orders/:id/quote', (req, res) => {
  try {
    const { items, totalAmount } = req.body;
    if (!items || !Array.isArray(items) || totalAmount === undefined) {
      return ResponseUtil.error(res, '缺少必要参数');
    }
    const item = store.findById('workOrders', req.params.id);
    if (!item) return ResponseUtil.error(res, '工单不存在', 404);
    if (item.status !== 'confirmed') return ResponseUtil.error(res, '当前状态无法报价');
    store.update('workOrders', req.params.id, { items, totalAmount, status: 'quoted' });
    return ResponseUtil.success(res, null, '报价成功');
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.post('/work-orders/:id/pay', (req, res) => {
  try {
    const { paymentMethod } = req.body;
    const item = store.findById('workOrders', req.params.id);
    if (!item) return ResponseUtil.error(res, '工单不存在', 404);
    if (item.status !== 'quoted') return ResponseUtil.error(res, '当前状态无法支付');
    const userId = req.user.id || req.user.userId;
    store.update('workOrders', req.params.id, {
      status: 'paid',
      paymentMethod: paymentMethod || 'unknown',
      paidAt: new Date().toISOString()
    });
    const member = store.query('members', (m) => m.userId === userId);
    if (member.length > 0) {
      const currentYearSpend = Number(member[0].yearSpend) || 0;
      store.update('members', member[0].id, {
        yearSpend: currentYearSpend + (item.totalAmount || 0)
      });
    }
    return ResponseUtil.success(res, null, '支付成功');
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.post('/work-orders/:id/start', (req, res) => {
  try {
    const item = store.findById('workOrders', req.params.id);
    if (!item) return ResponseUtil.error(res, '工单不存在', 404);
    if (item.status !== 'paid') return ResponseUtil.error(res, '当前状态无法开始服务');
    store.update('workOrders', req.params.id, { status: 'in_progress', startedAt: new Date().toISOString() });
    return ResponseUtil.success(res, null, '服务已开始');
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.post('/work-orders/:id/complete', (req, res) => {
  try {
    const item = store.findById('workOrders', req.params.id);
    if (!item) return ResponseUtil.error(res, '工单不存在', 404);
    if (item.status !== 'in_progress') return ResponseUtil.error(res, '当前状态无法完成');
    store.update('workOrders', req.params.id, {
      status: 'completed',
      completedAt: new Date().toISOString()
    });
    const order = store.create('orders', {
      id: uuidv4(),
      userId: item.userId,
      workOrderId: item.id,
      storeId: item.storeId,
      vehicleId: item.vehicleId,
      type: 'service',
      status: 'completed',
      totalAmount: item.totalAmount || 0,
      items: item.items || [],
      createdAt: new Date().toISOString()
    });
    return ResponseUtil.success(res, { workOrder: store.findById('workOrders', req.params.id), order }, '服务完成');
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.post('/work-orders/:id/progress', (req, res) => {
  try {
    const { step, description, images } = req.body;
    if (!step) return ResponseUtil.error(res, '缺少必要参数');
    const item = store.findById('workOrders', req.params.id);
    if (!item) return ResponseUtil.error(res, '工单不存在', 404);
    if (item.status !== 'in_progress') return ResponseUtil.error(res, '当前状态无法更新进度');
    const progress = item.progress || [];
    progress.push({
      step,
      description: description || '',
      images: images || [],
      timestamp: new Date().toISOString()
    });
    store.update('workOrders', req.params.id, { progress });
    return ResponseUtil.success(res, null, '进度更新成功');
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.get('/orders', (req, res) => {
  try {
    const { page = 1, pageSize = 10, type, status, startDate, endDate } = req.query;
    const userId = req.user.id || req.user.userId;
    let list = store.query('orders', (o) => o.userId === userId);
    if (type) list = list.filter((o) => o.type === type);
    if (status) list = list.filter((o) => o.status === status);
    if (startDate) {
      const sd = dayjs(startDate);
      list = list.filter((o) => dayjs(o.createdAt).isAfter(sd) || dayjs(o.createdAt).isSame(sd, 'day'));
    }
    if (endDate) {
      const ed = dayjs(endDate);
      list = list.filter((o) => dayjs(o.createdAt).isBefore(ed) || dayjs(o.createdAt).isSame(ed, 'day'));
    }
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const total = list.length;
    const p = Math.max(1, Number(page));
    const ps = Math.max(1, Number(pageSize));
    const start = (p - 1) * ps;
    return ResponseUtil.paginate(res, { list: list.slice(start, start + ps), total, page: p, pageSize: ps });
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.get('/orders/:id', (req, res) => {
  try {
    const item = store.findById('orders', req.params.id);
    if (!item) return ResponseUtil.error(res, '订单不存在', 404);
    if (item.userId !== req.user.id && item.userId !== req.user.userId) {
      return ResponseUtil.error(res, '无权查看此订单', 403);
    }
    return ResponseUtil.success(res, item);
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.post('/orders/:id/review', (req, res) => {
  try {
    const { rating, comment, images } = req.body;
    if (!rating) return ResponseUtil.error(res, '缺少评分');
    const item = store.findById('orders', req.params.id);
    if (!item) return ResponseUtil.error(res, '订单不存在', 404);
    if (item.userId !== req.user.id && item.userId !== req.user.userId) {
      return ResponseUtil.error(res, '无权评价此订单', 403);
    }
    if (item.status !== 'completed') return ResponseUtil.error(res, '订单未完成，无法评价');
    if (item.review) return ResponseUtil.error(res, '已评价');
    store.update('orders', req.params.id, {
      review: { rating: Number(rating), comment: comment || '', images: images || [], createdAt: new Date().toISOString() }
    });
    return ResponseUtil.success(res, null, '评价成功');
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.post('/orders/:id/refund', (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return ResponseUtil.error(res, '缺少退款原因');
    const item = store.findById('orders', req.params.id);
    if (!item) return ResponseUtil.error(res, '订单不存在', 404);
    if (item.userId !== req.user.id && item.userId !== req.user.userId) {
      return ResponseUtil.error(res, '无权操作此订单', 403);
    }
    if (item.status === 'refunded') return ResponseUtil.error(res, '订单已退款');
    if (item.status === 'refund_rejected') return ResponseUtil.error(res, '退款已拒绝');
    store.update('orders', req.params.id, { status: 'refund_pending', refundReason: reason, refundRequestedAt: new Date().toISOString() });
    return ResponseUtil.success(res, null, '退款申请已提交');
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.get('/categories', (req, res) => {
  try {
    const categories = [
      { id: 'wash', name: '洗车', icon: 'car-wash' },
      { id: 'minor_maintenance', name: '小保养', icon: 'wrench' },
      { id: 'major_maintenance', name: '大保养', icon: 'tools' },
      { id: 'basic_check', name: '基础检查', icon: 'search' },
      { id: 'ac_cleaning', name: '空调清洗', icon: 'wind' },
      { id: 'full_care', name: '全面养护', icon: 'shield' },
      { id: 'tire', name: '轮胎服务', icon: 'circle' },
      { id: 'battery', name: '电池服务', icon: 'battery' }
    ];
    return ResponseUtil.success(res, categories);
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.get('/coupons/available', (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const coupons = store.query('coupons', (c) => {
      if (c.userId !== userId) return false;
      if (c.status !== 'active') return false;
      if (c.expiresAt && new Date(c.expiresAt) < new Date()) return false;
      return true;
    });
    return ResponseUtil.success(res, coupons);
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

module.exports = router;
