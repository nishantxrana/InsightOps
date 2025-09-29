import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { config } from 'dotenv';
import { logger } from './utils/logger.js';
import { configLoader } from './config/settings.js';
import { webhookRoutes } from './webhooks/routes.js';
import { apiRoutes } from './api/routes.js';
import { startPollingJobs, restartPollingJobs } from './polling/index.js';
import { errorHandler } from './utils/errorHandler.js';

// Load environment variables first
config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(cors({
  origin: (origin, callback) => callback(null, origin),
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Serve static files from frontend build
app.use(express.static(path.join(process.cwd(), '../frontend/dist')));

// API Routes
app.use('/api/webhooks', webhookRoutes);
app.use('/api', apiRoutes);

// Serve React app for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(process.cwd(), '../frontend/dist/index.html'));
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

// Error handling middleware
app.use(errorHandler);

// Initialize configuration system
async function initializeApp() {
  try {
    // Initialize configuration (loads runtime settings)
    await configLoader.initialize();
    
    // Add listener for configuration changes to restart polling jobs
    configLoader.onConfigChange((newConfig) => {
      logger.info('Configuration changed, restarting polling jobs');
      try {
        restartPollingJobs();
      } catch (error) {
        logger.error('Failed to restart polling jobs after config change:', error);
      }
    });
    
    logger.info('Configuration system initialized successfully');
    
    return true;
  } catch (error) {
    logger.error('Failed to initialize configuration:', error);
    throw error;
  }
}

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
async function startServer() {
  try {
    // Initialize configuration first
    await initializeApp();
    
    // Start the server
    app.listen(PORT, async () => {
      logger.info(`Azure DevOps Monitoring Agent Backend started on port ${PORT}`);
      
      try {
        // Validate configuration (but don't fail if Azure DevOps is not configured yet)
        let configValid = false;
        
        try {
          configValid = configLoader.validateEssential();
          if (configValid) {
            logger.info('Essential configuration validation passed');
          } else {
            logger.warn('Essential configuration incomplete - Azure DevOps settings required');
          }
        } catch (error) {
          logger.warn('Configuration validation failed (this is expected if not fully configured):', error.message);
        }
        
        // Start polling jobs if configuration is valid
        if (configValid) {
          try {
            await startPollingJobs();
            logger.info('Polling jobs started successfully');
          } catch (error) {
            logger.error('Failed to start polling jobs:', error);
          }
        } else {
          logger.info('Skipping polling jobs due to incomplete configuration. Configure via Settings page.');
        }
        
        logger.info('🚀 Azure DevOps Monitoring Agent is ready!');
        logger.info(`📊 Dashboard: http://localhost:${PORT}`);
        logger.info('⚙️  Configure via Settings page if needed');
        
      } catch (error) {
        logger.error('Error during startup:', error);
        if (process.env.NODE_ENV === 'production') {
          process.exit(1);
        }
      }
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
startServer().catch((error) => {
  logger.error('Failed to start application:', error);
  process.exit(1);
});

export default app;
