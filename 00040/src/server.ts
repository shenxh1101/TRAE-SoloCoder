import { createServer } from 'http';
import app from './app';
import { config } from './config';
import { initWebSocket } from './lib/websocket';
import prisma from './lib/prisma';

async function main() {
  try {
    await prisma.$connect();
    console.log('[DB] Connected to database');

    const server = createServer(app);

    initWebSocket(server);

    server.listen(config.port, () => {
      console.log(`[Server] Running on http://localhost:${config.port}`);
      console.log(`[Server] API docs: http://localhost:${config.port}/api/docs`);
      console.log(`[Server] WebSocket enabled for real-time notifications`);
    });
  } catch (error) {
    console.error('[Error] Failed to start server:', error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[Fatal]', err);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  console.log('[Shutdown] Received SIGTERM');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Shutdown] Received SIGINT');
  await prisma.$disconnect();
  process.exit(0);
});
