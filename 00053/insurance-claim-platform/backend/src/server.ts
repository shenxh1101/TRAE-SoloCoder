import express from 'express';
import cors from 'cors';
import { initDatabase } from './db/init';
import authRoutes from './routes/authRoutes';
import policyRoutes from './routes/policyRoutes';
import claimRoutes from './routes/claimRoutes';
import assessmentRoutes from './routes/assessmentRoutes';
import warningRoutes from './routes/warningRoutes';
import uploadRoutes from './routes/uploadRoutes';
import reportRoutes from './routes/reportRoutes';
import efficiencyRoutes from './routes/efficiencyRoutes';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

initDatabase();

app.use('/api/auth', authRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/assessment', assessmentRoutes);
app.use('/api/warnings', warningRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/efficiency', efficiencyRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Insurance Claim Platform API is running',
    timestamp: new Date().toISOString()
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

export default app;
