import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || 'default-secret-key',
  jwtExpiresIn: '24h',
  maxMakeupAttempts: parseInt(process.env.MAX_MAKEUP_ATTEMPTS || '2', 10),
  stdDeviationThreshold: parseFloat(process.env.STD_DEVIATION_THRESHOLD || '2'),
  environment: process.env.NODE_ENV || 'development',
} as const;
