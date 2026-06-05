const cron = require('node-cron');
const OperationReport = require('../models/OperationReport');
const Reservation = require('../models/Reservation');
const moment = require('moment');

const startScheduledTasks = (io) => {
  console.log('Starting scheduled tasks...');

  cron.schedule('0 0 * * *', async () => {
    console.log('Running daily report generation...');
    try {
      const yesterday = moment().subtract(1, 'day').toDate();
      await OperationReport.generateDailyReport(yesterday);
      console.log('Daily report generated successfully');
    } catch (error) {
      console.error('Error generating daily report:', error);
    }
  });

  cron.schedule('0 1 * * 1', async () => {
    console.log('Running weekly report generation...');
    try {
      const yesterday = moment().subtract(1, 'day').toDate();
      await OperationReport.generateWeeklyReport(yesterday);
      console.log('Weekly report generated successfully');
    } catch (error) {
      console.error('Error generating weekly report:', error);
    }
  });

  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const expiredLocks = await Reservation.find({
        status: 'locked',
        lockExpiresAt: { $lt: now }
      });

      for (const reservation of expiredLocks) {
        reservation.status = 'cancelled';
        reservation.cancellationReason = '锁定超时未确认';
        await reservation.save();

        const ParkingSpace = require('../models/ParkingSpace');
        const space = await ParkingSpace.findById(reservation.spaceId);
        if (space && space.currentReservation?.toString() === reservation._id.toString()) {
          space.status = 'available';
          space.currentReservation = undefined;
          await space.save();
        }
      }
    } catch (error) {
      console.error('Error processing expired locks:', error);
    }
  });

  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();
      const upcomingReservations = await Reservation.find({
        status: 'confirmed',
        startTime: {
          $gte: now,
          $lte: moment(now).add(1, 'hour').toDate()
        }
      }).populate('spaceId');

      const Notification = require('../models/Notification');
      for (const reservation of upcomingReservations) {
        await Notification.createAndPush({
          userId: reservation.userId,
          type: 'reservation',
          title: '预约即将开始',
          message: `您的车位预约即将开始！车位：${reservation.spaceId?.spaceNumber}，请按时入场。`,
          data: { reservationId: reservation._id, startTime: reservation.startTime }
        }, io);
      }
    } catch (error) {
      console.error('Error sending reservation reminders:', error);
    }
  });

  console.log('Scheduled tasks started');
};

module.exports = { startScheduledTasks };
