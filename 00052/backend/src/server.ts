import 'reflect-metadata';
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import WebSocket from 'ws';
import http from 'http';
import { AppDataSource } from './config/database';
import { PORT, WS_PORT } from './config';
import { createSeedData } from './utils/seedData';
import { TemperatureSensor } from './services/TemperatureSensor';
import { TaskScheduler } from './services/TaskScheduler';

import authRouter from './routes/auth';
import bloodBagsRouter from './routes/bloodBags';
import transfusionRequestsRouter from './routes/transfusionRequests';
import approvalsRouter from './routes/approvals';
import transportRouter from './routes/transport';
import nurseRouter from './routes/nurse';
import alertsRouter from './routes/alerts';
import reportsRouter from './routes/reports';
import robotsRouter from './routes/robots';

const app: Express = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/blood-bags', bloodBagsRouter);
app.use('/api/transfusion-requests', transfusionRequestsRouter);
app.use('/api/approvals', approvalsRouter);
app.use('/api/transport', transportRouter);
app.use('/api/nurse', nurseRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/robots', robotsRouter);

app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'ok',
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: AppDataSource.isInitialized ? 'connected' : 'disconnected',
    }
  });
});

const wss = new WebSocket.Server({ port: WS_PORT });

const HEARTBEAT_INTERVAL = 30000;
const clients = new Map<WebSocket, boolean>();

wss.on('connection', (ws: WebSocket) => {
  console.log('WebSocket客户端已连接');
  clients.set(ws, true);

  ws.on('message', (data: WebSocket.Data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('收到WebSocket消息:', message.type);

      switch (message.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;
        case 'temperature':
        case 'notification':
        case 'task_update':
        case 'alert':
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                ...message,
                timestamp: Date.now(),
              }));
            }
          });
          break;
        default:
          console.log('未知消息类型:', message.type);
      }
    } catch (error) {
      console.error('解析WebSocket消息失败:', error);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket客户端已断开');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket错误:', error);
    clients.delete(ws);
  });

  ws.send(JSON.stringify({
    type: 'connected',
    data: {
      message: 'WebSocket连接成功',
      timestamp: Date.now(),
    },
  }));
});

const heartbeatTimer = setInterval(() => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.ping();
    }
  });
}, HEARTBEAT_INTERVAL);

wss.on('close', () => {
  clearInterval(heartbeatTimer);
});

let temperatureSensor: TemperatureSensor | null = null;
let taskScheduler: TaskScheduler | null = null;

async function startServer() {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('数据库连接成功');
    }

    console.log('正在初始化种子数据...');
    const seedDataSource = new (require('typeorm').DataSource)(require('./config/database').dbConfig);
    try {
      await seedDataSource.initialize();
      const queryRunner = seedDataSource.createQueryRunner();
      const hasData = await queryRunner.query('SELECT COUNT(*) as count FROM user');
      if (hasData[0].count === 0) {
        await seedDataSource.destroy();
        await createSeedData();
      } else {
        console.log('数据库已有数据，跳过种子数据初始化');
        await seedDataSource.destroy();
      }
    } catch (seedError) {
      console.log('种子数据检查/初始化失败:', (seedError as Error).message);
    }

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    temperatureSensor = new TemperatureSensor(AppDataSource, wss);
    temperatureSensor.start();

    taskScheduler = new TaskScheduler(AppDataSource, wss);
    taskScheduler.start();

    server.listen(PORT, () => {
      console.log(`Express服务器已启动，端口: ${PORT}`);
      console.log(`WebSocket服务器已启动，端口: ${WS_PORT}`);
      console.log(`API健康检查: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string) {
  console.log(`收到${signal}信号，正在优雅关闭...`);

  if (temperatureSensor) {
    temperatureSensor.stop();
  }

  if (taskScheduler) {
    taskScheduler.stop();
  }

  wss.clients.forEach((client) => {
    client.close();
  });

  wss.close(() => {
    console.log('WebSocket服务器已关闭');
  });

  server.close(() => {
    console.log('Express服务器已关闭');

    if (AppDataSource.isInitialized) {
      AppDataSource.destroy()
        .then(() => {
          console.log('数据库连接已关闭');
          process.exit(0);
        })
        .catch((error) => {
          console.error('关闭数据库连接失败:', error);
          process.exit(1);
        });
    } else {
      process.exit(0);
    }
  });

  setTimeout(() => {
    console.error('强制关闭超时');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
});

startServer();

export { app, server, wss };
