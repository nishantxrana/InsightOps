import express from 'express';
import { logger } from '../utils/logger.js';
import { configLoader } from '../config/settings.js';
import { workItemWebhook } from './workItemWebhook.js';
import { buildWebhook } from './buildWebhook.js';
import { pullRequestWebhook } from './pullRequestWebhook.js';
import { releaseWebhook } from './releaseWebhook.js';
import { validateWebhookSignature } from '../utils/webhookValidator.js';

const router = express.Router();

// Middleware to validate webhook signature (if configured)
const webhookAuth = (req, res, next) => {
  const webhookSecret = configLoader.getSecurityConfig().webhookSecret;
  
  if (webhookSecret) {
    const isValid = validateWebhookSignature(req, webhookSecret);
    if (!isValid) {
      logger.warn('Invalid webhook signature', {
        ip: req.ip,
        userInsightOps: req.get('User-InsightOps')
      });
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }
  
  next();
};

// Middleware to log all webhook events
const logWebhookEvent = (req, res, next) => {
  const eventType = req.body?.eventType || 'unknown';
  const resourceType = req.body?.resource?.resourceType || 'unknown';
  
  logger.info('Webhook event received', {
    eventType,
    resourceType,
    subscriptionId: req.body?.subscriptionId,
    ip: req.ip
  });
  
  next();
};

// Apply middleware to all webhook routes
// router.use(webhookAuth);
router.use(logWebhookEvent);

// User-specific webhook routes
router.post('/:userId/workitem/created', (req, res) => {
  logger.info('User-specific workitem/created route hit', { userId: req.params.userId, userIdType: typeof req.params.userId });
  workItemWebhook.handleCreated(req, res, req.params.userId);
});

router.post('/:userId/workitem/updated', (req, res) => {
  logger.info('User-specific workitem/updated route hit', { userId: req.params.userId, userIdType: typeof req.params.userId });
  workItemWebhook.handleUpdated(req, res, req.params.userId);
});

router.post('/:userId/build/completed', (req, res) => {
  logger.info('User-specific build/completed route hit', { userId: req.params.userId, userIdType: typeof req.params.userId });
  buildWebhook.handleCompleted(req, res, req.params.userId);
});

router.post('/:userId/pullrequest/created', (req, res) => {
  logger.info('User-specific pullrequest/created route hit', { userId: req.params.userId, userIdType: typeof req.params.userId });
  pullRequestWebhook.handleCreated(req, res, req.params.userId);
});

router.post('/:userId/release/deployment', (req, res) => {
  logger.info('User-specific release/deployment route hit', { userId: req.params.userId, userIdType: typeof req.params.userId });
  releaseWebhook.handleDeploymentCompleted(req, res, req.params.userId);
});

// Legacy global webhooks (for backward compatibility)
router.post('/workitem/created', (req, res) => {
  logger.info('Legacy workitem/created route hit');
  workItemWebhook.handleCreated(req, res);
});

router.post('/workitem/updated', (req, res) => {
  logger.info('Legacy workitem/updated route hit');
  workItemWebhook.handleUpdated(req, res);
});

router.post('/build/completed', (req, res) => {
  logger.info('Legacy build/completed route hit');
  buildWebhook.handleCompleted(req, res);
});

router.post('/pullrequest/created', (req, res) => {
  logger.info('Legacy pullrequest/created route hit');
  pullRequestWebhook.handleCreated(req, res);
});

// Generic webhook endpoint for testing
router.post('/test', (req, res) => {
  logger.info('Test webhook received', {
    body: req.body,
    headers: req.headers
  });
  
  res.json({
    message: 'Test webhook received successfully',
    timestamp: new Date().toISOString(),
    eventType: req.body?.eventType || 'test'
  });
});

// Health check for webhooks
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'webhooks',
    timestamp: new Date().toISOString()
  });
});

export { router as webhookRoutes };
