import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import type { User, Layer, CanvasState, WebSocketMessage } from '../shared/types.js';

interface RoomUser extends User {
  ws: WebSocket;
}

interface Room {
  id: string;
  users: Map<string, RoomUser>;
  layers: Layer[];
  activeLayerId: string | null;
  offset: { x: number; y: number };
  zoom: number;
  followMode: boolean;
  createdAt: number;
}

class RoomManager {
  private rooms: Map<string, Room> = new Map();

  createRoom(): string {
    const roomId = uuidv4();
    const room: Room = {
      id: roomId,
      users: new Map(),
      layers: [],
      activeLayerId: null,
      offset: { x: 0, y: 0 },
      zoom: 1,
      followMode: false,
      createdAt: Date.now(),
    };
    this.rooms.set(roomId, room);
    return roomId;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  hasRoom(roomId: string): boolean {
    return this.rooms.has(roomId);
  }

  addUser(
    roomId: string,
    userId: string,
    userName: string,
    ws: WebSocket
  ): { user: User; isHost: boolean } {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        id: roomId,
        users: new Map(),
        layers: [],
        activeLayerId: null,
        offset: { x: 0, y: 0 },
        zoom: 1,
        followMode: false,
        createdAt: Date.now(),
      };
      this.rooms.set(roomId, room);
    }

    const isHost = room.users.size === 0;
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
    const colorIndex = room.users.size % colors.length;

    const user: RoomUser = {
      id: userId,
      name: userName,
      color: colors[colorIndex],
      isHost,
      joinedAt: Date.now(),
      ws,
    };

    room.users.set(userId, user);

    return {
      user: {
        id: user.id,
        name: user.name,
        color: user.color,
        isHost: user.isHost,
        joinedAt: user.joinedAt,
      },
      isHost,
    };
  }

  removeUser(roomId: string, userId: string): User | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const user = room.users.get(userId);
    if (!user) return null;

    room.users.delete(userId);

    if (room.users.size === 0) {
      this.rooms.delete(roomId);
    } else if (user.isHost) {
      const firstUser = room.users.values().next().value;
      firstUser.isHost = true;
    }

    return {
      id: user.id,
      name: user.name,
      color: user.color,
      isHost: user.isHost,
      joinedAt: user.joinedAt,
    };
  }

  getUsers(roomId: string): User[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    return Array.from(room.users.values()).map((u) => ({
      id: u.id,
      name: u.name,
      color: u.color,
      isHost: u.isHost,
      joinedAt: u.joinedAt,
    }));
  }

  getUserWs(roomId: string, userId: string): WebSocket | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    return room.users.get(userId)?.ws;
  }

  setLayers(roomId: string, layers: Layer[]): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.layers = layers;
    }
  }

  getLayers(roomId: string): Layer[] {
    const room = this.rooms.get(roomId);
    return room ? room.layers : [];
  }

  setActiveLayerId(roomId: string, layerId: string | null): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.activeLayerId = layerId;
    }
  }

  setView(roomId: string, offset: { x: number; y: number }, zoom: number): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.offset = offset;
      room.zoom = zoom;
    }
  }

  getCanvasState(roomId: string): CanvasState | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    return {
      layers: room.layers,
      activeLayerId: room.activeLayerId,
      offset: room.offset,
      zoom: room.zoom,
      users: this.getUsers(roomId),
    };
  }

  broadcast(
    roomId: string,
    message: WebSocketMessage,
    excludeUserId?: string
  ): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const messageStr = JSON.stringify(message);

    for (const [userId, user] of room.users) {
      if (excludeUserId && userId === excludeUserId) continue;
      if (user.ws.readyState === WebSocket.OPEN) {
        user.ws.send(messageStr);
      }
    }
  }

  sendToUser(
    roomId: string,
    userId: string,
    message: WebSocketMessage
  ): boolean {
    const ws = this.getUserWs(roomId, userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  isHost(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    const user = room.users.get(userId);
    return user?.isHost ?? false;
  }
}

export const roomManager = new RoomManager();
export default roomManager;
