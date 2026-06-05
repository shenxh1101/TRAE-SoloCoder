import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { initDatabase } from './db.js';
import { setupWebSocket } from './websocket.js';
import departmentRoutes from './routes/departments.js';
import doctorRoutes from './routes/doctors.js';
import scheduleRoutes from './routes/schedules.js';
import registrationRoutes from './routes/registrations.js';
import alertRoutes from './routes/alerts.js';
import reportRoutes from './routes/reports.js';
import messageRoutes from './routes/messages.js';

const PORT = 3001;

const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

initDatabase();
console.log('[DB] Database initialized');

app.use('/api', departmentRoutes);
app.use('/api', doctorRoutes);
app.use('/api', scheduleRoutes);
app.use('/api', registrationRoutes);
app.use('/api', alertRoutes);
app.use('/api', reportRoutes);
app.use('/api', messageRoutes);

app.get('/api/health', (req, res) => {
  res.json({ code: 200, message: 'success', data: { status: 'ok', timestamp: new Date().toISOString() } });
});

app.use((err, req, res, _next) => {
  console.error('[Error]', err.message);
  res.status(500).json({ code: 500, message: err.message, data: null });
});

const server = createServer(app);

setupWebSocket(server);
console.log('[WS] WebSocket server initialized');

server.listen(PORT, () => {
  console.log(`[Server] Hospital Dashboard API running on http://localhost:${PORT}`);
  console.log(`[Server] WebSocket available at ws://localhost:${PORT}/ws`);
  console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
});
