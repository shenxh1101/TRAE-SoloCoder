export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  websocketPort: parseInt(process.env.WS_PORT || '8080', 10),
  
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  
  security: {
    bcryptSaltRounds: 12,
    maxRequestBodySize: '10mb',
    rateLimitWindowMs: 15 * 60 * 1000,
    rateLimitMaxRequests: 100,
  },
  
  upload: {
    maxSize: 50 * 1024 * 1024,
    allowedExtensions: ['.skp', '.obj', '.stl', '.cad'],
    destination: './api/data/uploads',
  },
  
  data: {
    reportsPath: './api/data/reports',
    uploadsPath: './api/data/uploads',
  },
}

export default config
