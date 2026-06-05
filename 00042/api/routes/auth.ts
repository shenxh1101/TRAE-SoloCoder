import { Router, type Request, type Response } from 'express'
import db from '../database.js'

const router = Router()

router.post('/login', (req: Request, res: Response): void => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      res.status(400).json({ success: false, error: '用户名和密码不能为空' })
      return
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any
    if (!user || user.password !== password) {
      res.status(401).json({ success: false, error: '用户名或密码错误' })
      return
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        department: user.department,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '登录失败' })
  }
})

router.post('/logout', (_req: Request, res: Response): void => {
  res.json({ success: true, message: '退出成功' })
})

router.get('/me', (req: Request, res: Response): void => {
  try {
    const userId = req.headers['x-user-id'] as string
    if (!userId) {
      res.status(401).json({ success: false, error: '未提供用户标识' })
      return
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any
    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' })
      return
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        department: user.department,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取用户信息失败' })
  }
})

export default router
