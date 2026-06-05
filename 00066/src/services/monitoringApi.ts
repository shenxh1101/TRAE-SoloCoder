import { get } from './api';
import type {
  RealtimeMetrics
} from '../types';
import type { ApiResponse } from './api';

interface WebSocketConfig {
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

interface WebSocketConnection {
  ws: WebSocket;
  taskId: string;
  heartbeatTimer?: ReturnType<typeof setInterval>;
  reconnectAttempts: number;
  isManualClose: boolean;
}

const defaultConfig: Required<WebSocketConfig> = {
  reconnectInterval: 5000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000,
};

const activeConnections = new Map<string, WebSocketConnection>();

function getWebSocketUrl(taskId: string): string {
  const token = localStorage.getItem('token');
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  
  let url = `${protocol}//localhost:8080?taskId=${taskId}`;
  
  if (token) {
    url += `&token=${token}`;
  }

  return url;
}

function startHeartbeat(connection: WebSocketConnection): void {
  stopHeartbeat(connection);

  connection.heartbeatTimer = setInterval(() => {
    if (connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(JSON.stringify({ type: 'ping' }));
      
      if (import.meta.env.DEV) {
        console.log(`[WS Heartbeat] Sent to task ${connection.taskId}`);
      }
    }
  }, defaultConfig.heartbeatInterval);
}

function stopHeartbeat(connection: WebSocketConnection): void {
  if (connection.heartbeatTimer) {
    clearInterval(connection.heartbeatTimer);
    connection.heartbeatTimer = undefined;
  }
}

function handleReconnect(
  taskId: string,
  onMessage: (data: unknown) => void,
  config?: WebSocketConfig
): void {
  const connection = activeConnections.get(taskId);
  if (!connection || connection.isManualClose) return;

  const mergedConfig = { ...defaultConfig, ...config };

  if (connection.reconnectAttempts >= mergedConfig.maxReconnectAttempts) {
    if (import.meta.env.DEV) {
      console.error(`[WS] Max reconnection attempts reached for task ${taskId}`);
    }
    activeConnections.delete(taskId);
    return;
  }

  connection.reconnectAttempts++;

  if (import.meta.env.DEV) {
    console.log(
      `[WS] Reconnecting to task ${taskId} (attempt ${connection.reconnectAttempts}/${mergedConfig.maxReconnectAttempts})`
    );
  }

  setTimeout(() => {
    monitoringApi.connectWebSocket(taskId, onMessage, config);
  }, mergedConfig.reconnectInterval * connection.reconnectAttempts);
}

export const monitoringApi = {
  connectWebSocket(
    taskId: string,
    onMessage: (data: unknown) => void,
    config?: WebSocketConfig
  ): WebSocket {
    const existingConnection = activeConnections.get(taskId);
    
    if (existingConnection && existingConnection.ws.readyState === WebSocket.OPEN) {
      if (import.meta.env.DEV) {
        console.log(`[WS] Using existing connection for task ${taskId}`);
      }
      return existingConnection.ws;
    }

    const url = getWebSocketUrl(taskId);
    const ws = new WebSocket(url);

    const connection: WebSocketConnection = {
      ws,
      taskId,
      reconnectAttempts: existingConnection?.reconnectAttempts || 0,
      isManualClose: false,
    };

    activeConnections.set(taskId, connection);

    ws.onopen = () => {
      if (import.meta.env.DEV) {
        console.log(`[WS] Connected to task ${taskId}`);
      }
      
      connection.reconnectAttempts = 0;
      startHeartbeat(connection);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'pong') {
          if (import.meta.env.DEV) {
            console.log(`[WS Heartbeat] Received pong from task ${taskId}`);
          }
          return;
        }
        
        onMessage(data);
      } catch (error) {
        console.error('[WS] Failed to parse message:', error);
        onMessage(event.data);
      }
    };

    ws.onerror = (error) => {
      console.error(`[WS] Error on task ${taskId}:`, error);
    };

    ws.onclose = () => {
      if (import.meta.env.DEV) {
        console.log(`[WS] Disconnected from task ${taskId}`);
      }
      
      stopHeartbeat(connection);
      
      if (!connection.isManualClose) {
        handleReconnect(taskId, onMessage, config);
      } else {
        activeConnections.delete(taskId);
      }
    };

    return ws;
  },

  disconnectWebSocket(taskId: string): void {
    const connection = activeConnections.get(taskId);
    
    if (connection) {
      connection.isManualClose = true;
      stopHeartbeat(connection);
      
      if (connection.ws.readyState === WebSocket.OPEN || 
          connection.ws.readyState === WebSocket.CONNECTING) {
        connection.ws.close(1000, 'Manual disconnect');
      }
      
      activeConnections.delete(taskId);
      
      if (import.meta.env.DEV) {
        console.log(`[WS] Manually disconnected from task ${taskId}`);
      }
    }
  },

  async getRealtimeMetrics(
    taskId: string
  ): Promise<ApiResponse<RealtimeMetrics>> {
    return get<RealtimeMetrics>(`/monitoring/${taskId}/metrics`);
  },

  isConnected(taskId: string): boolean {
    const connection = activeConnections.get(taskId);
    return !!connection && connection.ws.readyState === WebSocket.OPEN;
  },

  getActiveConnections(): string[] {
    return Array.from(activeConnections.keys());
  }
};

export default monitoringApi;
