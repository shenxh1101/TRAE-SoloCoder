const { io } = require('socket.io-client');

const TOKEN = process.argv[2] || '';

if (!TOKEN) {
  console.log('Usage: node test_ws.js <jwt_token>');
  process.exit(1);
}

console.log('Connecting to WebSocket server...');

const socket = io('http://localhost:3000', {
  auth: { token: TOKEN },
  transports: ['websocket'],
});

let receivedCount = 0;

socket.on('connect', () => {
  console.log('✅ WebSocket Connected!');
  console.log(`   Socket ID: ${socket.id}`);
  console.log('   Rooms joined: user-specific and role-specific');
  console.log('   Waiting for real-time notifications...');
});

socket.on('notification', (data) => {
  receivedCount++;
  console.log(`\n📩 Notification received:`);
  console.log(`   Type: ${data.type}`);
  console.log(`   Title: ${data.title}`);
  console.log(`   Content: ${data.content}`);
  console.log(`   Related ID: ${data.relatedId || 'N/A'}`);
});

socket.on('connect_error', (err) => {
  console.log('❌ WebSocket Connection Error:', err.message);
  process.exit(1);
});

socket.on('disconnect', (reason) => {
  console.log('WebSocket Disconnected:', reason);
});

setTimeout(() => {
  console.log(`\n📊 WebSocket Test Summary:`);
  console.log(`   Notifications received: ${receivedCount}`);
  console.log(`   Connection stable: ${socket.connected ? 'Yes' : 'No'}`);
  socket.disconnect();
  process.exit(0);
}, 8000);
