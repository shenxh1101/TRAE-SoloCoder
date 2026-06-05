import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import prisma from '../config/prisma';
import { MessageType } from '@prisma/client';

let io: Server;
const userSockets = new Map<string, Socket>();

export const initWebSocket = (httpServer: HttpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log('Client connected:', socket.id);

    socket.on('register', (userId: string) => {
      userSockets.set(userId, socket);
      socket.data.userId = userId;
      console.log(`User ${userId} registered with socket ${socket.id}`);
    });

    socket.on('disconnect', () => {
      const userId = socket.data.userId;
      if (userId) {
        userSockets.delete(userId);
      }
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
};

export const sendMessageToUser = async (
  userId: string,
  message: {
    title: string;
    content: string;
    type: MessageType;
  }
) => {
  const savedMessage = await prisma.message.create({
    data: {
      userId,
      ...message,
    },
  });

  const socket = userSockets.get(userId);
  if (socket) {
    socket.emit('message', savedMessage);
  }

  return savedMessage;
};

export const broadcastMessage = (event: string, data: any) => {
  if (io) {
    io.emit(event, data);
  }
};

export const getIO = () => io;
