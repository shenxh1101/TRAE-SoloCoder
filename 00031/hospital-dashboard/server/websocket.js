import { WebSocketServer } from 'ws';
import { getDb } from './db.js';

const clients = new Set();
let wss = null;
let alertCheckInterval = null;

export function setupWebSocket(server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log(`[WS] Client connected. Total: ${clients.size}`);

    sendInitialData(ws);

    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('close', () => {
      clients.delete(ws);
      console.log(`[WS] Client disconnected. Total: ${clients.size}`);
    });

    ws.on('error', (err) => {
      console.error('[WS] Error:', err.message);
      clients.delete(ws);
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        handleMessage(ws, msg);
      } catch (e) {
        console.error('[WS] Invalid message:', e.message);
      }
    });
  });

  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) {
        clients.delete(ws);
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(heartbeat);
    if (alertCheckInterval) clearInterval(alertCheckInterval);
  });

  startAlertCheck();
  return wss;
}

function sendInitialData(ws) {
  try {
    const db = getDb();

    const unresolvedAlerts = db.prepare(`
      SELECT * FROM alerts WHERE resolved = 0 ORDER BY timestamp DESC LIMIT 10
    `).all();

    const alerts = unresolvedAlerts.map(a => ({
      ...a,
      resolved: !!a.resolved,
      notifiedTo: JSON.parse(a.notifiedTo || '[]'),
    }));

    sendMessage(ws, { type: 'initial', data: { alerts } });

    const today = new Date().toISOString().split('T')[0];
    const waitingRecords = db.prepare(`
      SELECT * FROM waiting_records WHERE DATE(timestamp) = ? ORDER BY timestamp DESC
    `).all(today);

    sendMessage(ws, { type: 'waiting_record', data: waitingRecords });
  } catch (e) {
    console.error('[WS] Error sending initial data:', e.message);
  }
}

function handleMessage(ws, msg) {
  switch (msg.type) {
    case 'ping':
      sendMessage(ws, { type: 'pong' });
      break;
    case 'subscribe':
      ws.subscriptions = msg.channels || [];
      break;
    default:
      console.log('[WS] Unknown message type:', msg.type);
  }
}

function startAlertCheck() {
  alertCheckInterval = setInterval(() => {
    try {
      const db = getDb();

      const recentAlerts = db.prepare(`
        SELECT * FROM alerts
        WHERE resolved = 0 AND timestamp > datetime('now', '-2 minutes')
        ORDER BY timestamp DESC
      `).all();

      for (const alert of recentAlerts) {
        broadcastAlert({
          ...alert,
          resolved: !!alert.resolved,
          notifiedTo: JSON.parse(alert.notifiedTo || '[]'),
        });
      }
    } catch (e) {
      console.error('[WS] Alert check error:', e.message);
    }
  }, 60000);
}

function sendMessage(ws, data) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(data));
  }
}

export function broadcastAlert(alert) {
  broadcast({ type: 'alert', data: alert });
}

export function broadcastWaitingUpdate(record) {
  broadcast({ type: 'waiting_record', data: record });
}

export function broadcastRegistrationUpdate(registration) {
  broadcast({ type: 'registration_update', data: registration });
}

export function broadcastScheduleUpdate(schedule) {
  broadcast({ type: 'schedule_update', data: schedule });
}

function broadcast(message) {
  if (!wss) return;
  const data = JSON.stringify(message);
  let count = 0;
  wss.clients.forEach((ws) => {
    if (ws.readyState === 1) {
      ws.send(data);
      count++;
    }
  });
  if (count > 0) {
    console.log(`[WS] Broadcast to ${count} clients, type: ${message.type}`);
  }
}

export function getConnectedClientsCount() {
  return clients.size;
}
