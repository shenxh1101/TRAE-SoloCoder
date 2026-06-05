import http from 'http'
import { WebSocketServer, WebSocket as WSWebSocket } from 'ws'
import { URL } from 'url'
import app from './app'
import config from './config/index'
import { monitoringService } from './services/monitoringService'

interface ExtendedWebSocket extends WSWebSocket {
  taskId?: string
}

const server = http.createServer(app)

const wss = new WebSocketServer({ 
  port: config.websocketPort,
  perMessageDeflate: {
    zlibDeflateOptions: {
      level: 3,
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024,
    },
    clientNoContextTakeover: true,
    serverNoContextTakeover: true,
  },
})

const clients = new Set<ExtendedWebSocket>()

wss.on('connection', (ws: WSWebSocket, req) => {
  const extendedWs = ws as ExtendedWebSocket
  
  const url = new URL(req.url || '/', `http://${req.headers.host}`)
  const taskId = url.searchParams.get('taskId')
  
  console.log(`WebSocket client connected on port ${config.websocketPort}`)
  clients.add(extendedWs)

  if (taskId) {
    extendedWs.taskId = taskId
    monitoringService.subscribe(taskId, ws)
    console.log(`Auto-subscribed to task: ${taskId}`)
  }

  extendedWs.on('message', (data: Buffer) => {
    const message = data.toString()
    
    try {
      const parsed = JSON.parse(message)
      
      if (parsed.action === 'subscribe' && parsed.taskId) {
        extendedWs.taskId = parsed.taskId
        monitoringService.subscribe(parsed.taskId, ws)
        console.log(`Client subscribed to task: ${parsed.taskId}`)
      } else if (parsed.action === 'unsubscribe' && parsed.taskId) {
        monitoringService.unsubscribe(parsed.taskId, ws)
        console.log(`Client unsubscribed from task: ${parsed.taskId}`)
      } else if (parsed.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }))
      }
    } catch (error) {
      console.error('Invalid WebSocket message:', error)
    }
  })

  extendedWs.on('close', () => {
    console.log('WebSocket client disconnected')
    clients.delete(extendedWs)
    if (extendedWs.taskId) {
      monitoringService.unsubscribe(extendedWs.taskId, ws)
    }
  })

  extendedWs.on('error', (error: Error) => {
    console.error('WebSocket error:', error)
    clients.delete(extendedWs)
    if (extendedWs.taskId) {
      monitoringService.unsubscribe(extendedWs.taskId, ws)
    }
  })

  extendedWs.send(JSON.stringify({
    type: 'connected',
    message: 'Connected to real-time updates server',
    timestamp: new Date().toISOString(),
  }))
})

export const broadcastToTask = (taskId: string, data: object): void => {
  const message = JSON.stringify({
    ...data,
    taskId,
    timestamp: new Date().toISOString(),
  })

  clients.forEach(client => {
    if (client.readyState === WSWebSocket.OPEN && client.taskId === taskId) {
      client.send(message)
    }
  })
  
  monitoringService.broadcastMetrics(taskId, data as any)
}

export const broadcastToAll = (data: object): void => {
  const message = JSON.stringify({
    ...data,
    timestamp: new Date().toISOString(),
  })

  clients.forEach(client => {
    if (client.readyState === WSWebSocket.OPEN) {
      client.send(message)
    }
  })
}

const PORT = config.port

server.listen(PORT, () => {
  console.log(`HTTP Server ready on port ${PORT}`)
  console.log(`WebSocket Server ready on port ${config.websocketPort}`)
})

const gracefulShutdown = (): void => {
  console.log('\nStarting graceful shutdown...')
  
  server.close(() => {
    console.log('HTTP server closed')
  })

  wss.close(() => {
    console.log('WebSocket server closed')
  })

  clients.forEach(client => {
    client.close(1001, 'Server shutting down')
  })

  setTimeout(() => {
    console.log('Forcing shutdown after timeout')
    process.exit(1)
  }, 5000)
}

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received')
  gracefulShutdown()
})

process.on('SIGINT', () => {
  console.log('SIGINT signal received')
  gracefulShutdown()
})

process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error)
  gracefulShutdown()
})

process.on('unhandledRejection', (_reason: any, _promise: Promise<any>) => {
  console.error('Unhandled Rejection at:', _promise, 'reason:', _reason)
})

export default server
