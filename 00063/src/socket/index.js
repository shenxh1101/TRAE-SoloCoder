const jwt = require('jsonwebtoken');

const setupSocketIO = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);
    
    socket.join(`user:${socket.userId}`);

    socket.on('join-admin', () => {
      socket.join('admins');
    });

    socket.on('parking-status-request', async () => {
      const ParkingSpace = require('../models/ParkingSpace');
      const stats = await ParkingSpace.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);
      socket.emit('parking-status-update', stats);
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });

  console.log('Socket.IO setup complete');
};

const broadcastParkingUpdate = (io, space) => {
  io.emit('space-status-changed', {
    spaceId: space._id,
    spaceNumber: space.spaceNumber,
    status: space.status,
    zone: space.zone
  });
};

module.exports = { setupSocketIO, broadcastParkingUpdate };
