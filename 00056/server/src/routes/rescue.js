const express = require('express');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const store = require('../models/store');
const ResponseUtil = require('../utils/response');
const mapService = require('../services/mapService');
const websocketService = require('../services/websocketService');
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

const RESCUE_FEE_MAP = {
  tow: 350,
  jump_start: 100,
  tire_change: 150,
  fuel_delivery: 200,
  unlock: 180,
  recovery: 300
};

const RESCUE_TYPE_LABELS = {
  tow: '拖车',
  jump_start: '搭电',
  tire_change: '换胎',
  fuel_delivery: '送油',
  unlock: '开锁',
  recovery: '脱困'
};

router.get('/vehicles/nearby', (req, res) => {
  try {
    const { latitude, longitude, radius = 50, type } = req.query;
    if (!latitude || !longitude) return ResponseUtil.error(res, '缺少经纬度参数');
    const lat = Number(latitude);
    const lon = Number(longitude);
    let vehicles = store.query('rescueVehicles', (v) => v.status === 'idle');
    if (type) vehicles = vehicles.filter((v) => v.type === type || v.capabilities?.includes(type));
    vehicles = vehicles
      .map((v) => ({
        ...v,
        distance: haversineDistance(lat, lon, v.latitude, v.longitude)
      }))
      .filter((v) => v.distance <= Number(radius))
      .sort((a, b) => a.distance - b.distance);
    return ResponseUtil.success(res, vehicles);
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.get('/vehicles', (req, res) => {
  try {
    const { page = 1, pageSize = 10, status, city } = req.query;
    let list = store.findAll('rescueVehicles');
    if (status) list = list.filter((v) => v.status === status);
    if (city) list = list.filter((v) => v.city === city);
    const total = list.length;
    const p = Math.max(1, Number(page));
    const ps = Math.max(1, Number(pageSize));
    const start = (p - 1) * ps;
    return ResponseUtil.paginate(res, { list: list.slice(start, start + ps), total, page: p, pageSize: ps });
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.post('/vehicles/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return ResponseUtil.error(res, '缺少状态参数');
    const vehicle = store.findById('rescueVehicles', req.params.id);
    if (!vehicle) return ResponseUtil.error(res, '救援车辆不存在', 404);
    const validStatuses = ['idle', 'busy', 'offline', 'maintenance'];
    if (!validStatuses.includes(status)) return ResponseUtil.error(res, '无效的状态值');
    store.update('rescueVehicles', req.params.id, { status });
    return ResponseUtil.success(res, null, '状态更新成功');
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.post('/requests', (req, res) => {
  try {
    const location = req.body.location || {};
    const latitude = req.body.latitude || location.latitude;
    const longitude = req.body.longitude || location.longitude;
    const address = req.body.address || location.address;
    const { type, vehicleId, description, plateNumber, contactName, contactPhone, urgencyLevel } = req.body;
    if (!latitude || !longitude) return ResponseUtil.error(res, '缺少位置信息');
    if (!type) return ResponseUtil.error(res, '缺少救援类型');
    const userId = req.user.id || req.user.userId;
    const userLat = Number(latitude);
    const userLon = Number(longitude);
    let idleVehicles = store.query('rescueVehicles', (v) => v.status === 'idle');
    const typeMap = { towing: 'tow', battery: 'jump_start', tire_change: 'tire_change', fuel_delivery: 'fuel_delivery', lockout: 'unlock', winch: 'recovery', jump_start: 'jump_start', on_site_repair: 'tow' };
    const mappedType = typeMap[type] || type;
    const compatibleVehicles = idleVehicles.filter((v) => v.type === mappedType || v.type === type || v.capabilities?.includes(mappedType) || v.capabilities?.includes(type));
    if (compatibleVehicles.length === 0) {
      return ResponseUtil.error(res, '暂无空闲救援车辆', 404);
    }
    const sorted = compatibleVehicles
      .map((v) => ({
        ...v,
        distance: haversineDistance(userLat, userLon, v.latitude, v.longitude)
      }))
      .sort((a, b) => a.distance - b.distance);
    const nearest = sorted[0];
    const etaMinutes = Math.round((nearest.distance / 30) * 60);
    const estimatedFee = RESCUE_FEE_MAP[type] || 200;
    const rescue = store.create('rescues', {
      id: uuidv4(),
      userId,
      vehicleId: vehicleId || null,
      plateNumber: plateNumber || '',
      rescueVehicleId: nearest.id,
      type,
      typeName: RESCUE_TYPE_LABELS[type] || type,
      status: 'dispatched',
      statusText: '救援车已派出',
      userLocation: { latitude: userLat, longitude: userLon, address: address || '' },
      rescueVehicleLocation: { latitude: nearest.latitude, longitude: nearest.longitude },
      distance: nearest.distance,
      eta: etaMinutes,
      estimatedArrivalTime: etaMinutes,
      estimatedFee,
      description: description || '',
      contactName: contactName || '',
      contactPhone: contactPhone || '',
      urgencyLevel: urgencyLevel || 'normal',
      createdAt: new Date().toISOString()
    });
    store.update('rescueVehicles', nearest.id, { status: 'busy', currentRescueId: rescue.id });
    websocketService.sendToUser(userId, 'rescue_status', {
      rescueId: rescue.id,
      status: 'dispatched',
      rescueVehicle: {
        id: nearest.id,
        plateNumber: nearest.plateNumber,
        driverName: nearest.driverName,
        driverPhone: nearest.driverPhone,
        latitude: nearest.latitude,
        longitude: nearest.longitude
      },
      eta: etaMinutes,
      estimatedFee
    });
    return ResponseUtil.success(res, rescue, '救援请求已创建');
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.get('/requests', (req, res) => {
  try {
    const { page = 1, pageSize = 10, status } = req.query;
    const userId = req.user.id || req.user.userId;
    let list = store.query('rescues', (r) => r.userId === userId);
    if (status) list = list.filter((r) => r.status === status);
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

router.get('/requests/:id', (req, res) => {
  try {
    const item = store.findById('rescues', req.params.id);
    if (!item) return ResponseUtil.error(res, '救援请求不存在', 404);
    if (item.userId !== req.user.id && item.userId !== req.user.userId) {
      return ResponseUtil.error(res, '无权查看此救援请求', 403);
    }
    return ResponseUtil.success(res, item);
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.get('/requests/:id/location', (req, res) => {
  try {
    const item = store.findById('rescues', req.params.id);
    if (!item) return ResponseUtil.error(res, '救援请求不存在', 404);
    if (item.userId !== req.user.id && item.userId !== req.user.userId) {
      return ResponseUtil.error(res, '无权查看此救援请求', 403);
    }
    if (item.status !== 'dispatched' && item.status !== 'en_route') {
      return ResponseUtil.error(res, '救援车辆未在途中');
    }
    const vehicle = store.findById('rescueVehicles', item.rescueVehicleId);
    if (!vehicle) return ResponseUtil.error(res, '救援车辆不存在', 404);
    const current = item.rescueVehicleLocation || { latitude: vehicle.latitude, longitude: vehicle.longitude };
    const target = item.userLocation;
    const latDiff = target.latitude - current.latitude;
    const lonDiff = target.longitude - current.longitude;
    const totalDist = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);
    const moveRatio = totalDist > 0 ? Math.min(0.15, 0.01 / totalDist * 10) : 0;
    const newLat = current.latitude + latDiff * moveRatio;
    const newLon = current.longitude + lonDiff * moveRatio;
    const remainingDist = haversineDistance(newLat, newLon, target.latitude, target.longitude);
    const newEta = Math.round((remainingDist / 30) * 60);
    store.update('rescues', req.params.id, {
      rescueVehicleLocation: { latitude: newLat, longitude: newLon },
      eta: newEta,
      status: remainingDist < 0.5 ? 'arrived' : 'en_route'
    });
    return ResponseUtil.success(res, {
      rescueId: req.params.id,
      location: { latitude: newLat, longitude: newLon },
      eta: newEta,
      status: remainingDist < 0.5 ? 'arrived' : 'en_route'
    });
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.post('/requests/:id/cancel', (req, res) => {
  try {
    const { reason } = req.body;
    const item = store.findById('rescues', req.params.id);
    if (!item) return ResponseUtil.error(res, '救援请求不存在', 404);
    if (item.userId !== req.user.id && item.userId !== req.user.userId) {
      return ResponseUtil.error(res, '无权操作此救援请求', 403);
    }
    if (item.status === 'cancelled') return ResponseUtil.error(res, '救援已取消');
    if (item.status === 'completed') return ResponseUtil.error(res, '救援已完成，无法取消');
    store.update('rescues', req.params.id, { status: 'cancelled', cancelReason: reason || '' });
    if (item.rescueVehicleId) {
      const vehicle = store.findById('rescueVehicles', item.rescueVehicleId);
      if (vehicle && vehicle.status === 'busy') {
        store.update('rescueVehicles', item.rescueVehicleId, { status: 'idle', currentRescueId: null });
      }
    }
    websocketService.sendToUser(item.userId, 'rescue_status', {
      rescueId: item.id,
      status: 'cancelled',
      reason: reason || ''
    });
    return ResponseUtil.success(res, null, '取消成功');
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.post('/requests/:id/complete', (req, res) => {
  try {
    const { actualFee, remark } = req.body;
    const item = store.findById('rescues', req.params.id);
    if (!item) return ResponseUtil.error(res, '救援请求不存在', 404);
    if (item.status !== 'arrived' && item.status !== 'en_route' && item.status !== 'dispatched') {
      return ResponseUtil.error(res, '当前状态无法完成');
    }
    const finalFee = actualFee || item.estimatedFee || 0;
    store.update('rescues', req.params.id, {
      status: 'completed',
      actualFee: finalFee,
      completedAt: new Date().toISOString(),
      remark: remark || ''
    });
    if (item.rescueVehicleId) {
      store.update('rescueVehicles', item.rescueVehicleId, { status: 'idle', currentRescueId: null });
    }
    const userId = item.userId;
    const member = store.query('members', (m) => m.userId === userId);
    if (member.length > 0) {
      const currentYearSpend = Number(member[0].yearSpend) || 0;
      const currentRescueCount = Number(member[0].rescueCount) || 0;
      store.update('members', member[0].id, {
        yearSpend: currentYearSpend + finalFee,
        rescueCount: currentRescueCount + 1
      });
    }
    const order = store.create('orders', {
      id: uuidv4(),
      userId,
      rescueId: item.id,
      type: 'rescue',
      status: 'completed',
      totalAmount: finalFee,
      createdAt: new Date().toISOString()
    });
    websocketService.sendToUser(userId, 'rescue_status', {
      rescueId: item.id,
      status: 'completed',
      actualFee: finalFee,
      orderId: order.id
    });
    return ResponseUtil.success(res, { rescue: store.findById('rescues', req.params.id), order }, '救援完成');
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

router.post('/requests/:id/review', (req, res) => {
  try {
    const { rating, comment, images } = req.body;
    if (!rating) return ResponseUtil.error(res, '缺少评分');
    const item = store.findById('rescues', req.params.id);
    if (!item) return ResponseUtil.error(res, '救援请求不存在', 404);
    if (item.userId !== req.user.id && item.userId !== req.user.userId) {
      return ResponseUtil.error(res, '无权评价此救援请求', 403);
    }
    if (item.status !== 'completed') return ResponseUtil.error(res, '救援未完成，无法评价');
    if (item.review) return ResponseUtil.error(res, '已评价');
    store.update('rescues', req.params.id, {
      review: { rating: Number(rating), comment: comment || '', images: images || [], createdAt: new Date().toISOString() }
    });
    return ResponseUtil.success(res, null, '评价成功');
  } catch (err) {
    return ResponseUtil.error(res, err.message, 500);
  }
});

module.exports = router;
