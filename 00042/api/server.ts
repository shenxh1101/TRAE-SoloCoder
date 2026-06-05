import app from './app.js';
import { startBackgroundJobs, stopBackgroundJobs } from './background-jobs.js';

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
  startBackgroundJobs();
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  stopBackgroundJobs();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  stopBackgroundJobs();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
