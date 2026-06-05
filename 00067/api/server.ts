import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import type * as WS from 'ws';
import dotenv from 'dotenv';
import app from './index.js';
import roomManager from './roomManager.js';
import type { Layer, WebSocketMessage, SyncMessage, JoinMessage, LeaveMessage, ViewMessage, DrawMessage, LayerMessage, CursorMessage } from '../shared/types.js';

dotenv.config();

const PORT = process.env.PORT || 3001;

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

interface ConnectionInfo {
  roomId: string;
  userId: string;
  userName: string;
}

const connections = new Map<WebSocket, ConnectionInfo>();

function parseMessage(data: WS.RawData): WebSocketMessage | null {
  try {
    return JSON.parse(data.toString()) as WebSocketMessage;
  } catch {
    return null;
  }
}

function handleJoin(ws: WebSocket, message: JoinMessage): void {
  const { roomId, userId, userName } = message;

  if (!roomId || !userId || !userName) {
    ws.send(JSON.stringify({ type: 'error', message: 'Missing required fields' }));
    return;
  }

  const { user } = roomManager.addUser(roomId, userId, userName, ws);
  connections.set(ws, { roomId, userId, userName });

  const state = roomManager.getCanvasState(roomId);
  if (state) {
    const syncMessage: SyncMessage = {
      type: 'sync:full',
      roomId,
      userId,
      timestamp: Date.now(),
      state,
    };
    roomManager.sendToUser(roomId, userId, syncMessage);
  }

  const joinBroadcast: JoinMessage = {
    type: 'user:join',
    roomId,
    userId: user.id,
    timestamp: Date.now(),
    userName: user.name,
  };
  roomManager.broadcast(roomId, joinBroadcast, userId);

  console.log(`User ${userName} (${userId}) joined room ${roomId}`);
}

function handleLeave(ws: WebSocket, message: LeaveMessage): void {
  const { roomId, userId } = message;
  handleDisconnect(ws, roomId, userId);
}

function handleDisconnect(ws: WebSocket, roomId?: string, userId?: string): void {
  const info = connections.get(ws);
  const actualRoomId = roomId || info?.roomId;
  const actualUserId = userId || info?.userId;

  if (actualRoomId && actualUserId) {
    const user = roomManager.removeUser(actualRoomId, actualUserId);
    if (user) {
      const leaveMessage: LeaveMessage = {
        type: 'user:leave',
        roomId: actualRoomId,
        userId: actualUserId,
        timestamp: Date.now(),
      };
      roomManager.broadcast(actualRoomId, leaveMessage);
      console.log(`User ${user.name} (${actualUserId}) left room ${actualRoomId}`);
    }
  }

  connections.delete(ws);
}

function handleDraw(message: DrawMessage): void {
  const { roomId, userId } = message;
  roomManager.broadcast(roomId, message, userId);
}

function handleLayer(message: LayerMessage): void {
  const { roomId, userId, type, layerId, data } = message;

  if (type === 'layer:create' || type === 'layer:update') {
    const layers = roomManager.getLayers(roomId);
    if (type === 'layer:create') {
      if (data) {
        layers.push(data as Layer);
        roomManager.setLayers(roomId, layers);
      }
    } else if (type === 'layer:update') {
      const index = layers.findIndex((l) => l.id === layerId);
      if (index !== -1 && data) {
        layers[index] = { ...layers[index], ...data };
        roomManager.setLayers(roomId, layers);
      }
    }
  } else if (type === 'layer:delete') {
    const layers = roomManager.getLayers(roomId).filter((l) => l.id !== layerId);
    roomManager.setLayers(roomId, layers);
  } else if (type === 'layer:reorder') {
    if (data && data.order !== undefined) {
      const layers = roomManager.getLayers(roomId);
      const layer = layers.find((l) => l.id === layerId);
      if (layer) {
        layer.order = data.order;
        layers.sort((a, b) => a.order - b.order);
        roomManager.setLayers(roomId, layers);
      }
    }
  }

  roomManager.broadcast(roomId, message, userId);
}

function handleView(message: ViewMessage): void {
  const { roomId, userId, offset, zoom } = message;

  if (roomManager.isHost(roomId, userId)) {
    roomManager.setView(roomId, offset, zoom);
  }

  roomManager.broadcast(roomId, message, userId);
}

function handleCursor(message: CursorMessage): void {
  const { roomId, userId } = message;
  roomManager.broadcast(roomId, message, userId);
}

function handleSync(message: SyncMessage): void {
  const { roomId, userId, state } = message;

  if (roomManager.isHost(roomId, userId)) {
    roomManager.setLayers(roomId, state.layers);
    roomManager.setActiveLayerId(roomId, state.activeLayerId);
    roomManager.setView(roomId, state.offset, state.zoom);
  }
}

server.on('upgrade', (request, socket, head) => {
  const pathname = request.url || '/';
  
  if (pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws, _req) => {
  console.log('New WebSocket connection on /ws');

  ws.on('message', (data) => {
    const message = parseMessage(data);
    if (!message) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      return;
    }

    try {
      switch (message.type) {
        case 'user:join':
          handleJoin(ws, message as JoinMessage);
          break;
        case 'user:leave':
          handleLeave(ws, message as LeaveMessage);
          break;
        case 'draw:action':
          handleDraw(message as DrawMessage);
          break;
        case 'layer:create':
        case 'layer:delete':
        case 'layer:update':
        case 'layer:reorder':
          handleLayer(message as LayerMessage);
          break;
        case 'view:update':
          handleView(message as ViewMessage);
          break;
        case 'cursor:update':
          handleCursor(message as CursorMessage);
          break;
        case 'sync:full':
          handleSync(message as SyncMessage);
          break;
        default:
          console.log(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Internal server error' }));
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    handleDisconnect(ws);
  });

  ws.on('close', (code, reason) => {
    console.log(`WebSocket closed: ${code} - ${reason}`);
    handleDisconnect(ws);
  });
});

app.post('/api/rooms', (req, res) => {
  const roomId = roomManager.createRoom();
  res.json({ roomId });
});

app.get('/api/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  if (!roomManager.hasRoom(roomId)) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  const state = roomManager.getCanvasState(roomId);
  res.json(state);
});

server.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
  console.log(`WebSocket server ready on ws://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  wss.close(() => {
    console.log('WebSocket server closed');
  });
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  wss.close(() => {
    console.log('WebSocket server closed');
  });
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
