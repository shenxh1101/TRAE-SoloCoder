import { WS_URL } from './api';
import { getToken } from './authService';

export type WebSocketMessageType =
  | 'temperature'
  | 'notification'
  | 'task_update'
  | 'alert';

export interface WebSocketMessage<T = unknown> {
  type: WebSocketMessageType;
  data: T;
  timestamp: string;
}

type Callback<T> = (data: T) => void;

class WebSocketService {
  private static instance: WebSocketService;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;

  private temperatureListeners: Callback<unknown>[] = [];
  private notificationListeners: Callback<unknown>[] = [];
  private taskUpdateListeners: Callback<unknown>[] = [];
  private alertListeners: Callback<unknown>[] = [];

  private constructor() {}

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    const token = getToken();
    const wsUrl = token ? `${WS_URL}?token=${encodeURIComponent(token)}` : WS_URL;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.reconnect();
    };
  }

  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    setTimeout(() => {
      console.log(`Reconnecting attempt ${this.reconnectAttempts}...`);
      this.connect();
    }, this.reconnectDelay);
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.reconnectAttempts = 0;
  }

  send(type: WebSocketMessageType, data: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    const message: WebSocketMessage = {
      type,
      data,
      timestamp: new Date().toISOString(),
    };

    this.ws.send(JSON.stringify(message));
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'temperature':
        this.temperatureListeners.forEach((cb) => cb(message.data));
        break;
      case 'notification':
        this.notificationListeners.forEach((cb) => cb(message.data));
        break;
      case 'task_update':
        this.taskUpdateListeners.forEach((cb) => cb(message.data));
        break;
      case 'alert':
        this.alertListeners.forEach((cb) => cb(message.data));
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  onTemperature<T = unknown>(callback: Callback<T>): void {
    this.temperatureListeners.push(callback as Callback<unknown>);
  }

  onNotification<T = unknown>(callback: Callback<T>): void {
    this.notificationListeners.push(callback as Callback<unknown>);
  }

  onTaskUpdate<T = unknown>(callback: Callback<T>): void {
    this.taskUpdateListeners.push(callback as Callback<unknown>);
  }

  onAlert<T = unknown>(callback: Callback<T>): void {
    this.alertListeners.push(callback as Callback<unknown>);
  }

  removeAllListeners(): void {
    this.temperatureListeners = [];
    this.notificationListeners = [];
    this.taskUpdateListeners = [];
    this.alertListeners = [];
  }
}

export const websocketService = WebSocketService.getInstance();
