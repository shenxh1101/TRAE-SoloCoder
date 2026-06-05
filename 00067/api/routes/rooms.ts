import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

interface Room {
  id: string
  code: string
  hostId: string
  hostName: string
  createdAt: number
}

const rooms = new Map<string, Room>()

function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

router.post('/create', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userName } = req.body

    if (!userName || typeof userName !== 'string' || userName.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: '用户名不能为空',
      })
      return
    }

    if (userName.trim().length > 20) {
      res.status(400).json({
        success: false,
        error: '用户名长度不能超过20个字符',
      })
      return
    }

    let roomCode: string
    do {
      roomCode = generateRoomCode()
    } while (rooms.has(roomCode))

    const roomId = uuidv4()
    const hostId = uuidv4()

    const room: Room = {
      id: roomId,
      code: roomCode,
      hostId,
      hostName: userName.trim(),
      createdAt: Date.now(),
    }

    rooms.set(roomCode, room)

    res.status(200).json({
      success: true,
      data: {
        roomId,
        roomCode,
        hostId,
      },
    })
  } catch (error) {
    console.error('Failed to create room:', error)
    res.status(500).json({
      success: false,
      error: '创建房间失败，请稍后重试',
    })
  }
})

router.post('/join', async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomCode, userName } = req.body

    if (!userName || typeof userName !== 'string' || userName.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: '用户名不能为空',
      })
      return
    }

    if (userName.trim().length > 20) {
      res.status(400).json({
        success: false,
        error: '用户名长度不能超过20个字符',
      })
      return
    }

    if (!roomCode || typeof roomCode !== 'string') {
      res.status(400).json({
        success: false,
        error: '房间码不能为空',
      })
      return
    }

    const normalizedCode = roomCode.toUpperCase().trim()
    const room = rooms.get(normalizedCode)

    if (!room) {
      res.status(404).json({
        success: false,
        error: '房间不存在，请检查房间码',
      })
      return
    }

    const userId = uuidv4()

    res.status(200).json({
      success: true,
      data: {
        roomId: room.id,
        roomCode: normalizedCode,
        userId,
        isHost: false,
      },
    })
  } catch (error) {
    console.error('Failed to join room:', error)
    res.status(500).json({
      success: false,
      error: '加入房间失败，请稍后重试',
    })
  }
})

export default router
