import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthPayload } from '../types';

let io: Server;
const userSockets = new Map<string, Set<string>>();

export function initWebSocket(server: HTTPServer) {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers['authorization']?.split(' ')[1];
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as AuthPayload;
      (socket as any).user = decoded;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user as AuthPayload;
    if (!user) return;

    if (!userSockets.has(user.userId)) {
      userSockets.set(user.userId, new Set());
    }
    userSockets.get(user.userId)!.add(socket.id);

    socket.join(`user:${user.userId}`);
    socket.join(`role:${user.role}`);

    console.log(`[WS] User connected: ${user.userId} (${user.role})`);

    socket.on('disconnect', () => {
      const sockets = userSockets.get(user.userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(user.userId);
        }
      }
      console.log(`[WS] User disconnected: ${user.userId}`);
    });
  });

  console.log('[WS] WebSocket server initialized');
}

export function sendToUser(userId: string, event: string, data: any) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
  console.log(`[WS] Sent to user ${userId}: ${event}`);
}

export function sendToRole(role: string, event: string, data: any) {
  if (!io) return;
  io.to(`role:${role}`).emit(event, data);
  console.log(`[WS] Sent to role ${role}: ${event}`);
}

export function broadcast(event: string, data: any) {
  if (!io) return;
  io.emit(event, data);
  console.log(`[WS] Broadcast: ${event}`);
}
