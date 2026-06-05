import cron from 'node-cron';
import db from '../config/db.js';
import { generateId } from '../utils/helpers.js';

export const startReminderJob = () => {
  console.log('启动24小时更新提醒任务...');

  cron.schedule('0 * * * *', async () => {
    console.log('检查24小时未更新的订单...');

    try {
      const inProgressBookings = db.prepare(`
        SELECT * FROM bookings
        WHERE status IN ('confirmed', 'in_progress', 'in-progress')
      `).all();

      for (const booking of inProgressBookings) {
        const latestUpdate = db.prepare(`
          SELECT createdAt FROM booking_updates
          WHERE bookingId = ?
          ORDER BY createdAt DESC
          LIMIT 1
        `).get(booking.id);

        let hoursSinceUpdate;
        if (latestUpdate) {
          hoursSinceUpdate = (new Date() - new Date(latestUpdate.createdAt)) / (1000 * 60 * 60);
        } else {
          hoursSinceUpdate = (new Date() - new Date(booking.createdAt)) / (1000 * 60 * 60);
        }

        if (hoursSinceUpdate >= 24) {
          const existingReminder = db.prepare(`
            SELECT * FROM reminders
            WHERE bookingId = ? AND isRead = 0 AND type = ?
          `).get(booking.id, '24h_update');

          if (!existingReminder) {
            const id = generateId();
            db.prepare(`
              INSERT INTO reminders (id, bookingId, type, message)
              VALUES (?, ?, ?, ?)
            `).run(
              id,
              booking.id,
              '24h_update',
              `订单 ${booking.id} 已超过24小时未更新宠物状态`
            );
            console.log(`创建提醒: 订单 ${booking.id} 已超过24小时未更新`);
          }
        }
      }
    } catch (error) {
      console.error('提醒任务执行失败:', error);
    }
  });

  console.log('24小时更新提醒任务已启动，每小时检查一次');
};
