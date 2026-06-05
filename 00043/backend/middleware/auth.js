import jwt from 'jsonwebtoken';
import db from '../config/db.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = db.prepare('SELECT id, name, email, phone, role, avatar, createdAt FROM users WHERE id = ?').get(decoded.id);
      if (!user) {
        return res.status(401).json({ message: '未授权，token无效' });
      }
      req.user = user;
      next();
    } catch (error) {
      res.status(401).json({ message: '未授权，token无效' });
    }
  }

  if (!token) {
    res.status(401).json({ message: '未授权，缺少token' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: '权限不足' });
    }
    next();
  };
};

export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};
