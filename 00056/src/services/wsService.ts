import Taro from '@tarojs/taro';
import { WS_CONFIG, isDev } from '@/config/env';
import { getToken } from '@/utils/request';

// WebSocket连接状态
export type WSStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

// WebSocket消息类型
export interface WSMessage<T = any> {
  type: string;
  data: T;
  timestamp: number;
  messageId?: string;
}

// 消息处理器类型
export type MessageHandler<T = any> = (message: WSMessage<T>) => void;

// 连接配置
interface ConnectionConfig {
  url?: string;
  heartbeatInterval?: number;
  reconnectInterval?: number;
  maxReconnectTimes?: number;
}

class WebSocketService {
  private socketTask: Taro.SocketTask | null = null;
  private status: WSStatus = 'disconnected';
  private url: string = WS_CONFIG.url;
  private heartbeatInterval: number = WS_CONFIG.heartbeatInterval;
  private reconnectInterval: number = WS_CONFIG.reconnectInterval;
  private maxReconnectTimes: number = WS_CONFIG.maxReconnectTimes;

  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimes: number = 0;

  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private globalHandlers: Set<MessageHandler> = new Set();

  private statusChangeHandlers: Set<(status: WSStatus) => void> = new Set();

  constructor() {
    this.init();
  }

  private init(): void {
    // 监听App前后台切换
    if (typeof Taro.onAppShow === 'function') {
      Taro.onAppShow(() => {
        if (this.status === 'disconnected') {
          this.connect();
        }
      });
    }
  }

  // 设置连接配置
  setConfig(config: ConnectionConfig): void {
    if (config.url) this.url = config.url;
    if (config.heartbeatInterval) this.heartbeatInterval = config.heartbeatInterval;
    if (config.reconnectInterval) this.reconnectInterval = config.reconnectInterval;
    if (config.maxReconnectTimes) this.maxReconnectTimes = config.maxReconnectTimes;
  }

  // 连接WebSocket
  async connect(): Promise<void> {
    if (this.status === 'connected' || this.status === 'connecting') {
      return;
    }

    const token = getToken();
    if (!token) {
      console.warn('[WebSocket] 用户未登录，暂不连接');
      return;
    }

    this.updateStatus('connecting');

    try {
      const wsUrl = `${this.url}?token=${encodeURIComponent(token)}`;

      if (isDev) {
        console.log('[WebSocket] 正在连接:', wsUrl);
      }

      this.socketTask = Taro.connectSocket({
        url: wsUrl,
        header: {
          'Authorization': `Bearer ${token}`,
          'X-Client': 'mini-app',
          'X-Version': '1.0.0'
        },
        success: () => {
          if (isDev) {
            console.log('[WebSocket] 连接请求已发送');
          }
        },
        fail: (error) => {
          console.error('[WebSocket] 连接失败:', error);
          this.handleConnectError();
        }
      });

      this.setupEventListeners();

    } catch (error) {
      console.error('[WebSocket] 创建连接异常:', error);
      this.handleConnectError();
    }
  }

  private setupEventListeners(): void {
    if (!this.socketTask) return;

    this.socketTask.onOpen(() => {
      if (isDev) {
        console.log('[WebSocket] 连接成功');
      }
      this.updateStatus('connected');
      this.reconnectTimes = 0;
      this.startHeartbeat();
    });

    this.socketTask.onMessage((res) => {
      this.handleMessage(res.data);
    });

    this.socketTask.onClose((res) => {
      if (isDev) {
        console.log('[WebSocket] 连接关闭:', res.code, res.reason);
      }
      this.updateStatus('disconnected');
      this.stopHeartbeat();
      this.tryReconnect();
    });

    this.socketTask.onError((error) => {
      console.error('[WebSocket] 连接错误:', error);
      this.handleConnectError();
    });
  }

  private handleMessage(data: string | ArrayBuffer): void {
    try {
      let message: WSMessage;

      if (typeof data === 'string') {
        message = JSON.parse(data);
      } else {
        message = {
          type: 'binary',
          data: data,
          timestamp: Date.now()
        };
      }

      if (isDev) {
        console.log('[WebSocket] 收到消息:', message);
      }

      // 处理心跳响应
      if (message.type === 'pong') {
        return;
      }

      // 全局处理器
      this.globalHandlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error('[WebSocket] 全局处理器错误:', error);
        }
      });

      // 类型指定处理器
      const handlers = this.messageHandlers.get(message.type);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(message);
          } catch (error) {
            console.error(`[WebSocket] 消息处理器错误 [${message.type}]:`, error);
          }
        });
      }

    } catch (error) {
      console.error('[WebSocket] 解析消息失败:', error, data);
    }
  }

  // 发送消息
  send<T = any>(type: string, data?: T): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socketTask || this.status !== 'connected') {
        reject(new Error('WebSocket未连接'));
        return;
      }

      const message: WSMessage<T> = {
        type,
        data: data as T,
        timestamp: Date.now(),
        messageId: this.generateMessageId()
      };

      const messageStr = JSON.stringify(message);

      this.socketTask.send({
        data: messageStr,
        success: () => {
          if (isDev) {
            console.log('[WebSocket] 发送消息:', message);
          }
          resolve();
        },
        fail: (error) => {
          console.error('[WebSocket] 发送消息失败:', error);
          reject(error);
        }
      });
    });
  }

  // 订阅特定类型消息
  subscribe<T = any>(type: string, handler: MessageHandler<T>): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);

    // 返回取消订阅函数
    return () => {
      this.unsubscribe(type, handler);
    };
  }

  // 取消订阅
  unsubscribe<T = any>(type: string, handler?: MessageHandler<T>): void {
    if (!handler) {
      this.messageHandlers.delete(type);
      return;
    }

    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.messageHandlers.delete(type);
      }
    }
  }

  // 订阅所有消息
  subscribeAll<T = any>(handler: MessageHandler<T>): () => void {
    this.globalHandlers.add(handler);
    return () => {
      this.globalHandlers.delete(handler);
    };
  }

  // 监听状态变化
  onStatusChange(handler: (status: WSStatus) => void): () => void {
    this.statusChangeHandlers.add(handler);
    return () => {
      this.statusChangeHandlers.delete(handler);
    };
  }

  private updateStatus(status: WSStatus): void {
    this.status = status;
    this.statusChangeHandlers.forEach(handler => {
      try {
        handler(status);
      } catch (error) {
        console.error('[WebSocket] 状态变化处理器错误:', error);
      }
    });
  }

  // 心跳机制
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.status === 'connected') {
        this.send('ping').catch(error => {
          console.error('[WebSocket] 发送心跳失败:', error);
        });
      }
    }, this.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // 重连机制
  private handleConnectError(): void {
    this.updateStatus('disconnected');
    this.stopHeartbeat();
    this.tryReconnect();
  }

  private tryReconnect(): void {
    if (this.reconnectTimes >= this.maxReconnectTimes) {
      console.error('[WebSocket] 达到最大重连次数，停止重连');
      this.updateStatus('disconnected');
      return;
    }

    if (this.status === 'reconnecting') {
      return;
    }

    this.reconnectTimes++;
    this.updateStatus('reconnecting');

    const delay = Math.min(
      this.reconnectInterval * Math.pow(1.5, this.reconnectTimes - 1),
      60000 // 最大延迟60秒
    );

    if (isDev) {
      console.log(`[WebSocket] ${delay}ms 后进行第 ${this.reconnectTimes} 次重连`);
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      if (getToken()) {
        this.connect();
      } else {
        this.updateStatus('disconnected');
      }
    }, delay);
  }

  // 断开连接
  disconnect(code: number = 1000, reason: string = 'normal closure'): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.reconnectTimes = this.maxReconnectTimes; // 防止自动重连

    if (this.socketTask) {
      this.socketTask.close({
        code,
        reason,
        success: () => {
          if (isDev) {
            console.log('[WebSocket] 主动断开连接');
          }
        },
        fail: (error) => {
          console.error('[WebSocket] 断开连接失败:', error);
        }
      });
    }

    this.updateStatus('disconnected');
    this.stopHeartbeat();
  }

  // 手动重连
  reconnect(): void {
    this.reconnectTimes = 0;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.connect();
  }

  // 获取当前状态
  getStatus(): WSStatus {
    return this.status;
  }

  // 生成消息ID
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 清理资源
  destroy(): void {
    this.disconnect();
    this.messageHandlers.clear();
    this.globalHandlers.clear();
    this.statusChangeHandlers.clear();
  }
}

export const wsService = new WebSocketService();
export default wsService;
