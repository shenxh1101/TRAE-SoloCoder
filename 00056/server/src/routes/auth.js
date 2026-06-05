const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const store = require('../models/store');
const { auth } = require('../middleware/auth');
const ResponseUtil = require('../utils/response');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

function generateTokens(userId, phone, role) {
  const token = jwt.sign({ userId, phone, role }, JWT_SECRET, { expiresIn: '7d' });
  const refreshToken = jwt.sign({ userId, type: 'refresh' }, JWT_REFRESH_SECRET, { expiresIn: '30d' });
  return { token, refreshToken };
}

function buildLoginResponse(user) {
  const member = store.query('members', m => m.userId === user.id)[0] || null;
  const { token, refreshToken } = generateTokens(user.id, user.phone, user.role);
  return { token, refreshToken, user, member };
}

const tokenBlacklist = new Set();

router.post('/send-sms', (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return ResponseUtil.error(res, '手机号不能为空');
  }
  return ResponseUtil.success(res, null, '验证码发送成功');
});

router.post('/login-sms', (req, res) => {
  const { phone } = req.body;
  const code = req.body.code || req.body.smsCode;
  if (!phone || !code) {
    return ResponseUtil.error(res, '手机号和验证码不能为空');
  }
  if (code !== '123456') {
    return ResponseUtil.error(res, '验证码错误');
  }
  let user = store.query('users', u => u.phone === phone)[0];
  if (!user) {
    const userId = store.generateId('U');
    user = store.create('users', {
      id: userId,
      phone,
      nickname: `用户${userId}`,
      avatar: '',
      gender: '',
      role: 'user',
      status: 'active',
    });
    store.create('members', {
      id: store.generateId('MB'),
      userId,
      level: 'normal',
      points: 0,
      annualSpending: 0,
      rescueCount: 0,
      discountRate: 1.0,
      expiresAt: dayjs().add(1, 'year').toISOString(),
    });
  }
  return ResponseUtil.success(res, buildLoginResponse(user), '登录成功');
});

router.post('/login-password', (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return ResponseUtil.error(res, '手机号和密码不能为空');
  }
  const user = store.query('users', u => u.phone === phone)[0];
  if (!user) {
    return ResponseUtil.error(res, '用户不存在');
  }
  if (!user.password || !bcrypt.compareSync(password, user.password)) {
    return ResponseUtil.error(res, '密码错误');
  }
  if (user.status === 'disabled') {
    return ResponseUtil.error(res, '账号已被禁用');
  }
  return ResponseUtil.success(res, buildLoginResponse(user), '登录成功');
});

router.post('/register', (req, res) => {
  const { phone, password } = req.body;
  const code = req.body.code || req.body.smsCode;
  if (!phone || !password || !code) {
    return ResponseUtil.error(res, '手机号、密码和验证码不能为空');
  }
  if (code !== '123456') {
    return ResponseUtil.error(res, '验证码错误');
  }
  const existing = store.query('users', u => u.phone === phone)[0];
  if (existing) {
    return ResponseUtil.error(res, '该手机号已注册');
  }
  const userId = store.generateId('U');
  const user = store.create('users', {
    id: userId,
    phone,
    password: bcrypt.hashSync(password, 10),
    nickname: `用户${userId}`,
    avatar: '',
    gender: '',
    role: 'user',
    status: 'active',
  });
  store.create('members', {
    id: store.generateId('MB'),
    userId,
    level: 'normal',
    points: 0,
    annualSpending: 0,
    rescueCount: 0,
    discountRate: 1.0,
    expiresAt: dayjs().add(1, 'year').toISOString(),
  });
  return ResponseUtil.success(res, buildLoginResponse(user), '注册成功');
});

router.post('/refresh-token', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return ResponseUtil.error(res, 'refreshToken不能为空');
  }
  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    if (decoded.type !== 'refresh') {
      return ResponseUtil.error(res, '无效的refreshToken', 401);
    }
    const user = store.findById('users', decoded.userId);
    if (!user) {
      return ResponseUtil.error(res, '用户不存在', 401);
    }
    const tokens = generateTokens(user.id, user.phone, user.role);
    return ResponseUtil.success(res, tokens, '刷新成功');
  } catch (err) {
    return ResponseUtil.error(res, 'refreshToken无效或已过期', 401);
  }
});

router.post('/logout', (req, res) => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    tokenBlacklist.add(header.split(' ')[1]);
  }
  return ResponseUtil.success(res, null, '退出登录成功');
});

router.get('/check', auth, (req, res) => {
  const user = store.findById('users', req.user.userId);
  if (!user) {
    return ResponseUtil.error(res, '用户不存在', 401);
  }
  const member = store.query('members', m => m.userId === user.id)[0] || null;
  return ResponseUtil.success(res, { user, member }, 'Token有效');
});

module.exports = router;
