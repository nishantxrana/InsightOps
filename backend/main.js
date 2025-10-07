import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import mongoose from 'mongoose';
import { config } from 'dotenv';
import { logger } from './utils/logger.js';
import { webhookRoutes } from './webhooks/routes.js';
import { apiRoutes } from './api/routes.js';
import { authRoutes } from './routes/auth.js';
import { errorHandler } from './utils/errorHandler.js';
import { userPollingManager } from './polling/userPollingManager.js';

// Load environment variables first
config();

// Connect to MongoDB with better error handling
async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
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
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased for development)
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
