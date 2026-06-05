const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const path = require('path');
const store = require('../models/store');
const ResponseUtil = require('../utils/response');
const { auth } = require('../middleware/auth');

const router = express.Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: process.env.UPLOAD_DIR || './uploads',
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${uuidv4()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});

function upgradeMemberLevel(member) {
  const spending = member.annualSpending || 0;
  const rescues = member.rescueCount || 0;
  if (spending >= 10000 || rescues >= 5) {
    member.level = 'gold';
    member.discountRate = 0.8;
  } else if (spending >= 5000 || rescues >= 3) {
    member.level = 'silver';
    member.discountRate = 0.9;
  } else {
    member.level = 'normal';
    member.discountRate = 1.0;
  }
  return member;
}

router.use(auth);

router.get('/profile', (req, res) => {
  const user = store.findById('users', req.user.userId);
  if (!user) {
    return ResponseUtil.error(res, '用户不存在', 404);
  }
  const { password, ...safeUser } = user;
  return ResponseUtil.success(res, safeUser);
});

router.put('/profile', (req, res) => {
  const { nickname, avatar, gender, email } = req.body;
  const updates = {};
  if (nickname !== undefined) updates.nickname = nickname;
  if (avatar !== undefined) updates.avatar = avatar;
  if (gender !== undefined) updates.gender = gender;
  if (email !== undefined) updates.email = email;
  const user = store.update('users', req.user.userId, updates);
  if (!user) {
    return ResponseUtil.error(res, '用户不存在', 404);
  }
  const { password, ...safeUser } = user;
  return ResponseUtil.success(res, safeUser, '更新成功');
});

router.post('/avatar', upload.single('avatar'), (req, res) => {
  if (!req.file) {
    return ResponseUtil.error(res, '请上传头像文件');
  }
  const avatarUrl = `/uploads/${req.file.filename}`;
  store.update('users', req.user.userId, { avatar: avatarUrl });
  return ResponseUtil.success(res, { avatar: avatarUrl }, '头像上传成功');
});

router.get('/vehicles', (req, res) => {
  const vehicles = store.query('vehicles', v => v.userId === req.user.userId);
  return ResponseUtil.success(res, vehicles);
});

router.get('/vehicles/:id', (req, res) => {
  const vehicle = store.findById('vehicles', req.params.id);
  if (!vehicle || vehicle.userId !== req.user.userId) {
    return ResponseUtil.error(res, '车辆不存在', 404);
  }
  return ResponseUtil.success(res, vehicle);
});

router.post('/vehicles', (req, res) => {
  const { plateNumber, brand, model, color, vin } = req.body;
  if (!plateNumber) {
    return ResponseUtil.error(res, '车牌号不能为空');
  }
  const vehicleId = store.generateId('V');
  const userVehicles = store.query('vehicles', v => v.userId === req.user.userId);
  const vehicle = store.create('vehicles', {
    id: vehicleId,
    userId: req.user.userId,
    plateNumber,
    brand: brand || '',
    model: model || '',
    color: color || '',
    vin: vin || '',
    isDefault: userVehicles.length === 0,
  });
  return ResponseUtil.success(res, vehicle, '绑定成功');
});

router.put('/vehicles/:id', (req, res) => {
  const vehicle = store.findById('vehicles', req.params.id);
  if (!vehicle || vehicle.userId !== req.user.userId) {
    return ResponseUtil.error(res, '车辆不存在', 404);
  }
  const { plateNumber, brand, model, color, vin } = req.body;
  const updates = {};
  if (plateNumber !== undefined) updates.plateNumber = plateNumber;
  if (brand !== undefined) updates.brand = brand;
  if (model !== undefined) updates.model = model;
  if (color !== undefined) updates.color = color;
  if (vin !== undefined) updates.vin = vin;
  const updated = store.update('vehicles', req.params.id, updates);
  return ResponseUtil.success(res, updated, '更新成功');
});

router.delete('/vehicles/:id', (req, res) => {
  const vehicle = store.findById('vehicles', req.params.id);
  if (!vehicle || vehicle.userId !== req.user.userId) {
    return ResponseUtil.error(res, '车辆不存在', 404);
  }
  store.delete('vehicles', req.params.id);
  return ResponseUtil.success(res, null, '删除成功');
});

router.post('/vehicles/:id/set-default', (req, res) => {
  const vehicle = store.findById('vehicles', req.params.id);
  if (!vehicle || vehicle.userId !== req.user.userId) {
    return ResponseUtil.error(res, '车辆不存在', 404);
  }
  const userVehicles = store.query('vehicles', v => v.userId === req.user.userId);
  userVehicles.forEach(v => {
    store.update('vehicles', v.id, { isDefault: v.id === req.params.id });
  });
  return ResponseUtil.success(res, null, '设置成功');
});

router.get('/violations', (req, res) => {
  const { vehicleId, page = 1, pageSize = 10 } = req.query;
  let violations = store.query('violations', v => {
    const userVehicles = store.query('vehicles', vh => vh.userId === req.user.userId);
    const vehicleIds = userVehicles.map(vh => vh.id);
    if (!vehicleIds.includes(v.vehicleId)) return false;
    if (vehicleId && v.vehicleId !== vehicleId) return false;
    return true;
  });
  const total = violations.length;
  const start = (page - 1) * pageSize;
  const list = violations.slice(start, start + Number(pageSize));
  return ResponseUtil.paginate(res, { list, total, page: Number(page), pageSize: Number(pageSize) });
});

router.post('/violations/refresh', (req, res) => {
  const { vehicleId } = req.body;
  if (!vehicleId) {
    return ResponseUtil.error(res, '车辆ID不能为空');
  }
  const vehicle = store.findById('vehicles', vehicleId);
  if (!vehicle || vehicle.userId !== req.user.userId) {
    return ResponseUtil.error(res, '车辆不存在', 404);
  }
  const violationTypes = [
    { type: '超速', fine: 200, points: 3 },
    { type: '违停', fine: 100, points: 0 },
    { type: '闯红灯', fine: 200, points: 6 },
    { type: '不按车道行驶', fine: 100, points: 2 },
    { type: '未系安全带', fine: 50, points: 1 },
  ];
  const random = violationTypes[Math.floor(Math.random() * violationTypes.length)];
  const violation = store.create('violations', {
    id: store.generateId('VL'),
    vehicleId,
    type: random.type,
    fine: random.fine,
    points: random.points,
    location: '模拟违章地点',
    time: dayjs().subtract(Math.floor(Math.random() * 30), 'day').toISOString(),
    status: 'unpaid',
  });
  return ResponseUtil.success(res, [violation], '刷新成功');
});

router.post('/violations/pay', (req, res) => {
  const { violationId } = req.body;
  if (!violationId) {
    return ResponseUtil.error(res, '违章ID不能为空');
  }
  const violation = store.findById('violations', violationId);
  if (!violation) {
    return ResponseUtil.error(res, '违章记录不存在', 404);
  }
  if (violation.status === 'paid') {
    return ResponseUtil.error(res, '该违章已缴纳');
  }
  const orderId = store.generateId('PAY');
  store.update('violations', violationId, { status: 'processing', orderId });
  const member = store.query('members', m => m.userId === req.user.userId)[0];
  if (member) {
    member.annualSpending = (member.annualSpending || 0) + violation.fine;
    upgradeMemberLevel(member);
    store.update('members', member.id, {
      annualSpending: member.annualSpending,
      level: member.level,
      discountRate: member.discountRate,
    });
  }
  return ResponseUtil.success(res, {
    orderId,
    amount: violation.fine,
    status: 'processing',
  }, '代缴申请已提交');
});

router.get('/violations/pay/:orderId', (req, res) => {
  const violation = store.query('violations', v => v.orderId === req.params.orderId)[0];
  if (!violation) {
    return ResponseUtil.error(res, '订单不存在', 404);
  }
  if (violation.status === 'processing') {
    store.update('violations', violation.id, { status: 'paid' });
    violation.status = 'paid';
  }
  return ResponseUtil.success(res, {
    orderId: violation.orderId,
    amount: violation.fine,
    status: violation.status,
  });
});

router.get('/insurances', (req, res) => {
  const insurances = store.query('insurances', i => {
    const userVehicles = store.query('vehicles', v => v.userId === req.user.userId);
    const vehicleIds = userVehicles.map(v => v.id);
    return vehicleIds.includes(i.vehicleId);
  });
  return ResponseUtil.success(res, insurances);
});

router.get('/insurances/quote', (req, res) => {
  const { vehicleId } = req.query;
  if (!vehicleId) {
    return ResponseUtil.error(res, '车辆ID不能为空');
  }
  const vehicle = store.findById('vehicles', vehicleId);
  if (!vehicle || vehicle.userId !== req.user.userId) {
    return ResponseUtil.error(res, '车辆不存在', 404);
  }
  const quotes = [
    { company: '中国人保', price: 3200, type: '综合险' },
    { company: '中国平安', price: 2980, type: '综合险' },
    { company: '太平洋保险', price: 3100, type: '综合险' },
  ];
  return ResponseUtil.success(res, quotes);
});

router.get('/insurances/reminders', (req, res) => {
  const userVehicles = store.query('vehicles', v => v.userId === req.user.userId);
  const vehicleIds = userVehicles.map(v => v.id);
  const insurances = store.query('insurances', i => vehicleIds.includes(i.vehicleId));
  const reminders = insurances
    .filter(i => i.endDate && dayjs(i.endDate).diff(dayjs(), 'day') <= 30 && dayjs(i.endDate).diff(dayjs(), 'day') >= 0)
    .map(i => ({
      insuranceId: i.id,
      vehicleId: i.vehicleId,
      company: i.company,
      endDate: i.endDate,
      daysLeft: dayjs(i.endDate).diff(dayjs(), 'day'),
    }));
  return ResponseUtil.success(res, reminders);
});

router.get('/insurances/:id', (req, res) => {
  const insurance = store.findById('insurances', req.params.id);
  if (!insurance) {
    return ResponseUtil.error(res, '保险记录不存在', 404);
  }
  const vehicle = store.findById('vehicles', insurance.vehicleId);
  if (!vehicle || vehicle.userId !== req.user.userId) {
    return ResponseUtil.error(res, '无权访问', 403);
  }
  return ResponseUtil.success(res, insurance);
});

router.post('/insurances/renew', (req, res) => {
  const { vehicleId, company, type, price, startDate } = req.body;
  if (!vehicleId || !company || !type || !price) {
    return ResponseUtil.error(res, '缺少必要参数');
  }
  const vehicle = store.findById('vehicles', vehicleId);
  if (!vehicle || vehicle.userId !== req.user.userId) {
    return ResponseUtil.error(res, '车辆不存在', 404);
  }
  const start = startDate ? dayjs(startDate) : dayjs();
  const insurance = store.create('insurances', {
    id: store.generateId('INS'),
    vehicleId,
    company,
    type,
    price,
    startDate: start.toISOString(),
    endDate: start.add(1, 'year').toISOString(),
    status: 'active',
  });
  const member = store.query('members', m => m.userId === req.user.userId)[0];
  if (member) {
    member.annualSpending = (member.annualSpending || 0) + price;
    upgradeMemberLevel(member);
    store.update('members', member.id, {
      annualSpending: member.annualSpending,
      level: member.level,
      discountRate: member.discountRate,
    });
  }
  return ResponseUtil.success(res, insurance, '续保成功');
});

router.get('/member', (req, res) => {
  const member = store.query('members', m => m.userId === req.user.userId)[0];
  if (!member) {
    return ResponseUtil.error(res, '会员信息不存在', 404);
  }
  return ResponseUtil.success(res, member);
});

router.get('/member/level-rules', (req, res) => {
  const rules = [
    { level: 'normal', name: '普通会员', condition: '默认', discount: 1.0, benefits: ['基础服务'] },
    { level: 'silver', name: '银卡会员', condition: '年消费≥5000元或救援≥3次', discount: 0.9, benefits: ['基础服务', '专属客服', '9折优惠'] },
    { level: 'gold', name: '金卡会员', condition: '年消费≥10000元或救援≥5次', discount: 0.8, benefits: ['基础服务', '专属客服', '8折优惠', '优先救援', '免费洗车'] },
  ];
  return ResponseUtil.success(res, rules);
});

router.get('/member/benefits', (req, res) => {
  const member = store.query('members', m => m.userId === req.user.userId)[0];
  if (!member) {
    return ResponseUtil.error(res, '会员信息不存在', 404);
  }
  const allBenefits = {
    normal: ['基础服务'],
    silver: ['基础服务', '专属客服', '9折优惠'],
    gold: ['基础服务', '专属客服', '8折优惠', '优先救援', '免费洗车'],
  };
  return ResponseUtil.success(res, {
    level: member.level,
    benefits: allBenefits[member.level] || allBenefits.normal,
    discountRate: member.discountRate,
  });
});

router.get('/member/spending-history', (req, res) => {
  const { page = 1, pageSize = 10 } = req.query;
  const orders = store.query('orders', o => o.userId === req.user.userId);
  orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const total = orders.length;
  const start = (page - 1) * pageSize;
  const list = orders.slice(start, start + Number(pageSize));
  return ResponseUtil.paginate(res, { list, total, page: Number(page), pageSize: Number(pageSize) });
});

router.get('/notification-settings', (req, res) => {
  const user = store.findById('users', req.user.userId);
  if (!user) {
    return ResponseUtil.error(res, '用户不存在', 404);
  }
  const settings = user.notificationSettings || {
    booking: true,
    rescue: true,
    violation: true,
    insurance: true,
    promotion: false,
  };
  return ResponseUtil.success(res, settings);
});

router.put('/notification-settings', (req, res) => {
  const { booking, rescue, violation, insurance, promotion } = req.body;
  const settings = {
    booking: booking !== undefined ? booking : true,
    rescue: rescue !== undefined ? rescue : true,
    violation: violation !== undefined ? violation : true,
    insurance: insurance !== undefined ? insurance : true,
    promotion: promotion !== undefined ? promotion : false,
  };
  store.update('users', req.user.userId, { notificationSettings: settings });
  return ResponseUtil.success(res, settings, '更新成功');
});

module.exports = router;
