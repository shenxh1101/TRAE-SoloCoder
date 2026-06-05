import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

router.post('/messages/send-notification', (req, res) => {
  try {
    const db = getDb();
    const { alertId, recipients, channels } = req.body;

    if (!alertId || !recipients || !channels) {
      return res.status(400).json({ code: 400, message: 'Missing required fields: alertId, recipients, channels', data: null });
    }

    const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(alertId);
    if (!alert) {
      return res.status(404).json({ code: 404, message: 'Alert not found', data: null });
    }

    const insertStmt = db.prepare(`
      INSERT INTO messages (alertId, recipient, channel, content, sentAt, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const channelNames = { sms: 'SMS', email: 'Email', app: 'App Push' };
    const sentAt = new Date().toISOString();
    let sentCount = 0;

    const insertMany = db.transaction(() => {
      for (const recipient of recipients) {
        for (const channel of channels) {
          const content = `[${channelNames[channel] || channel}] ${alert.message} - ${recipient}`;
          const status = Math.random() > 0.1 ? 'sent' : 'failed';
          insertStmt.run(alertId, recipient, channel, content, sentAt, status);
          if (status === 'sent') sentCount++;
        }
      }
    });

    insertMany();

    res.json({
      code: 200,
      message: 'success',
      data: { success: true, sentCount },
    });
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message, data: null });
  }
});

router.get('/messages/history', (req, res) => {
  try {
    const db = getDb();
    const { page = '1', pageSize = '20' } = req.query;

    const p = parseInt(page);
    const ps = parseInt(pageSize);
    const offset = (p - 1) * ps;

    const { total } = db.prepare('SELECT COUNT(*) as total FROM messages').get();
    const messages = db.prepare(`
      SELECT * FROM messages ORDER BY sentAt DESC LIMIT ? OFFSET ?
    `).all(ps, offset);

    res.json({
      code: 200,
      message: 'success',
      data: { data: messages, total },
    });
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message, data: null });
  }
});

export default router;
