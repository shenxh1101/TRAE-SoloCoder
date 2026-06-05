import { io } from 'socket.io-client';

const TOKEN = process.argv[2] || '';

if (!TOKEN) {
  console.log('Usage: npx ts-node test_ws.ts <jwt_token>');
  process.exit(1);
}

const socket = io('http://localhost:3000', {
  auth: { token: TOKEN },
  transports: ['websocket'],
});

let receivedCount = 0;

socket.on('connect', () => {
  console.log('✅ WebSocket Connected!');
  console.log(`   Socket ID: ${socket.id}`);
  console.log('   Waiting for notifications...');

  setTimeout(() => {
    console.log(`\n📊 Test Summary:`);
    console.log(`   Notifications received during test: ${receivedCount}`);
    console.log(`   Connection status: ${socket.connected ? 'Connected' : 'Disconnected'}`);
    socket.disconnect();
    process.exit(0);
  }, 5000);
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
