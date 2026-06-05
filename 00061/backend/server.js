const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./database');
const { experimentTablesRouter } = require('./routes/experimentTables');
const { reagentsRouter } = require('./routes/reagents');
const { instrumentsRouter } = require('./routes/instruments');
const { schedulesRouter } = require('./routes/schedules');
const { wasteRouter } = require('./routes/waste');
const { accessRouter } = require('./routes/access');
const { exportRouter } = require('./routes/export');
const { alertsRouter } = require('./routes/alerts');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

initDB();

app.use('/api/experiment-tables', experimentTablesRouter);
app.use('/api/reagents', reagentsRouter);
app.use('/api/instruments', instrumentsRouter);
app.use('/api/schedules', schedulesRouter);
app.use('/api/waste', wasteRouter);
app.use('/api/access', accessRouter);
app.use('/api/export', exportRouter);
app.use('/api/alerts', alertsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '实验室管理系统API运行正常' });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log(`📊 API文档: http://localhost:${PORT}/api/health`);
});
