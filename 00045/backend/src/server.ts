import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import routes from './routes';
import { initWebSocket } from './services/websocket';
import { initCronJobs } from './services/cron';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Library API Server is running' });
});

initWebSocket(httpServer);

initCronJobs();

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API endpoint: http://localhost:${PORT}/api`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}`);
});
