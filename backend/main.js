import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
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

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected');
});

const app = express();
const PORT = env.PORT;

// Trust proxy for deployed environments (Azure App Service, etc.)
app.set('trust proxy', true);

// Request ID middleware (must be early in the chain)
// app.use(requestIdMiddleware); // Temporarily disabled

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://www.clarity.ms"],
      imgSrc: ["'self'", "data:", "https:"],
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

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Auth routes (public)
app.use('/api/auth', authRoutes);

// API Routes (BEFORE static files)
app.use('/api/webhooks', webhookRoutes);
app.use('/api', apiRoutes);

// Serve static files from public folder
app.use(express.static(path.join(process.cwd(), 'public')));

// Serve React app for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(process.cwd(), 'public/index.html'));
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

// Error handling middleware
app.use(errorHandler);

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
    // Connect to database first
    await connectToDatabase();
    
    // Initialize user polling manager
    await userPollingManager.initializeAllUsers();
    logger.info('User polling manager initialized');
    
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
