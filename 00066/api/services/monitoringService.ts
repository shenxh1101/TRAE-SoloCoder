import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { RealtimeMetrics } from '../../src/types/index';

interface ClientConnection {
  ws: WebSocket;
  taskId: string;
  lastHeartbeat: number;
  connectedAt: string;
}

interface MetricsMessage {
  type: 'metrics_update';
  taskId: string;
  data: RealtimeMetrics;
  timestamp: string;
}

interface SystemMessage {
  type: 'system';
  action: 'subscribed' | 'unsubscribed' | 'error' | 'pong';
  message?: string;
  taskId?: string;
}

const HEARTBEAT_INTERVAL = 30000;
const BROADCAST_INTERVAL = 2000;

class MonitoringService {
  private wss: WebSocketServer | null = null;
  private clients: Map<WebSocket, ClientConnection> = new Map();
  private taskSubscriptions: Map<string, Set<WebSocket>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private broadcastInterval: NodeJS.Timeout | null = null;
  private metricsCache: Map<string, RealtimeMetrics> = new Map();

  initialize(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws/monitoring' });

    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientId = this.generateClientId();
      console.log(`[MonitoringService] Client connected: ${clientId}`);

      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(ws, message);
        } catch (error) {
          this.sendSystemMessage(ws, 'error', 'Invalid message format');
        }
      });

      ws.on('close', () => {
        this.handleClientDisconnect(ws);
        console.log(`[MonitoringService] Client disconnected: ${clientId}`);
      });

      ws.on('error', (error) => {
        console.error(`[MonitoringService] WebSocket error for client ${clientId}:`, error);
        this.handleClientDisconnect(ws);
      });

      ws.on('pong', () => {
        const client = this.clients.get(ws);
        if (client) {
          client.lastHeartbeat = Date.now();
        }
      });
    });

    this.startHeartbeatCheck();
    this.startBroadcastLoop();

    console.log('[MonitoringService] WebSocket server initialized on /ws/monitoring');
  }

  subscribe(taskId: string, ws: WebSocket): boolean {
    if (!this.taskSubscriptions.has(taskId)) {
      this.taskSubscriptions.set(taskId, new Set());
    }

    const subscribers = this.taskSubscriptions.get(taskId)!;
    
    if (subscribers.has(ws)) {
      return false;
    }

    subscribers.add(ws);
    this.clients.set(ws, {
      ws,
      taskId,
      lastHeartbeat: Date.now(),
      connectedAt: new Date().toISOString(),
    });

    this.sendSystemMessage(ws, 'subscribed', `Subscribed to task: ${taskId}`, taskId);
    console.log(`[MonitoringService] Client subscribed to task: ${taskId}`);
    return true;
  }

  unsubscribe(taskId: string, ws: WebSocket): boolean {
    const subscribers = this.taskSubscriptions.get(taskId);
    
    if (!subscribers || !subscribers.has(ws)) {
      return false;
    }

    subscribers.delete(ws);
    this.clients.delete(ws);

    if (subscribers.size === 0) {
      this.taskSubscriptions.delete(taskId);
    }

    this.sendSystemMessage(ws, 'unsubscribed', `Unsubscribed from task: ${taskId}`, taskId);
    console.log(`[MonitoringService] Client unsubscribed from task: ${taskId}`);
    return true;
  }

  broadcastMetrics(taskId: string, metrics: RealtimeMetrics): void {
    this.metricsCache.set(taskId, metrics);

    const subscribers = this.taskSubscriptions.get(taskId);
    if (!subscribers || subscribers.size === 0) {
      return;
    }

    const message: MetricsMessage = {
      type: 'metrics_update',
      taskId,
      data: metrics,
      timestamp: new Date().toISOString(),
    };

    const messageStr = JSON.stringify(message);
    const disconnectedClients: WebSocket[] = [];

    subscribers.forEach((clientWs) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        try {
          clientWs.send(messageStr);
        } catch (error) {
          console.error(`[MonitoringService] Failed to send metrics to client:`, error);
          disconnectedClients.push(clientWs);
        }
      } else {
        disconnectedClients.push(clientWs);
      }
    });

    disconnectedClients.forEach((clientWs) => {
      this.handleClientDisconnect(clientWs);
    });
  }

  getSubscribersCount(taskId: string): number {
    const subscribers = this.taskSubscriptions.get(taskId);
    return subscribers ? subscribers.size : 0;
  }

  getTotalConnections(): number {
    return this.clients.size;
  }

  getActiveTaskIds(): string[] {
    return Array.from(this.taskSubscriptions.keys());
  }

  getCachedMetrics(taskId: string): RealtimeMetrics | null {
    return this.metricsCache.get(taskId) || null;
  }

  updateMetricsCache(taskId: string, metrics: Partial<RealtimeMetrics>): void {
    const existing = this.metricsCache.get(taskId);
    if (existing) {
      Object.assign(existing, metrics);
    } else {
      this.metricsCache.set(taskId, metrics as RealtimeMetrics);
    }
  }

  private handleClientMessage(ws: WebSocket, message: Record<string, unknown>): void {
    const { action, taskId } = message;

    switch (action) {
      case 'subscribe':
        if (typeof taskId === 'string') {
          this.subscribe(taskId, ws);
        } else {
          this.sendSystemMessage(ws, 'error', 'taskId is required for subscription');
        }
        break;

      case 'unsubscribe':
        if (typeof taskId === 'string') {
          this.unsubscribe(taskId, ws);
        } else {
          this.sendSystemMessage(ws, 'error', 'taskId is required for unsubscription');
        }
        break;

      case 'ping':
        this.sendSystemMessage(ws, 'pong');
        break;

      default:
        this.sendSystemMessage(ws, 'error', `Unknown action: ${action}`);
    }
  }

  private handleClientDisconnect(ws: WebSocket): void {
    const client = this.clients.get(ws);
    if (client) {
      const { taskId } = client;
      const subscribers = this.taskSubscriptions.get(taskId);
      
      if (subscribers) {
        subscribers.delete(ws);
        if (subscribers.size === 0) {
          this.taskSubscriptions.delete(taskId);
        }
      }
      
      this.clients.delete(ws);
    }
  }

  private sendSystemMessage(
    ws: WebSocket,
    action: SystemMessage['action'],
    message?: string,
    taskId?: string,
  ): void {
    if (ws.readyState === WebSocket.OPEN) {
      const systemMessage: SystemMessage = {
        type: 'system',
        action,
        message,
        taskId,
      };
      
      try {
        ws.send(JSON.stringify(systemMessage));
      } catch (error) {
        console.error('[MonitoringService] Failed to send system message:', error);
      }
    }
  }

  private startHeartbeatCheck(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const staleClients: WebSocket[] = [];

      this.clients.forEach((client, ws) => {
        if (now - client.lastHeartbeat > HEARTBEAT_INTERVAL) {
          try {
            ws.ping();
          } catch (error) {
            staleClients.push(ws);
          }
          
          if (now - client.lastHeartbeat > HEARTBEAT_INTERVAL * 2) {
            staleClients.push(ws);
          }
        }
      });

      staleClients.forEach((ws) => {
        console.log('[MonitoringService] Closing stale connection');
        ws.terminate();
        this.handleClientDisconnect(ws);
      });
    }, HEARTBEAT_INTERVAL);
  }

  private startBroadcastLoop(): void {
    this.broadcastInterval = setInterval(() => {
      this.metricsCache.forEach((metrics, taskId) => {
        this.broadcastMetrics(taskId, metrics);
      });
    }, BROADCAST_INTERVAL);
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }

    this.clients.forEach((client) => {
      try {
        client.ws.close(1001, 'Server shutting down');
      } catch (error) {
        // Ignore close errors
      }
    });

    this.clients.clear();
    this.taskSubscriptions.clear();
    this.metricsCache.clear();

    if (this.wss) {
      this.wss.close(() => {
        console.log('[MonitoringService] WebSocket server closed');
      });
      this.wss = null;
    }
  }
}

export const monitoringService = new MonitoringService();

export { MonitoringService };
export type { ClientConnection, MetricsMessage, SystemMessage };
