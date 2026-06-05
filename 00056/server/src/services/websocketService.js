const { WebSocketServer: WS } = require('ws');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const HEARTBEAT_INTERVAL = 30000;
const HEARTBEAT_TIMEOUT = 30000;

class WebSocketManager {
  constructor() {
    this.wss = null;
    this.clients = new Map();
  }

  attach(server) {
    this.wss = new WS({ server, path: '/ws' });

    this.wss.on('connection', (ws, req) => {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get('token');

      let userId = null;
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          userId = decoded.id || decoded.userId;
        } catch {
          ws.close(4001, '认证失败');
          return;
        }
      }

      const client = {
        ws,
        userId,
        channels: new Set(),
        isAlive: true,
        connectedAt: Date.now()
      };
      this.clients.set(ws, client);

      ws.on('pong', () => {
        client.isAlive = true;
      });

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw);
          this._handleMessage(client, msg);
        } catch {}
      });

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      ws.on('error', () => {
        this.clients.delete(ws);
      });
    });

    this._startHeartbeat();
  }

  _handleMessage(client, msg) {
    switch (msg.type) {
      case 'subscribe':
        if (msg.channel) client.channels.add(msg.channel);
        break;
      case 'unsubscribe':
        if (msg.channel) client.channels.delete(msg.channel);
        break;
    }
  }

  _startHeartbeat() {
    setInterval(() => {
      this.wss?.clients?.forEach((ws) => {
        const client = this.clients.get(ws);
        if (!client) return;

        if (!client.isAlive) {
          ws.terminate();
          this.clients.delete(ws);
          return;
        }
        client.isAlive = false;
        ws.ping();
      });
    }, HEARTBEAT_INTERVAL);
  }

  sendToUser(userId, type, data) {
    const message = JSON.stringify({ type, data, timestamp: Date.now() });
    this.clients.forEach((client, ws) => {
      if (client.userId === userId && ws.readyState === 1) {
        ws.send(message);
      }
    });
  }

  broadcast(channel, type, data) {
    const message = JSON.stringify({ type, channel, data, timestamp: Date.now() });
    this.clients.forEach((client, ws) => {
      if (client.channels.has(channel) && ws.readyState === 1) {
        ws.send(message);
      }
    });
  }

  getOnlineCount() {
    return this.clients.size;
  }
}

const instance = new WebSocketManager();

module.exports = instance;
