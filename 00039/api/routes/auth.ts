import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

router.post('/login', (req: Request, res: Response): void => {
  const { username, password } = req.body
  if (!username || !password) {
    res.status(400).json({ success: false, error: '请输入用户名和密码' })
    return
  }

  const user = db.prepare(
    `SELECT id, username, role, name, email FROM users WHERE username = ? AND password = ?`
  ).get(username, password) as { id: string; username: string; role: string; name: string; email: string } | undefined

  if (!user) {
    res.status(401).json({ success: false, error: '用户名或密码错误' })
    return
  }

  res.json({ success: true, data: user })
})

router.get('/users', (req: Request, res: Response): void => {
  const { role } = req.query
  let users: unknown[]
  if (role) {
    users = db.prepare(
      `SELECT id, username, role, name, email FROM users WHERE role = ?`
    ).all(role)
  } else {
    users = db.prepare(
      `SELECT id, username, role, name, email FROM users`
    ).all()
  }
  res.json({ success: true, data: users })
})

router.get('/users/:id', (req: Request, res: Response): void => {
  const user = db.prepare(
    `SELECT id, username, role, name, email FROM users WHERE id = ?`
  ).get(req.params.id) as { id: string; username: string; role: string; name: string; email: string } | undefined

  if (!user) {
    res.status(404).json({ success: false, error: '用户不存在' })
    return
  }
  res.json({ success: true, data: user })
})

export default router
