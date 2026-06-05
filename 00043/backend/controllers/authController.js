import db from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { generateId, formatRow } from '../utils/helpers.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

export const register = async (req, res) => {
  const { name, email, password, phone } = req.body;

  try {
    const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ message: '用户已存在' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const id = generateId();
    db.prepare(`
      INSERT INTO users (id, name, email, password, phone, role, avatar)
      VALUES (?, ?, ?, ?, ?, 'user', ?)
    `).run(id, name, email, hashedPassword, phone, `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`);

    const user = db.prepare('SELECT id, name, email, phone, role, avatar, createdAt FROM users WHERE id = ?').get(id);

    res.status(201).json({
      ...user,
      token: generateToken(id),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user) {
      return res.status(401).json({ message: '邮箱或密码错误' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: '邮箱或密码错误' });
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
      createdAt: user.createdAt,
      token: generateToken(user.id),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    const user = db.prepare('SELECT id, name, email, phone, role, avatar, createdAt FROM users WHERE id = ?').get(req.user.id);
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};
