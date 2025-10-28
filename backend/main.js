import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import path from 'path';
import mongoose from 'mongoose';
import { logger } from './utils/logger.js';
import { webhookRoutes } from './webhooks/routes.js';
import { apiRoutes } from './api/routes.js';
import { authRoutes } from './routes/auth.js';
import { errorHandler } from './utils/errorHandler.js';
import { userPollingManager } from './polling/userPollingManager.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { env, database, security, rateLimits, isProduction, isStaging } from './config/env.js';

// Connect to MongoDB with better error handling
async function connectToDatabase() {
  try {
    await mongoose.connect(database.uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: database.maxPoolSize,
      minPoolSize: database.minPoolSize,
      connectTimeoutMS: database.connectionTimeout,
      retryWrites: true,
      w: 'majority'
    });
    logger.info('Connected to MongoDB successfully');
  } catch (err) {
    logger.error('MongoDB connection error:', err);
    throw err;
  }
}

// Handle MongoDB connection events (only once)
if (mongoose.connection.listenerCount('error') === 0) {
  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error:', err);
  });
}

if (mongoose.connection.listenerCount('disconnected') === 0) {
  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });
}

if (mongoose.connection.listenerCount('reconnected') === 0) {
  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });
}

const app = express();
const PORT = env.PORT;

// Trust proxy for deployed environments (Azure App Service, etc.)
app.set('trust proxy', true);

// Request ID middleware (must be early in the chain)
app.use(requestIdMiddleware);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://www.clarity.ms"],
      imgSrc: ["'self'", "data:", "https:"],
      mediaSrc: ["'self'", "https://insightopssa.blob.core.windows.net"],
      connectSrc: ["'self'", "https://dev.azure.com", "https://api.openai.com", "https://api.groq.com", "https://generativelanguage.googleapis.com", "https://www.clarity.ms"],
      fontSrc: ["'self'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin requests (when frontend is served by backend)
    if (!origin) {
      return callback(null, true);
    }
    
    const allowedOrigins = (isProduction() || isStaging())
      ? (env.ALLOWED_ORIGINS || env.FRONTEND_URL || '').split(',').filter(Boolean)
      : ['http://localhost:3001', 'https://sure-ant-informally.ngrok-free.app'];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  maxAge: 600
}));

// Compression middleware (gzip/deflate)
app.use(compression({
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Compress everything else
    return compression.filter(req, res);
  },
  level: 6, // Compression level (1-9, 6 is good balance)
  threshold: 1024 // Only compress files larger than 1KB
}));

// Rate limiting with proper trust proxy configuration
const limiter = rateLimit({
  windowMs: rateLimits.windowMs,
  max: rateLimits.max,
  message: { error: 'Too many requests from this IP, please try again later.' },
  trustProxy: 1,
  keyGenerator: (req) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    return ip.split(':')[0];
  },
  skip: (req) => req.path === '/api/health',
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware (skip static assets)
app.use((req, res, next) => {
  // Skip logging for static assets to prevent errors
  if (!req.path.startsWith('/assets/') && !req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    logger.info(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  }
  next();
});

// Auth routes (public)
app.use('/api/auth', authRoutes);

// API Routes (BEFORE static files)
app.use('/api/webhooks', webhookRoutes);
app.use('/api', apiRoutes);

// Serve static files from public folder with caching
app.use(express.static(path.join(process.cwd(), 'public'), {
  maxAge: '1y', // Cache for 1 year
  etag: true,   // Enable ETag
  lastModified: true,
  setHeaders: (res, path) => {
    // Different caching for different file types
    if (path.endsWith('.html')) {
      // HTML files: short cache (5 minutes)
      res.setHeader('Cache-Control', 'public, max-age=300');
    } else if (path.match(/\.(js|css)$/)) {
      // JS/CSS files: 30 days cache (more conservative)
      res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    } else if (path.match(/\.(png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      // Images/fonts: medium cache (1 month)
      res.setHeader('Cache-Control', 'public, max-age=2592000');
    }
  }
}));

// Serve React app for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    // Set cache headers for HTML
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
    res.setHeader('ETag', 'W/"html-' + Date.now() + '"');
    res.sendFile(path.join(process.cwd(), 'public/index.html'));
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, shutting down gracefully`);
  
  try {
    // Stop all polling jobs
    if (userPollingManager) {
      logger.info('Stopping all polling jobs...');
      // Add cleanup method to polling manager
    }
    
    // Close database connection
    if (mongoose.connection.readyState === 1) {
      logger.info('Closing database connection...');
      await mongoose.connection.close();
    }
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
async function startServer() {
  try {
    // Connect to database first
    await connectToDatabase();
    
    // Initialize user polling manager from database
    await userPollingManager.initializeFromDatabase();
    logger.info('User polling manager initialized from database');
    
    const server = app.listen(PORT, () => {
      logger.info(`Azure DevOps Monitoring Agent Backend started on port ${PORT}`);
      logger.info('🚀 Azure DevOps Monitoring Agent is ready!');
      logger.info(`📊 Dashboard: http://localhost:${PORT}`);
      logger.info('⚙️  Configure via Settings page after login');
    });
    
    server.on('error', (error) => {
      logger.error('Server error:', error);
      process.exit(1);
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
