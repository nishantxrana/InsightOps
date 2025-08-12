import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import { logger } from './utils/logger.js';
import { configLoader } from './config/settings.js';
import { webhookRoutes } from './webhooks/index.js';
import { apiRoutes } from './api/routes.js';
import { startPollingJobs } from './polling/index.js';
import { errorHandler } from './utils/errorHandler.js';

// Load environment variables first
config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
// app.use(helmet());
// app.use(cors({
//   origin: process.env.FRONTEND_URL || 'http://localhost:5173',
//   credentials: true
// }));

app.use(cors({
  origin: (origin, callback) => callback(null, origin),
  credentials: true
}));


// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
// app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// middle ware that i will insert in b/w the routes for loggin even the request is comming on route or not
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
})

// API routes
app.use('/api/webhooks',  webhookRoutes);
app.use('/api', apiRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, async () => {
  logger.info(`Azure DevOps Monitoring Agent Backend started on port ${PORT}`);
  
  try {
    // Validate configuration (but don't fail if Azure DevOps is not configured yet)
    let configValid = false;
    try {
      await configLoader.validate();
      logger.info('Configuration validated successfully');
      configValid = true;
    } catch (configError) {
      logger.warn('Configuration validation failed (this is expected for initial setup):', configError.message);
    }
    
    // Start polling jobs only if configuration is valid
    if (configValid && process.env.AZURE_DEVOPS_ORG && process.env.AZURE_DEVOPS_PROJECT && process.env.AZURE_DEVOPS_PAT) {
      startPollingJobs();
      logger.info('Polling jobs started');
    } else {
      logger.info('Polling jobs not started - Azure DevOps configuration incomplete or invalid');
    }
    
  } catch (error) {
    logger.error('Failed to initialize application:', error);
    // Don't exit in development mode to allow configuration
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
});

export default app;
