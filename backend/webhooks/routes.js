import express from 'express';
import { logger } from '../utils/logger.js';
import { configLoader } from '../config/settings.js';
import { workItemWebhook } from './workItemWebhook.js';
import { buildWebhook } from './buildWebhook.js';
import { pullRequestWebhook } from './pullRequestWebhook.js';
import { releaseWebhook } from './releaseWebhook.js';
import { validateWebhookSignature } from '../utils/webhookValidator.js';
import { metrics } from '../observability/metrics.js';

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

// Middleware to log all webhook events and record metrics
const logWebhookEvent = (req, res, next) => {
  const eventType = req.body?.eventType || 'unknown';
  const resourceType = req.body?.resource?.resourceType || 'unknown';
  const organizationId = req.params?.organizationId || null;
  
  logger.info('Webhook event received', {
    eventType,
    resourceType,
    subscriptionId: req.body?.subscriptionId,
    organizationId,
    ip: req.ip
  });
  
  // Track response status for metrics
  res.on('finish', () => {
    const status = res.statusCode >= 200 && res.statusCode < 400 ? 'processed' : 'rejected';
    metrics.recordWebhook(organizationId, eventType, status);
  });
  
  next();
};

// Apply middleware to all webhook routes
// router.use(webhookAuth);
router.use(logWebhookEvent);

// ============================================================
// LEGACY USER-BASED WEBHOOKS - REMOVED (SECURITY RISK)
// ============================================================
// User-based webhook routes have been removed as they bypass
// organization isolation. All webhooks MUST use organization
// context: /org/:organizationId/...
// ============================================================

const rejectLegacyUserWebhook = (req, res) => {
  logger.error('REJECTED: Legacy user-based webhook called', {
    path: req.path,
    userId: req.params.userId,
    ip: req.ip,
    action: 'webhook-rejected',
    reason: 'user-based-webhooks-removed'
  });
  res.status(410).json({
    error: 'User-based webhooks are no longer supported',
    message: 'Please update your webhook URLs to use organization-based endpoints: /api/webhooks/org/{organizationId}/...',
    code: 'LEGACY_WEBHOOK_REMOVED'
  });
};

// Reject all legacy user-specific webhook routes with clear error
router.post('/:userId/workitem/created', rejectLegacyUserWebhook);
router.post('/:userId/workitem/updated', rejectLegacyUserWebhook);
router.post('/:userId/build/completed', rejectLegacyUserWebhook);
router.post('/:userId/pullrequest/created', rejectLegacyUserWebhook);
router.post('/:userId/release/deployment', rejectLegacyUserWebhook);

// ============================================================
// ORGANIZATION-BASED WEBHOOK ROUTES (REQUIRED)
// ============================================================
// Organization-specific webhook routes (multi-tenant)
router.post('/org/:organizationId/workitem/created', (req, res) => {
  logger.info('Org workitem/created route hit', { organizationId: req.params.organizationId });
  workItemWebhook.handleCreated(req, res, null, req.params.organizationId);
});

router.post('/org/:organizationId/workitem/updated', (req, res) => {
  logger.info('Org workitem/updated route hit', { organizationId: req.params.organizationId });
  workItemWebhook.handleUpdated(req, res, null, req.params.organizationId);
});

router.post('/org/:organizationId/build/completed', (req, res) => {
  logger.info('Org build/completed route hit', { organizationId: req.params.organizationId });
  buildWebhook.handleCompleted(req, res, null, req.params.organizationId);
});

router.post('/org/:organizationId/pullrequest/created', (req, res) => {
  logger.info('Org pullrequest/created route hit', { organizationId: req.params.organizationId });
  pullRequestWebhook.handleCreated(req, res, null, req.params.organizationId);
});

router.post('/org/:organizationId/release/deployment', (req, res) => {
  logger.info('Org release/deployment route hit', { organizationId: req.params.organizationId });
  releaseWebhook.handleDeploymentCompleted(req, res, null, req.params.organizationId);
});

// ============================================================
// LEGACY GLOBAL WEBHOOKS - REMOVED (NO ORG CONTEXT)
// ============================================================
const rejectLegacyGlobalWebhook = (req, res) => {
  logger.error('REJECTED: Legacy global webhook called (no org context)', {
    path: req.path,
    ip: req.ip,
    action: 'webhook-rejected',
    reason: 'global-webhooks-removed'
  });
  res.status(410).json({
    error: 'Global webhooks are no longer supported',
    message: 'Please update your webhook URLs to use organization-based endpoints: /api/webhooks/org/{organizationId}/...',
    code: 'LEGACY_WEBHOOK_REMOVED'
  });
};

router.post('/workitem/created', rejectLegacyGlobalWebhook);
router.post('/workitem/updated', rejectLegacyGlobalWebhook);
router.post('/build/completed', rejectLegacyGlobalWebhook);
router.post('/pullrequest/created', rejectLegacyGlobalWebhook);

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
