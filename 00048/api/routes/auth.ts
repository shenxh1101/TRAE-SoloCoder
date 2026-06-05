import crypto from 'crypto'
import express, { Router, type Request, type Response, type NextFunction } from 'express'
import { getDb } from '../database.js'

const router = Router()

function simpleHash(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

function createToken(payload: { id: number; username: string; role: string }): string {
  const data = { ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }
  return Buffer.from(JSON.stringify(data)).toString('base64')
}

export function verifyToken(token: string): { id: number; username: string; role: string } | null {
  try {
    const data = JSON.parse(Buffer.from(token, 'base64').toString())
    if (data.exp && data.exp < Date.now()) return null
    return { id: data.id, username: data.username, role: data.role }
  } catch {
    return null
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: '未登录' })
    return
  }
  const token = auth.slice(7)
  const user = verifyToken(token)
  if (!user) {
    res.status(401).json({ success: false, error: '登录已过期' })
    return
  }
  ;(req as any).user = user
  next()
}

router.post('/register', (req: Request, res: Response): void => {
  const { username, email, password, phone } = req.body
  if (!username || !email || !password) {
    res.status(400).json({ success: false, error: '用户名、邮箱和密码不能为空' })
    return
  }

  const db = getDb()
  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email)
  if (existing) {
    res.status(409).json({ success: false, error: '用户名或邮箱已存在' })
    return
  }

  const result = db.prepare('INSERT INTO users (username, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)').run(username, email, simpleHash(password), 'user', phone || '')
  const user = db.prepare('SELECT id, username, email, role, avatar, phone, created_at FROM users WHERE id = ?').get(result.lastInsertRowid)
  const token = createToken({ id: (user as any).id, username: (user as any).username, role: (user as any).role })

  res.status(201).json({ success: true, data: { user, token } })
})

router.post('/login', (req: Request, res: Response): void => {
  const { username, password } = req.body
  if (!username || !password) {
    res.status(400).json({ success: false, error: '用户名和密码不能为空' })
    return
  }

  const db = getDb()
  const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, username) as any
  if (!user || user.password_hash !== simpleHash(password)) {
    res.status(401).json({ success: false, error: '用户名或密码错误' })
    return
  }

  const token = createToken({ id: user.id, username: user.username, role: user.role })
  const { password_hash, ...userInfo } = user

  res.json({ success: true, data: { user: userInfo, token } })
})

router.get('/me', authMiddleware, (req: Request, res: Response): void => {
  const currentUser = (req as any).user
  const db = getDb()
  const user = db.prepare('SELECT id, username, email, role, avatar, phone, created_at FROM users WHERE id = ?').get(currentUser.id)
  if (!user) {
    res.status(404).json({ success: false, error: '用户不存在' })
    return
  }
  res.json({ success: true, data: user })
})

export default router
