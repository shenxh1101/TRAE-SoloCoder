import { WebSocketServer, WebSocket } from 'ws'
import type { Server } from 'http'

class NotificationService {
  private wss: WebSocketServer | null = null
  private clients: Map<number, WebSocket> = new Map()

  init(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' })

    this.wss.on('connection', (ws, req) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`)
      const token = url.searchParams.get('token')

      if (!token) {
        ws.close(4001, 'Missing token')
        return
      }

      try {
        const data = JSON.parse(Buffer.from(token, 'base64').toString())
        if (data.exp && data.exp < Date.now()) {
          ws.close(4002, 'Token expired')
          return
        }

        const userId = data.id as number
        this.clients.set(userId, ws)

        ws.on('close', () => {
          this.clients.delete(userId)
        })

        ws.on('error', () => {
          this.clients.delete(userId)
        })

        ws.send(JSON.stringify({ type: 'connected', message: 'Notification service connected' }))
      } catch {
        ws.close(4003, 'Invalid token')
      }
    })
  }

  notifyUser(userId: number, message: object): void {
    const ws = this.clients.get(userId)
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }

  notifyVolunteers(volunteerIds: number[], message: object): void {
    const payload = JSON.stringify(message)
    for (const id of volunteerIds) {
      const ws = this.clients.get(id)
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(payload)
      }
    }
  }

  broadcast(message: object): void {
    const payload = JSON.stringify(message)
    this.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload)
      }
    })
  }
}

export const notificationService = new NotificationService()
