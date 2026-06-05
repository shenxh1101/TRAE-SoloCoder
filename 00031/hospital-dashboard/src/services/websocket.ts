import type { Alert, WaitingRecord } from '../types';

type MessageType = 'alert' | 'waiting_record' | 'registration_update' | 'schedule_update' | 'ping' | 'pong';

interface WebSocketMessage<T = unknown> {
  type: MessageType;
  timestamp: string;
  data: T;
}

type MessageHandler<T = unknown> = (data: T) => void;

interface WebSocketConfig {
  url?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private isManualClose = false;
  private messageHandlers = new Map<MessageType, Set<MessageHandler>>();
  private connectionStatusListeners = new Set<(status: 'connecting' | 'connected' | 'disconnected' | 'error') => void>();

  constructor(config: WebSocketConfig = {}) {
    const wsBaseUrl = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:3001';
    this.config = {
      url: `${wsBaseUrl}/ws`,
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      ...config,
    };
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        resolve();
        return;
      }

      this.isManualClose = false;
      this.notifyConnectionStatus('connecting');

      try {
        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = () => {
          console.log('[WebSocket] Connected successfully');
          this.reconnectAttempts = 0;
          this.notifyConnectionStatus('connected');
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error('[WebSocket] Connection error:', error);
          this.notifyConnectionStatus('error');
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log('[WebSocket] Connection closed:', event.code, event.reason);
          this.stopHeartbeat();
          this.notifyConnectionStatus('disconnected');

          if (!this.isManualClose) {
            this.attemptReconnect();
          }
        };
      } catch (error) {
        console.error('[WebSocket] Failed to create connection:', error);
        this.notifyConnectionStatus('error');
        reject(error);
      }
    });
  }

  private handleMessage(messageData: string) {
    try {
      const message: WebSocketMessage = JSON.parse(messageData);

      if (message.type === 'ping') {
        this.sendPong();
        return;
      }

      if (message.type === 'pong') {
        return;
      }

      const handlers = this.messageHandlers.get(message.type);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(message.data);
          } catch (error) {
            console.error(`[WebSocket] Error handling ${message.type} message:`, error);
          }
        });
      }
    } catch (error) {
      console.error('[WebSocket] Failed to parse message:', error, messageData);
    }
  }

  private sendPong() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }));
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnect attempts reached, giving up');
      return;
    }

    this.reconnectAttempts++;
    console.log(`[WebSocket] Attempting to reconnect (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})...`);

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(error => {
        console.error('[WebSocket] Reconnect attempt failed:', error);
      });
    }, this.config.reconnectInterval * this.reconnectAttempts);
  }

  send<T = unknown>(type: MessageType, data: T): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[WebSocket] Cannot send message, not connected');
      return false;
    }

    try {
      const message: WebSocketMessage<T> = {
        type,
        timestamp: new Date().toISOString(),
        data,
      };
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('[WebSocket] Failed to send message:', error);
      return false;
    }
  }

  on<T = unknown>(type: MessageType, handler: MessageHandler<T>): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler as MessageHandler);

    return () => {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        handlers.delete(handler as MessageHandler);
      }
    };
  }

  onAlert(handler: MessageHandler<Alert>): () => void {
    return this.on<Alert>('alert', handler);
  }

  onWaitingRecord(handler: MessageHandler<WaitingRecord>): () => void {
    return this.on<WaitingRecord>('waiting_record', handler);
  }

  onRegistrationUpdate(handler: MessageHandler<{ registrationId: string; status: string }>): () => void {
    return this.on<{ registrationId: string; status: string }>('registration_update', handler);
  }

  onConnectionStatus(handler: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void): () => void {
    this.connectionStatusListeners.add(handler);
    return () => {
      this.connectionStatusListeners.delete(handler);
    };
  }

  private notifyConnectionStatus(status: 'connecting' | 'connected' | 'disconnected' | 'error') {
    this.connectionStatusListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('[WebSocket] Error in connection status listener:', error);
      }
    });
  }

  getStatus(): 'connecting' | 'connected' | 'disconnected' {
    if (!this.ws) return 'disconnected';
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      default:
        return 'disconnected';
    }
  }

  disconnect() {
    this.isManualClose = true;
    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }

    this.reconnectAttempts = 0;
  }

  destroy() {
    this.disconnect();
    this.messageHandlers.clear();
    this.connectionStatusListeners.clear();
  }
}

export const websocketService = new WebSocketService();

export const useWebSocket = () => {
  return {
    connect: () => websocketService.connect(),
    disconnect: () => websocketService.disconnect(),
    send: <T = unknown>(type: MessageType, data: T) => websocketService.send(type, data),
    onAlert: (handler: MessageHandler<Alert>) => websocketService.onAlert(handler),
    onWaitingRecord: (handler: MessageHandler<WaitingRecord>) => websocketService.onWaitingRecord(handler),
    onRegistrationUpdate: (handler: MessageHandler<{ registrationId: string; status: string }>) => 
      websocketService.onRegistrationUpdate(handler),
    onConnectionStatus: (handler: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void) =>
      websocketService.onConnectionStatus(handler),
    getStatus: () => websocketService.getStatus(),
  };
};

export default websocketService;
